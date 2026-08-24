import type { AudioFeatures, AudioFrame } from "./types";

/**
 * The spectral fallback path (§5.4).
 *
 * Built before YAMNet on purpose: the product has to work end to end with
 * heuristics alone, so the acoustic channel is never blocked on a model
 * download. Everything here is arithmetic over a magnitude spectrum, and every
 * function is pure so the whole path is testable without an AudioContext.
 */

/** Length of one sample, in seconds. */
export const SAMPLE_SECONDS = 20;

/** Frames taken per second, so a full sample is 200 frames. */
export const FRAMES_PER_SECOND = 10;

/** Crude speech presence band, in Hz. */
export const SPEECH_BAND: [number, number] = [300, 3400];

/** Traffic and machinery live below this, in Hz. */
export const LOW_FREQ_CUTOFF = 250;

/** Root mean square amplitude of a frame's time-domain samples. */
export function frameRms(samples: Float32Array | number[]): number {
  if (samples.length === 0) return 0;
  let acc = 0;
  for (let i = 0; i < samples.length; i++) acc += samples[i] * samples[i];
  return Math.sqrt(acc / samples.length);
}

/**
 * Spectral centroid in Hz: the energy-weighted mean frequency, which is what
 * people mean by the brightness of a sound.
 */
export function spectralCentroid(magnitudes: Float32Array | number[], binHz: number): number {
  let weighted = 0;
  let total = 0;
  for (let i = 0; i < magnitudes.length; i++) {
    const m = magnitudes[i];
    weighted += m * i * binHz;
    total += m;
  }
  return total === 0 ? 0 : weighted / total;
}

/** Share of total spectral energy falling between two frequencies, 0 to 1. */
export function bandEnergyRatio(
  magnitudes: Float32Array | number[],
  binHz: number,
  lowHz: number,
  highHz: number
): number {
  let band = 0;
  let total = 0;
  for (let i = 0; i < magnitudes.length; i++) {
    const hz = i * binHz;
    const m = magnitudes[i];
    total += m;
    if (hz >= lowHz && hz <= highHz) band += m;
  }
  return total === 0 ? 0 : band / total;
}

/** Convert one analyser reading into the four numbers a frame keeps. */
export function toFrame(
  timeDomain: Float32Array | number[],
  magnitudes: Float32Array | number[],
  binHz: number
): AudioFrame {
  return {
    rms: frameRms(timeDomain),
    centroid: spectralCentroid(magnitudes, binHz),
    speechRatio: bandEnergyRatio(magnitudes, binHz, SPEECH_BAND[0], SPEECH_BAND[1]),
    lowRatio: bandEnergyRatio(magnitudes, binHz, 0, LOW_FREQ_CUTOFF),
  };
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Reduce a sample's frames to the Section 5.4 feature vector.
 *
 * `rmsVariance` is the one to watch: it is the difference between a fan that
 * hums at a steady level and a corridor conversation that starts and stops, and
 * that difference is the product's central acoustic claim.
 */
export function summarizeFrames(frames: AudioFrame[]): AudioFeatures {
  const rms = frames.map((f) => f.rms);
  const rmsMean = mean(rms);

  return {
    rmsMean,
    rmsVariance: frames.length === 0 ? 0 : mean(rms.map((v) => (v - rmsMean) * (v - rmsMean))),
    spectralCentroidMean: mean(frames.map((f) => f.centroid)),
    speechBandRatio: mean(frames.map((f) => f.speechRatio)),
    lowFreqRatio: mean(frames.map((f) => f.lowRatio)),
    frameCount: frames.length,
  };
}

/** Decibel readings from `getFloatFrequencyData` converted to linear magnitudes. */
export function decibelsToMagnitudes(db: Float32Array | number[], floorDb = -100): Float32Array {
  const out = new Float32Array(db.length);
  for (let i = 0; i < db.length; i++) {
    // Readings at or below the analyser's floor carry no energy worth counting.
    out[i] = db[i] <= floorDb ? 0 : Math.pow(10, db[i] / 20);
  }
  return out;
}
