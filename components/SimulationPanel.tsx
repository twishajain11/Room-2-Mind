"use client";

import { useMemo, useState } from "react";
import { computeEli } from "@/lib/scoring/eli";
import {
  FACTORS,
  FACTOR_LABELS,
  type FactorKey,
  type FactorWeights,
  type Subscores,
} from "@/lib/scoring/weights";

/**
 * §8.2 simulation.
 *
 * Move a factor and watch the score move, without touching the room. Every
 * prediction carries an interval, and where there is no fitted model to draw an
 * interval from, the panel says so rather than drawing a point estimate and
 * hoping nobody asks.
 */

export interface ConcentrationModel {
  /** Standardized coefficient per factor, concentration per 1 SD of subscore. */
  coefficients: Partial<Record<FactorKey, number>>;
  standardErrors: Partial<Record<FactorKey, number>>;
  /** Subscore standard deviations the coefficients were fitted against. */
  stdDevs: Partial<Record<FactorKey, number>>;
  responses: number;
}

export default function SimulationPanel({
  subscores,
  weights,
  model,
}: {
  subscores: Subscores;
  weights: FactorWeights;
  model: ConcentrationModel | null;
}) {
  const scorable = FACTORS.filter((f) => subscores[f] !== null);
  const [adjusted, setAdjusted] = useState<Record<string, number>>(() =>
    Object.fromEntries(scorable.map((f) => [f, subscores[f] as number]))
  );

  const baseline = useMemo(() => computeEli(subscores, weights), [subscores, weights]);

  const simulated = useMemo(() => {
    const next: Subscores = { ...subscores };
    for (const f of scorable) next[f] = adjusted[f];
    return computeEli(next, weights);
  }, [adjusted, scorable, subscores, weights]);

  const eliDelta = simulated.eli - baseline.eli;
  const touched = scorable.some((f) => Math.abs(adjusted[f] - (subscores[f] as number)) > 0.5);

  /**
   * Predicted change in reported concentration, on the 1 to 7 scale.
   *
   * Each factor contributes (change in subscore / its SD) × its coefficient.
   * The interval combines the coefficient errors in quadrature, which assumes
   * the factors move independently. They do not, entirely, so the band is
   * indicative rather than exact, and the panel says that too.
   */
  const concentration = useMemo(() => {
    if (!model) return null;
    let delta = 0;
    let variance = 0;
    for (const f of scorable) {
      const coefficient = model.coefficients[f];
      const stdError = model.standardErrors[f];
      const sd = model.stdDevs[f];
      if (coefficient === undefined || stdError === undefined || !sd) continue;
      const move = (adjusted[f] - (subscores[f] as number)) / sd;
      delta += move * coefficient;
      variance += (move * stdError) * (move * stdError);
    }
    // 95% interval, two standard errors either side.
    return { delta, halfWidth: 1.96 * Math.sqrt(variance) };
  }, [adjusted, model, scorable, subscores]);

  return (
    <div className="space-y-6 rounded-md border border-rule bg-card p-5">
      <div className="space-y-1">
        <h3 className="text-sm font-medium">What if the room were different</h3>
        <p className="max-w-reading text-xs leading-relaxed text-muted">
          Move a factor to see what the score would be. Nothing here changes your room or your
          snapshot.
        </p>
      </div>

      <div className="space-y-5">
        {scorable.map((factor) => {
          const current = subscores[factor] as number;
          const value = adjusted[factor];
          const moved = Math.abs(value - current) > 0.5;

          return (
            <div key={factor} className="space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <label htmlFor={`sim-${factor}`} className="text-sm">
                  {FACTOR_LABELS[factor]}
                </label>
                <span className="numeric text-xs text-muted">
                  {moved ? (
                    <>
                      <span className="line-through">{current.toFixed(0)}</span>{" "}
                      <span className="text-ink">{value.toFixed(0)}</span>
                    </>
                  ) : (
                    current.toFixed(0)
                  )}
                </span>
              </div>
              <input
                id={`sim-${factor}`}
                type="range"
                min={0}
                max={100}
                step={1}
                value={value}
                onChange={(e) =>
                  setAdjusted((a) => ({ ...a, [factor]: Number(e.target.value) }))
                }
                className="w-full accent-[var(--accent)]"
              />
            </div>
          );
        })}
      </div>

      <div className="space-y-3 border-t border-rule pt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <span className="text-sm">Environmental Load Index</span>
          <span className="numeric text-sm">
            {baseline.eli.toFixed(1)}
            {touched && (
              <>
                {" → "}
                <span className="font-medium">{simulated.eli.toFixed(1)}</span>{" "}
                <span className={eliDelta <= 0 ? "text-accent" : "text-muted"}>
                  ({eliDelta > 0 ? "+" : ""}
                  {eliDelta.toFixed(1)})
                </span>
              </>
            )}
          </span>
        </div>

        {touched && (
          <div className="space-y-2">
            {concentration ? (
              <>
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <span className="text-sm">Predicted concentration, 1 to 7</span>
                  <span className="numeric text-sm">
                    {concentration.delta > 0 ? "+" : ""}
                    {concentration.delta.toFixed(2)}{" "}
                    <span className="text-muted">
                      ± {concentration.halfWidth.toFixed(2)}
                    </span>
                  </span>
                </div>
                <UncertaintyBand
                  delta={concentration.delta}
                  halfWidth={concentration.halfWidth}
                />
                <p className="text-[11px] leading-relaxed text-muted">
                  Fitted to {model!.responses} responses. The band is a 95% interval from the
                  regression&rsquo;s own standard errors, and it assumes the factors move
                  independently, which they only roughly do.
                </p>
              </>
            ) : (
              <p className="max-w-reading text-xs leading-relaxed text-muted">
                No concentration model has been fitted yet, so this panel will not tell you what
                the change would do to your focus. It can only show you what it does to the load
                index above, which is arithmetic rather than prediction. A point estimate with no
                interval is the least honest thing this product could show you.
              </p>
            )}
          </div>
        )}

        {touched && (
          <button
            onClick={() =>
              setAdjusted(Object.fromEntries(scorable.map((f) => [f, subscores[f] as number])))
            }
            className="text-xs text-muted underline underline-offset-4 hover:text-ink"
          >
            Put everything back
          </button>
        )}
      </div>
    </div>
  );
}

/** A predicted change drawn as an interval rather than a point. */
function UncertaintyBand({ delta, halfWidth }: { delta: number; halfWidth: number }) {
  // Fixed ±3 scale so bands are comparable between adjustments.
  const SCALE = 3;
  const toPercent = (v: number) => ((v + SCALE) / (2 * SCALE)) * 100;

  const low = Math.max(-SCALE, delta - halfWidth);
  const high = Math.min(SCALE, delta + halfWidth);

  return (
    <div className="space-y-1">
      <div className="relative h-6 w-full rounded bg-rule/50">
        <div className="absolute inset-y-0 left-1/2 w-px bg-rule" aria-hidden />
        <div
          className="absolute inset-y-1.5 rounded-sm bg-accent/30"
          style={{ left: `${toPercent(low)}%`, right: `${100 - toPercent(high)}%` }}
        />
        <div
          className="absolute inset-y-0.5 w-0.5 bg-accent"
          style={{ left: `${toPercent(Math.max(-SCALE, Math.min(SCALE, delta)))}%` }}
        />
      </div>
      <div className="numeric flex justify-between text-[11px] text-muted">
        <span>−{SCALE}</span>
        <span>no change</span>
        <span>+{SCALE}</span>
      </div>
    </div>
  );
}
