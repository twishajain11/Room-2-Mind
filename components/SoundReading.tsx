"use client";

import { useState } from "react";
import { plainSound } from "@/lib/audio/plain";
import type { AudioFeatures } from "@/lib/audio/types";

/**
 * The sound section, plain first.
 *
 * A relatable sentence is what a reader sees; the hertz and percentages sit one
 * click away for anyone who wants them. Same pattern the rest of the product
 * uses for its arithmetic: nothing hidden, nothing forced.
 */
export default function SoundReading({ audio }: { audio: AudioFeatures | null }) {
  const [showNumbers, setShowNumbers] = useState(false);

  if (!audio) {
    return (
      <p className="max-w-reading text-sm text-muted">
        No sound sample was taken, so acoustic load was left out of the score entirely rather than
        guessed at.
      </p>
    );
  }

  const reading = plainSound(audio);

  const rows: Array<[string, string]> = [
    ["Loudness, mean", audio.rmsMean.toFixed(4)],
    ["Intermittency, variance of loudness", audio.rmsVariance.toFixed(5)],
    ["Brightness, mean spectral centroid", `${audio.spectralCentroidMean.toFixed(0)} Hz`],
    ["Energy in the speech band, 300 to 3400 Hz", `${(audio.speechBandRatio * 100).toFixed(1)}%`],
    ["Energy below 250 Hz, traffic and machinery", `${(audio.lowFreqRatio * 100).toFixed(1)}%`],
    ["Frames sampled", String(audio.frameCount)],
  ];

  return (
    <div className="space-y-4">
      <div className="max-w-reading space-y-2 rounded-md border border-rule bg-card p-5">
        <p className="display text-lg">{reading.headline}</p>
        <p className="text-sm leading-relaxed text-ink-soft">{reading.body}</p>
      </div>

      <button
        onClick={() => setShowNumbers((s) => !s)}
        className="text-sm text-accent underline underline-offset-4"
      >
        {showNumbers ? "Hide the measurements" : "Show the exact measurements"}
      </button>

      {showNumbers && (
        <div className="space-y-2">
          <p className="max-w-reading text-xs leading-relaxed text-muted">
            The product reports what the sound was made of, not how loud it was. A steady fan and an
            intermittent conversation can hit the same decibel meter and load attention entirely
            differently.
          </p>
          <dl className="numeric divide-y divide-rule border-y border-rule text-sm">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-4 py-2">
                <dt className="font-sans">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
