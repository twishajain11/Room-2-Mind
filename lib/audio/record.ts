import type { AudioFeatures, AudioFrame } from "./types";
import {
  FRAMES_PER_SECOND,
  SAMPLE_SECONDS,
  decibelsToMagnitudes,
  summarizeFrames,
  toFrame,
} from "./spectral";

/**
 * Browser-side sampler for the acoustic channel.
 *
 * The microphone stream is routed into an AnalyserNode and read every 100ms.
 * Nothing is recorded: there is no MediaRecorder, no buffer of samples, and no
 * way for this function to return audio even if something downstream asked for
 * it. Each reading is reduced to four numbers immediately and the analyser's
 * own scratch arrays are overwritten on the next tick.
 */

/** Analyser window. 2048 at 48kHz gives ~23Hz bins, fine enough for the two bands. */
export const FFT_SIZE = 2048;

export interface SampleProgress {
  /** 0 to 1 through the sample. */
  fraction: number;
  /** Instantaneous loudness, for a live meter. */
  rms: number;
}

export interface SampleHandle {
  /** Resolves with the feature vector once the full sample has been taken. */
  done: Promise<AudioFeatures>;
  /** Stop early. The promise resolves with whatever frames were collected. */
  cancel: () => void;
}

/**
 * Take one 20 second sample at 10 frames per second and reduce it to features.
 *
 * Throws if microphone permission is refused, which callers should treat as
 * "this snapshot has no audio" rather than as a failure: `hasAudio` is a column
 * for exactly this reason.
 */
export async function sampleRoomAudio(
  onProgress?: (p: SampleProgress) => void,
  seconds: number = SAMPLE_SECONDS
): Promise<SampleHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

  const AudioCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtor();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = FFT_SIZE;
  // No smoothing: intermittency is the signal, and smoothing is exactly the
  // operation that would erase it.
  analyser.smoothingTimeConstant = 0;
  source.connect(analyser);

  const binHz = ctx.sampleRate / analyser.fftSize;
  const timeDomain = new Float32Array(analyser.fftSize);
  const frequencyDb = new Float32Array(analyser.frequencyBinCount);

  const frames: AudioFrame[] = [];
  const targetFrames = Math.round(seconds * FRAMES_PER_SECOND);

  let timer: ReturnType<typeof setInterval> | null = null;
  let settle: (features: AudioFeatures) => void;
  const done = new Promise<AudioFeatures>((resolve) => {
    settle = resolve;
  });

  /** Tear down every object that could still be holding sound. */
  const teardown = () => {
    if (timer !== null) clearInterval(timer);
    timer = null;
    try {
      source.disconnect();
      analyser.disconnect();
    } catch {
      // Already disconnected; nothing to do.
    }
    stream.getTracks().forEach((t) => t.stop());
    void ctx.close();
    timeDomain.fill(0);
    frequencyDb.fill(0);
  };

  const finish = () => {
    teardown();
    settle(summarizeFrames(frames));
  };

  timer = setInterval(() => {
    analyser.getFloatTimeDomainData(timeDomain);
    analyser.getFloatFrequencyData(frequencyDb);

    const frame = toFrame(timeDomain, decibelsToMagnitudes(frequencyDb), binHz);
    frames.push(frame);
    onProgress?.({ fraction: Math.min(1, frames.length / targetFrames), rms: frame.rms });

    if (frames.length >= targetFrames) finish();
  }, 1000 / FRAMES_PER_SECOND);

  return { done, cancel: finish };
}
