"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { computeEli } from "@/lib/scoring/eli";
import { computeSubscores } from "@/lib/scoring/features";
import { STANDARD_WEIGHTS } from "@/lib/scoring/weights";
import { discardMedia, toWorkingPixels, WORKING_EDGE } from "@/lib/vision/capture";
import { detect, loadDetector } from "@/lib/vision/detector";
import { extractVisionFeatures } from "@/lib/vision/extract";
import type { VisionFeatures } from "@/lib/vision/types";
import { getHandle } from "@/lib/identity";

/**
 * The §7.2 collection instrument.
 *
 * Deliberately shorter than the product it feeds. This link goes to strangers
 * who owe the project nothing, so it asks for one photograph and five
 * questions, states the privacy position in one line, and never shows a score:
 * seeing a score first would colour the self report the regression depends on.
 */

type Stage = "intro" | "camera" | "working" | "questions" | "sending" | "thanks";

const SCALE = [1, 2, 3, 4, 5, 6, 7];

interface Answers {
  concentration: number | null;
  stress: number | null;
  energy: number | null;
  minutesInSpace: string;
  usualWorkspace: boolean | null;
}

const EMPTY: Answers = {
  concentration: null,
  stress: null,
  energy: null,
  minutesInSpace: "",
  usualWorkspace: null,
};

