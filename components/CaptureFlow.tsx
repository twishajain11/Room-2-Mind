"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { discardMedia, toWorkingPixels, WORKING_EDGE } from "@/lib/vision/capture";
import { detect } from "@/lib/vision/detector";
import { extractVisionFeatures } from "@/lib/vision/extract";
import { DETECTION_CONFIDENCE_THRESHOLD } from "@/lib/vision/objects";
import type { Detection, VisionFeatures } from "@/lib/vision/types";
import FeatureTable from "./FeatureTable";

type Stage = "idle" | "camera" | "working" | "done";

interface Result {
  features: VisionFeatures;
  detections: Detection[];
  frame: { width: number; height: number };
  elapsedMs: number;
}

export default function CaptureFlow() {
  const [stage, setStage] = useState<Stage>("idle");
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const releaseEverything = useCallback(() => {
    discardMedia({ stream: streamRef.current, objectUrl: objectUrlRef.current });
    streamRef.current = null;
    objectUrlRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // Nothing raw is allowed to outlive the page.
  useEffect(() => releaseEverything, [releaseEverything]);

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

        setResult({
          features,
          detections,
          frame: { width: px.width, height: px.height },
          elapsedMs: performance.now() - startedAt,
        });
        setStage("done");
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

  const reset = useCallback(() => {
    releaseEverything();
    setResult(null);
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

      {stage === "done" && result && (
        <div className="space-y-10">
          <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-rule pb-4">
            <p className="text-sm text-muted">
              <span className="numeric text-ink">{result.frame.width}</span> ×{" "}
              <span className="numeric text-ink">{result.frame.height}</span> working frame,{" "}
              <span className="numeric text-ink">{result.detections.length}</span> raw detections,
              read in <span className="numeric text-ink">{Math.round(result.elapsedMs)}</span> ms
            </p>
            <button
              onClick={reset}
              className="rounded-md border border-rule px-4 py-2 text-sm transition-colors hover:border-ink"
            >
              New snapshot
            </button>
          </div>

          <FeatureTable features={result.features} />

          <DetectionList detections={result.detections} />

          <section className="space-y-3">
            <h3 className="text-xs uppercase tracking-[0.18em] text-muted">Raw feature vector</h3>
            <p className="max-w-reading text-xs text-muted">
              This is the whole of what a snapshot is: numbers and labels. There is no image field
              here because no image was kept.
            </p>
            <pre className="overflow-x-auto rounded-md border border-rule bg-card p-4 font-mono text-xs leading-relaxed">
              {JSON.stringify(result.features, null, 2)}
            </pre>
          </section>
        </div>
      )}
    </div>
  );
}

function DetectionList({ detections }: { detections: Detection[] }) {
  if (detections.length === 0) {
    return (
      <section className="space-y-2">
        <h3 className="text-xs uppercase tracking-[0.18em] text-muted">Detections</h3>
        <p className="text-sm text-muted">Nothing was detected in this frame.</p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h3 className="text-xs uppercase tracking-[0.18em] text-muted">Detections</h3>
      <p className="max-w-reading text-xs text-muted">
        Everything COCO-SSD returned. Rows below confidence{" "}
        {DETECTION_CONFIDENCE_THRESHOLD.toFixed(2)} are shown for transparency but take no part in
        any feature.
      </p>
      <ul className="divide-y divide-rule border-y border-rule">
        {[...detections]
          .sort((a, b) => b.score - a.score)
          .map((d, i) => (
            <li
              key={d.class + "-" + i}
              className={
                "flex items-baseline justify-between py-2 text-sm " +
                (d.score >= DETECTION_CONFIDENCE_THRESHOLD ? "" : "text-muted line-through")
              }
            >
              <span>{d.class}</span>
              <span className="numeric">{d.score.toFixed(3)}</span>
            </li>
          ))}
      </ul>
    </section>
  );
}
