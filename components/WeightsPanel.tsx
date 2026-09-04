"use client";

import {
  FACTORS,
  FACTOR_LABELS,
  WEIGHTS_ARE_PRIORS,
  WEIGHT_JUSTIFICATION,
  WEIGHTS_BY_MODE,
  type FactorKey,
  type FactorWeights,
  type ScoringMode,
} from "@/lib/scoring/weights";
import type { EliResult } from "@/lib/scoring/eli";

/**
 * The product's answer to "where does 72 out of 100 come from".
 *
 * Every weight is a slider and the score recomputes as it moves. The arithmetic
 * is shown as arithmetic: weight, subscore, product, and the running division.
 */
export default function WeightsPanel({
  weights,
  mode,
  result,
  onChange,
  onReset,
}: {
  weights: FactorWeights;
  mode: ScoringMode;
  result: EliResult;
  onChange: (factor: FactorKey, value: number) => void;
  onReset: () => void;
}) {
  const defaults = WEIGHTS_BY_MODE[mode];
  const touched = FACTORS.some((f) => Math.abs(weights[f] - defaults[f]) > 1e-9);

  return (
    <div className="space-y-6 rounded-md border border-rule bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium">The weights</h3>
        {touched && (
          <button
            onClick={onReset}
            className="text-xs text-muted underline underline-offset-4 hover:text-ink"
          >
            Reset to the {mode} defaults
          </button>
        )}
      </div>

      <p className="max-w-reading text-xs leading-relaxed text-muted">{WEIGHTS_ARE_PRIORS}</p>

      <div className="space-y-5">
        {FACTORS.map((factor) => {
          const term = result.terms.find((t) => t.factor === factor);
          const skipped = result.skipped.includes(factor);

          return (
            <div key={factor} className="space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <label htmlFor={`weight-${factor}`} className="text-sm">
                  {FACTOR_LABELS[factor]}
                </label>
                <span className="numeric text-xs text-muted">
                  {skipped ? (
                    "not scored in this snapshot"
                  ) : term ? (
                    <>
                      {weights[factor].toFixed(2)} × {term.subscore.toFixed(1)} ={" "}
                      {term.weighted.toFixed(1)}
                    </>
                  ) : (
                    `${weights[factor].toFixed(2)} × not scored`
                  )}
                </span>
              </div>

              <input
                id={`weight-${factor}`}
                type="range"
                min={0}
                max={0.5}
                step={0.01}
                value={weights[factor]}
                onChange={(e) => onChange(factor, Number(e.target.value))}
                disabled={skipped}
                className="w-full accent-[var(--accent)] disabled:opacity-40"
              />

              <p className="text-[11px] leading-relaxed text-muted">
                {WEIGHT_JUSTIFICATION[factor]}
              </p>
            </div>
          );
        })}
      </div>

      <div className="numeric space-y-1 border-t border-rule pt-4 text-xs text-muted">
        <p>
          Sum of weighted subscores:{" "}
          <span className="text-ink">
            {result.terms.reduce((a, t) => a + t.weighted, 0).toFixed(1)}
          </span>
        </p>
        <p>
          Sum of weights used: <span className="text-ink">{result.weightSum.toFixed(2)}</span>
          {result.skipped.length > 0 && (
            <span>, {result.skipped.length} factor(s) excluded for lack of evidence</span>
          )}
        </p>
        <p>
          Environmental Load Index:{" "}
          <span className="text-ink">{result.eli.toFixed(1)}</span> out of 100
        </p>
      </div>
    </div>
  );
}
