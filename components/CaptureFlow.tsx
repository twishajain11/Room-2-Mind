"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { sampleRoomAudio, type SampleHandle } from "@/lib/audio/record";
import { SAMPLE_SECONDS } from "@/lib/audio/spectral";
import type { AudioFeatures } from "@/lib/audio/types";
import { discardMedia, toWorkingPixels, WORKING_EDGE } from "@/lib/vision/capture";
import { detect, loadDetector } from "@/lib/vision/detector";
import { extractVisionFeatures } from "@/lib/vision/extract";
import type { Detection, VisionFeatures } from "@/lib/vision/types";
import { newSnapshotId, saveSnapshot } from "@/lib/snapshotStore";

type Stage = "idle" | "camera" | "working" | "sound" | "listening";

interface VisionResult {
  features: VisionFeatures;
  detections: Detection[];
  frame: { width: number; height: number };
  elapsedMs: number;
}

export default function CaptureFlow() {
  const router = useRouter();

  const [stage, setStage] = useState<Stage>("idle");
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [vision, setVision] = useState<VisionResult | null>(null);
  const [progress, setProgress] = useState({ fraction: 0, rms: 0 });
  const [modelReady, setModelReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const sampleRef = useRef<SampleHandle | null>(null);

  const releaseEverything = useCallback(() => {
    discardMedia({ stream: streamRef.current, objectUrl: objectUrlRef.current });
    streamRef.current = null;
    objectUrlRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // Nothing raw is allowed to outlive the page.
  useEffect(
    () => () => {
      releaseEverything();
      sampleRef.current?.cancel();
    },
    [releaseEverything]
  );

  /**
   * Start fetching the detector the moment this page opens.
   *
   * The weights are a ~30 second download on a cold cache, and the user spends
   * that long choosing a photo or framing a shot anyway. Waiting until they
   * press Capture spends their attention on a wait that could have happened
   * while they were busy.
   */
  useEffect(() => {
    let alive = true;
    loadDetector()
      .then(() => alive && setModelReady(true))
      .catch(() => {
        // Not fatal: the capture path awaits the same promise and surfaces the
        // real error there.
      });
    return () => {
      alive = false;
    };
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setStage("camera");
      // The video element only exists once the camera stage has rendered.
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch {
      setError(
        "The camera could not be opened. You can still load a photo from this device instead."
      );
    }
  }, []);

  const runExtraction = useCallback(
    async (source: HTMLVideoElement | HTMLImageElement) => {
      const startedAt = performance.now();
      setStage("working");
      setError(null);

      try {
        setStatus("Reducing the frame to " + WORKING_EDGE + "px on its longest edge");
        const px = toWorkingPixels(source);

        setStatus("Detecting objects");
        const detections = await detect(px);

        setStatus("Computing features");
        const features = extractVisionFeatures(px, detections);

        // Features exist, so the pixels have no reason to.
        releaseEverything();

        setVision({
          features,
          detections,
          frame: { width: px.width, height: px.height },
          elapsedMs: performance.now() - startedAt,
        });
        setStage("sound");
      } catch (e) {
        releaseEverything();
        setStage("idle");
        setError(e instanceof Error ? e.message : "Something went wrong reading that frame.");
      } finally {
        setStatus("");
      }
    },
    [releaseEverything]
  );

  const onFile = useCallback(
    (file: File) => {
      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
      const img = new Image();
      img.onload = () => void runExtraction(img);
      img.onerror = () => {
        releaseEverything();
        setError("That file could not be read as an image.");
      };
      img.src = url;
    },
    [releaseEverything, runExtraction]
  );

  /** Write the snapshot for this tab and hand off to the result page. */
  const finish = useCallback(
    (audio: AudioFeatures | null) => {
      if (!vision) return;
      const id = newSnapshotId();
      saveSnapshot({
        id,
        createdAt: new Date().toISOString(),
        vision: vision.features,
        audio,
        detections: vision.detections,
        frame: vision.frame,
        elapsedMs: vision.elapsedMs,
      });
      router.push("/result/" + id);
    },
    [router, vision]
  );

  const listen = useCallback(async () => {
    setError(null);
    setProgress({ fraction: 0, rms: 0 });
    try {
      const handle = await sampleRoomAudio((p) => setProgress(p));
      sampleRef.current = handle;
      setStage("listening");
      const features = await handle.done;
      sampleRef.current = null;
      finish(features);
    } catch {
      setStage("sound");
      setError(
        "The microphone could not be opened. You can continue without sound, and acoustic load will be left out of the score rather than guessed at."
      );
    }
  }, [finish]);

  const reset = useCallback(() => {
    releaseEverything();
    sampleRef.current?.cancel();
    sampleRef.current = null;
    setVision(null);
    setStage("idle");
  }, [releaseEverything]);

  return (
    <div className="mt-10 space-y-10">
      <header className="max-w-reading space-y-3">
        <h1 className="text-2xl font-medium">Snapshot</h1>
        <p className="text-sm leading-relaxed text-muted">
          Point the camera at the space you work in, or load a photo of it. The frame is reduced to{" "}
          {WORKING_EDGE}px, read for features, and then dropped. No image data is sent anywhere, and
          the photo is never shown back to you because it no longer exists once the numbers do.
        </p>
        {stage === "idle" && (
          <p className="text-xs text-muted">
            {modelReady
              ? "Object model ready."
              : "Fetching the object model in the background, about 30 seconds on a first visit. You can pick a photo now; it will wait for the model rather than the other way round."}
          </p>
        )}
      </header>

      {error && (
        <p className="max-w-reading rounded-md border border-rule bg-card px-4 py-3 text-sm">
          {error}
        </p>
      )}

      {stage === "idle" && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={startCamera}
            className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90"
          >
            Use the camera
          </button>
          <label className="cursor-pointer rounded-md border border-rule px-5 py-2.5 text-sm font-medium transition-colors hover:border-ink">
            Load a photo
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      )}

      {stage === "camera" && (
        <div className="space-y-4">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full max-w-xl rounded-md border border-rule bg-card"
          />
          <div className="flex gap-3">
            <button
              onClick={() => videoRef.current && void runExtraction(videoRef.current)}
              className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90"
            >
              Capture
            </button>
            <button
              onClick={reset}
              className="rounded-md border border-rule px-5 py-2.5 text-sm font-medium transition-colors hover:border-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {stage === "working" && (
        <p className="text-sm text-muted">
          {status}
          <span className="animate-pulse">…</span>
        </p>
      )}

      {stage === "sound" && vision && (
        <div className="max-w-reading space-y-5">
          <div className="numeric border-b border-rule pb-4 text-sm text-muted">
            <span className="text-ink">{vision.frame.width}</span> ×{" "}
            <span className="text-ink">{vision.frame.height}</span> working frame,{" "}
            <span className="text-ink">{vision.detections.length}</span> raw detections, read in{" "}
            <span className="text-ink">{Math.round(vision.elapsedMs)}</span> ms
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-medium">Add the sound channel</h2>
            <p className="text-sm leading-relaxed text-muted">
              {SAMPLE_SECONDS} seconds of listening, reduced to five numbers as it goes. Nothing is
              recorded: there is no audio buffer to keep and no file to send. Skip it and acoustic
              load is left out of the score entirely rather than guessed at.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={listen}
              className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90"
            >
              Listen for {SAMPLE_SECONDS} seconds
            </button>
            <button
              onClick={() => finish(null)}
              className="rounded-md border border-rule px-5 py-2.5 text-sm font-medium transition-colors hover:border-ink"
            >
              Skip sound, see the score
            </button>
          </div>
        </div>
      )}

      {stage === "listening" && (
        <div className="max-w-reading space-y-4">
          <p className="text-sm text-muted">
            Listening. Carry on as normal, the point is what the room actually sounds like.
          </p>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-rule">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${Math.round(progress.fraction * 100)}%` }}
            />
          </div>

          <div className="numeric flex items-baseline justify-between text-xs text-muted">
            <span>
              {Math.round(progress.fraction * SAMPLE_SECONDS)} of {SAMPLE_SECONDS} seconds
            </span>
            <span>current loudness {progress.rms.toFixed(4)}</span>
          </div>

          <button
            onClick={() => sampleRef.current?.cancel()}
            className="text-xs text-muted underline underline-offset-4 hover:text-ink"
          >
            Stop early and score what was heard
          </button>
        </div>
      )}
    </div>
  );
}
