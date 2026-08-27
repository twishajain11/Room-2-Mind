"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { computeEli, eliBand } from "@/lib/scoring/eli";
import { computeSubscores, lightingDiagnosis } from "@/lib/scoring/features";
import { PERCENTILES_ARE_PROVISIONAL, topInterventions } from "@/lib/scoring/interventions";
import {
  CALIBRATION_DATE,
  FACTORS,
  FACTOR_LABELS,
  FACTOR_MEANING,
  RECOVERY_DISCLAIMER,
  WEIGHTS_BY_MODE,
  type FactorKey,
  type FactorWeights,
  type ScoringMode,
} from "@/lib/scoring/weights";
import type { SnapshotPayload } from "@/lib/snapshotStore";
import { storedPayload } from "@/lib/snapshotStore";
import { DETECTION_CONFIDENCE_THRESHOLD } from "@/lib/vision/objects";
import { savePending } from "@/lib/loopStore";
import { priorLabel } from "@/lib/personalization/priors";
import FeatureTable from "./FeatureTable";
import LoopCloser from "./LoopCloser";
import SimulationPanel, { type ConcentrationModel } from "./SimulationPanel";
import WeightsPanel from "./WeightsPanel";

/** Why a factor could not be scored, in the words the reader needs. */
const SKIP_REASON: Partial<Record<FactorKey, string>> = {
  screenPositioning: "No screen was detected in this frame, so this factor was not scored.",
  acousticLoad: "No sound sample was taken, so this factor was not scored.",
  workspaceSeparation:
    "Neither a work surface nor a rest surface was detected, so this factor was not scored.",
};