export default function CalibrateFlow() {
  const [stage, setStage] = useState<Stage>("intro");
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [features, setFeatures] = useState<VisionFeatures | null>(null);
  const [answers, setAnswers] = useState<Answers>(EMPTY);
  const [total, setTotal] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const release = useCallback(() => {
    discardMedia({ stream: streamRef.current, objectUrl: objectUrlRef.current });
    streamRef.current = null;
    objectUrlRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => release, [release]);

  // Fetch the model while the reader is still reading the intro.
  useEffect(() => {
    void loadDetector().catch(() => undefined);
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
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch {
      setError("The camera would not open. You can choose a photo from this device instead.");
    }
  }, []);

  const runExtraction = useCallback(
    async (source: HTMLVideoElement | HTMLImageElement) => {
      setStage("working");
      setError(null);
      try {
        setStatus("Reading the picture");
        const px = toWorkingPixels(source);
        const detections = await detect(px);
        const extracted = extractVisionFeatures(px, detections);
        release();
        setFeatures(extracted);
        setStage("questions");
      } catch (e) {
        release();
        setStage("intro");
        setError(e instanceof Error ? e.message : "That picture could not be read.");
      } finally {
        setStatus("");
      }
    },
    [release]
  );

  const onFile = useCallback(
    (file: File) => {
      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
      const img = new Image();
      img.onload = () => void runExtraction(img);
      img.onerror = () => {
        release();
        setError("That file could not be read as a picture.");
      };
      img.src = url;
    },
    [release, runExtraction]
  );

  const complete =
    answers.concentration !== null &&
    answers.stress !== null &&
    answers.energy !== null &&
    answers.usualWorkspace !== null &&
    answers.minutesInSpace.trim() !== "";

  const submit = useCallback(async () => {
    if (!features || !complete) return;
    setStage("sending");
    setError(null);

    try {
      const handle = getHandle();
      const subscores = computeSubscores(features, null);
      const { eli } = computeEli(subscores, STANDARD_WEIGHTS);

      const snapshotRes = await fetch("/api/snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle,
          mode: "standard",
          features,
          subscores,
          eli,
          hasAudio: false,
        }),
      });
      if (!snapshotRes.ok) throw new Error((await snapshotRes.json()).error ?? "snapshot failed");
      const { id: snapshotId } = await snapshotRes.json();

      const minutes = Math.max(0, Math.min(1440, Number(answers.minutesInSpace) || 0));
      const sessionRes = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle,
          snapshotId,
          concentration: answers.concentration,
          stress: answers.stress,
          energy: answers.energy,
          durationMin: 0,
          minutesInSpace: minutes,
          usualWorkspace: answers.usualWorkspace,
        }),
      });
      if (!sessionRes.ok) throw new Error((await sessionRes.json()).error ?? "response failed");
      const { totalResponses } = await sessionRes.json();

      setTotal(typeof totalResponses === "number" ? totalResponses : null);
      setStage("thanks");
    } catch (e) {
      setStage("questions");
      setError(
        e instanceof Error
          ? `That did not send: ${e.message}`
          : "That did not send. Please try once more."
      );
    }
  }, [answers, complete, features]);

  return (
    <div className="mt-8 space-y-8">
      {error && (
        <p className="rounded-md border border-rule bg-card px-4 py-3 text-sm">{error}</p>
      )}

      {stage === "intro" && (
        <div className="space-y-6">
          <div className="space-y-3">
            <h1 className="text-2xl font-medium">Help calibrate Room to Mind</h1>
            <p className="text-sm leading-relaxed text-muted">
              Take one picture of the space you are sitting in and answer five quick questions. It
              takes about a minute, and it is what teaches this tool what a room actually costs
              someone&rsquo;s attention.
            </p>
            <p className="text-sm leading-relaxed text-muted">
              The picture is read inside your browser and then discarded. It is never uploaded and
              never stored. What gets sent is a short list of numbers, like how bright the room is
              and how many objects were counted.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={startCamera}
              className="rounded-md bg-accent px-5 py-3 text-sm font-medium text-paper"
            >
              Take a picture
            </button>
            <label className="cursor-pointer rounded-md border border-rule px-5 py-3 text-sm font-medium">
              Choose a photo
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
        </div>
      )}

      {stage === "camera" && (
        <div className="space-y-4">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full rounded-md border border-rule bg-card"
          />
          <button
            onClick={() => videoRef.current && void runExtraction(videoRef.current)}
            className="w-full rounded-md bg-accent px-5 py-3 text-sm font-medium text-paper"
          >
            Capture
          </button>
        </div>
      )}

      {stage === "working" && (
        <p className="text-sm text-muted">
          {status || "Reading the picture"}
          <span className="animate-pulse">…</span>
        </p>
      )}

      {(stage === "questions" || stage === "sending") && (
        <div className="space-y-8">
          <p className="text-sm text-muted">
            The picture has been reduced to {WORKING_EDGE}px, read, and discarded. Five questions
            left.
          </p>

          <Scale
            n={1}
            label="Right now, how easily can you concentrate in this space?"
            low="Not at all"
            high="Very easily"
            value={answers.concentration}
            onChange={(v) => setAnswers((a) => ({ ...a, concentration: v }))}
          />
          <Scale
            n={2}
            label="Right now, how tense or stressed do you feel in this space?"
            low="Not at all"
            high="Very tense"
            value={answers.stress}
            onChange={(v) => setAnswers((a) => ({ ...a, stress: v }))}
          />
          <Scale
            n={3}
            label="Right now, how alert or energetic do you feel in this space?"
            low="Not at all"
            high="Very alert"
            value={answers.energy}
            onChange={(v) => setAnswers((a) => ({ ...a, energy: v }))}
          />

          <div className="space-y-2">
            <label htmlFor="minutes" className="block text-sm font-medium">
              <span className="mr-2 text-muted">4</span>
              How long have you been in this space today?
            </label>
            <div className="flex items-center gap-2">
              <input
                id="minutes"
                inputMode="numeric"
                value={answers.minutesInSpace}
                onChange={(e) =>
                  setAnswers((a) => ({
                    ...a,
                    minutesInSpace: e.target.value.replace(/[^0-9]/g, "").slice(0, 4),
                  }))
                }
                className="numeric w-28 rounded-md border border-rule bg-card px-3 py-2 text-sm"
                placeholder="0"
              />
              <span className="text-sm text-muted">minutes</span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">
              <span className="mr-2 text-muted">5</span>
              Is this where you usually do focused work?
            </p>
            <div className="flex gap-3">
              {[
                { label: "Yes", value: true },
                { label: "No", value: false },
              ].map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => setAnswers((a) => ({ ...a, usualWorkspace: opt.value }))}
                  className={
                    "rounded-md border px-6 py-2 text-sm transition-colors " +
                    (answers.usualWorkspace === opt.value
                      ? "border-accent bg-accent text-paper"
                      : "border-rule hover:border-ink")
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={submit}
            disabled={!complete || stage === "sending"}
            className="w-full rounded-md bg-accent px-5 py-3 text-sm font-medium text-paper disabled:opacity-40"
          >
            {stage === "sending" ? "Sending…" : "Send my answers"}
          </button>
        </div>
      )}

      {stage === "thanks" && (
        <div className="space-y-4">
          <h1 className="text-2xl font-medium">Thank you</h1>
          <p className="text-sm leading-relaxed text-muted">
            Your answers are in, and your photograph is not: it was read and discarded before
            anything was sent.
          </p>
          {total !== null && (
            <p className="numeric text-sm text-muted">
              That makes <span className="text-ink">{total}</span> response
              {total === 1 ? "" : "s"} collected so far.
            </p>
          )}
          <button
            onClick={() => {
              setAnswers(EMPTY);
              setFeatures(null);
              setStage("intro");
            }}
            className="text-sm text-accent underline underline-offset-4"
          >
            Add another room
          </button>
        </div>
      )}
    </div>
  );
}

function Scale({
  n,
  label,
  low,
  high,
  value,
  onChange,
}: {
  n: number;
  label: string;
  low: string;
  high: string;
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">
        <span className="mr-2 text-muted">{n}</span>
        {label}
      </p>
      <div className="flex gap-1.5">
        {SCALE.map((v) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            aria-label={`${label} ${v} of 7`}
            className={
              "numeric flex-1 rounded-md border py-3 text-sm transition-colors " +
              (value === v ? "border-accent bg-accent text-paper" : "border-rule hover:border-ink")
            }
          >
            {v}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-[11px] text-muted">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  );
}