export default function ResultView({ snapshot }: { snapshot: SnapshotPayload }) {
  const router = useRouter();
  const [mode, setMode] = useState<ScoringMode>("standard");
  const [weights, setWeights] = useState<FactorWeights>(WEIGHTS_BY_MODE.standard);
  const [showWeights, setShowWeights] = useState(false);
  const [model, setModel] = useState<ConcentrationModel | null>(null);

  // The concentration model, if one has been fitted yet. Stays null on failure
  // and at low sample sizes, which is what the simulation panel expects.
  useEffect(() => {
    let alive = true;
    fetch("/api/insights")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!alive || !data?.population?.fitted || !data.population.drivers) return;
        const coefficients: ConcentrationModel["coefficients"] = {};
        const standardErrors: ConcentrationModel["standardErrors"] = {};
        for (const d of data.population.drivers) {
          coefficients[d.factor as FactorKey] = d.coefficient;
          standardErrors[d.factor as FactorKey] = d.standardError;
        }
        setModel({
          coefficients,
          standardErrors,
          stdDevs: data.population.stdDevs ?? {},
          responses: data.population.responses,
        });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const subscores = useMemo(
    () => computeSubscores(snapshot.vision, snapshot.audio),
    [snapshot]
  );

  const result = useMemo(() => computeEli(subscores, weights), [subscores, weights]);

  const interventions = useMemo(
    () => topInterventions(subscores, weights, snapshot.vision, snapshot.audio),
    [subscores, weights, snapshot]
  );

  const switchMode = (next: ScoringMode) => {
    setMode(next);
    setWeights(WEIGHTS_BY_MODE[next]);
  };

  return (
    <div className="space-y-14">
      {snapshot.compareWith && (
        <LoopCloser
          pending={snapshot.compareWith}
          currentEli={result.eli}
          currentSubscores={subscores}
          currentFeatures={snapshot.vision}
        />
      )}

      {/* The score, and one click to its arithmetic. */}
      <section className="space-y-5">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
          <p className="numeric text-6xl font-light leading-none">{result.eli.toFixed(0)}</p>
          <div className="space-y-1">
            <p className="text-sm font-medium">{eliBand(result.eli)}</p>
            <p className="text-xs text-muted">
              Environmental Load Index, 0 to 100. Higher means more load.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowWeights((s) => !s)}
          className="text-sm text-accent underline underline-offset-4"
        >
          {showWeights ? "Hide the arithmetic" : "Where does this number come from?"}
        </button>

        {showWeights && (
          <WeightsPanel
            weights={weights}
            mode={mode}
            result={result}
            onChange={(factor, value) => setWeights((w) => ({ ...w, [factor]: value }))}
            onReset={() => setWeights(WEIGHTS_BY_MODE[mode])}
          />
        )}
      </section>

      {/* Recovery Mode. */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-[0.18em] text-muted">Mode</span>
          <div className="flex overflow-hidden rounded-md border border-rule">
            {(["standard", "recovery"] as ScoringMode[]).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={
                  "px-4 py-1.5 text-sm transition-colors " +
                  (mode === m ? "bg-accent text-paper" : "hover:bg-rule/40")
                }
              >
                {m === "standard" ? "Standard" : "Recovery"}
              </button>
            ))}
          </div>
        </div>

        {mode === "recovery" && (
          <div className="max-w-reading space-y-4 rounded-md border border-rule bg-card p-5">
            <p className="text-sm leading-relaxed">{RECOVERY_DISCLAIMER}</p>
            <dl className="space-y-3 border-t border-rule pt-4 text-sm">
              <div className="flex items-baseline justify-between gap-4">
                <dt>
                  Glare range
                  <span className="block text-xs text-muted">
                    The spread between the darkest and brightest parts of the frame.
                  </span>
                </dt>
                <dd className="numeric">{snapshot.vision.luminanceStdDev.toFixed(1)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt>
                  Sound intermittency
                  <span className="block text-xs text-muted">
                    How much the loudness moved across the sample, rather than how loud it was.
                  </span>
                </dt>
                <dd className="numeric">
                  {snapshot.audio ? snapshot.audio.rmsVariance.toFixed(5) : "no sample"}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </section>

      {/* Factor breakdown. */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium">What made up the score</h2>
        <ul className="divide-y divide-rule border-y border-rule">
          {FACTORS.map((factor) => {
            const subscore = subscores[factor];
            const term = result.terms.find((t) => t.factor === factor);

            return (
              <li key={factor} className="space-y-2 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">{FACTOR_LABELS[factor]}</span>
                  <span className="numeric text-sm">
                    {subscore === null ? (
                      <span className="text-muted">not scored</span>
                    ) : (
                      <>
                        {subscore.toFixed(0)}
                        <span className="text-muted">
                          {" "}
                          — {term ? term.contribution.toFixed(1) : "0.0"} of the{" "}
                          {result.eli.toFixed(1)}
                        </span>
                      </>
                    )}
                  </span>
                </div>

                <div className="h-1.5 w-full overflow-hidden rounded-full bg-rule">
                  <div
                    className="h-full rounded-full bg-accent transition-[width]"
                    style={{ width: `${subscore ?? 0}%`, opacity: subscore === null ? 0.25 : 1 }}
                  />
                </div>

                <p className="text-xs leading-relaxed text-muted">
                  {subscore === null
                    ? SKIP_REASON[factor] ?? "Not scored in this snapshot."
                    : factor === "lighting"
                      ? // Naming which of the three conditions fired, rather than
                        // reciting all three and telling the reader nothing.
                        lightingDiagnosis(snapshot.vision).sentence
                      : FACTOR_MEANING[factor]}
                </p>
              </li>
            );
          })}
        </ul>

        {CALIBRATION_DATE === null && (
          <p className="max-w-reading text-xs leading-relaxed text-muted">
            These subscores use provisional breakpoints written by hand. They have not yet been
            fitted to the calibration dataset, and that is the next thing this project does.
          </p>
        )}
      </section>

      {/* Simulation. */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium">Simulation</h2>
        <SimulationPanel subscores={subscores} weights={weights} model={model} />
        <p className="max-w-reading text-xs leading-relaxed text-muted">{priorLabel()}</p>
      </section>

      {/* The acoustic channel. */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium">Sound</h2>
        {snapshot.audio ? (
          <div className="space-y-3">
            <p className="max-w-reading text-xs leading-relaxed text-muted">
              This reports what the sound was made of, not how loud it was. A steady fan and an
              intermittent conversation can hit the same decibel meter and load attention entirely
              differently.
            </p>
            <dl className="numeric divide-y divide-rule border-y border-rule text-sm">
              {[
                ["Loudness, mean", snapshot.audio.rmsMean.toFixed(4)],
                ["Intermittency, variance of loudness", snapshot.audio.rmsVariance.toFixed(5)],
                ["Brightness, mean spectral centroid", `${snapshot.audio.spectralCentroidMean.toFixed(0)} Hz`],
                ["Energy in the speech band, 300 to 3400 Hz", `${(snapshot.audio.speechBandRatio * 100).toFixed(1)}%`],
                ["Energy below 250 Hz, traffic and machinery", `${(snapshot.audio.lowFreqRatio * 100).toFixed(1)}%`],
                ["Frames sampled", String(snapshot.audio.frameCount)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-4 py-2">
                  <dt className="font-sans">{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : (
          <p className="max-w-reading text-sm text-muted">
            No sound sample was taken, so acoustic load was left out of the score entirely rather
            than guessed at.
          </p>
        )}
      </section>

      {/* Interventions. */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium">What to change</h2>

        {interventions.length === 0 ? (
          <p className="max-w-reading text-sm text-muted">
            Every factor this snapshot could score is already at or below its target. There is
            nothing here worth asking you to move.
          </p>
        ) : (
          <ol className="space-y-4">
            {interventions.map((item, i) => (
              <li
                key={item.factor}
                className={
                  "space-y-2 rounded-md border p-5 " +
                  (i === 0 ? "border-accent bg-card" : "border-rule bg-card")
                }
              >
                {i === 0 && (
                  <p className="text-xs uppercase tracking-[0.18em] text-accent">
                    Your highest impact change
                  </p>
                )}
                <p className="text-sm font-medium">{item.action}</p>
                <p className="text-xs leading-relaxed text-muted">{item.evidence}</p>
                <p className="numeric text-xs text-muted">
                  {FACTOR_LABELS[item.factor]} {item.current.toFixed(0)} → {item.target.toFixed(0)},
                  worth {item.realizableDelta.toFixed(1)} ELI points before effort, ranked at{" "}
                  {item.score.toFixed(1)} after it.
                </p>

                {i === 0 && (
                  <button
                    onClick={() => {
                      savePending({
                        baselineId: snapshot.id,
                        baselineEli: result.eli,
                        baselineSubscores: subscores,
                        baselineFeatures: snapshot.vision,
                        factor: item.factor,
                        factorLabel: FACTOR_LABELS[item.factor],
                        action: item.action,
                        predictedDelta: item.realizableDelta,
                        createdAt: new Date().toISOString(),
                      });
                      router.push("/capture");
                    }}
                    className="mt-1 rounded-md border border-accent px-4 py-2 text-xs font-medium text-accent transition-colors hover:bg-accent hover:text-paper"
                  >
                    I have made this change, measure it again
                  </button>
                )}
              </li>
            ))}
          </ol>
        )}

        {PERCENTILES_ARE_PROVISIONAL && interventions.length > 0 && (
          <p className="max-w-reading text-xs leading-relaxed text-muted">
            The target each change aims at is a provisional stand-in for the 25th percentile of the
            calibration dataset, which has not been collected yet. The ranking is real arithmetic on
            your snapshot; the target it aims at is not yet grounded in data.
          </p>
        )}
      </section>

      {/* The debug view. */}
      <details className="space-y-3 border-t border-rule pt-6">
        <summary className="cursor-pointer text-sm font-medium">
          The measurements underneath
        </summary>

        <div className="mt-5 space-y-8">
          <FeatureTable features={snapshot.vision} />

          <div className="space-y-2">
            <h3 className="text-xs uppercase tracking-[0.18em] text-muted">Detections</h3>
            {snapshot.detections.length === 0 ? (
              <p className="text-sm text-muted">Nothing was detected in this frame.</p>
            ) : (
              <ul className="divide-y divide-rule border-y border-rule">
                {[...snapshot.detections]
                  .sort((a, b) => b.score - a.score)
                  .map((d, i) => (
                    <li
                      key={d.class + "-" + i}
                      className={
                        "flex items-baseline justify-between py-2 text-sm " +
                        (d.score >= DETECTION_CONFIDENCE_THRESHOLD
                          ? ""
                          : "text-muted line-through")
                      }
                    >
                      <span>{d.class}</span>
                      <span className="numeric">{d.score.toFixed(3)}</span>
                    </li>
                  ))}
              </ul>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-xs uppercase tracking-[0.18em] text-muted">
              What a stored snapshot would be
            </h3>
            <p className="max-w-reading text-xs text-muted">
              Numbers and labels. There is no image field and no audio field, because neither one
              was kept.
            </p>
            <pre className="overflow-x-auto rounded-md border border-rule bg-card p-4 font-mono text-xs leading-relaxed">
              {JSON.stringify(storedPayload(snapshot, mode, subscores, result.eli), null, 2)}
            </pre>
          </div>
        </div>
      </details>

      <div className="border-t border-rule pt-6">
        <Link href="/capture" className="text-sm text-accent underline underline-offset-4">
          Take another snapshot
        </Link>
      </div>
    </div>
  );
}
