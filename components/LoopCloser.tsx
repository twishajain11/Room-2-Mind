"use client";

import { compareOutcome, type PendingComparison } from "@/lib/loopStore";
import { FACTOR_LABELS, type FactorKey, type Subscores } from "@/lib/scoring/weights";
import { VISION_METHODS } from "@/lib/vision/methods";
import type { VisionFeatures } from "@/lib/vision/types";

/**
 * §8.3, the loop closer.
 *
 * Both numbers are shown, always. A tool that reports its own misses is worth
 * more than one that only ever reports agreement, so there is no branch here
 * that hides a bad prediction.
 */
export default function LoopCloser({
  pending,
  currentEli,
  currentSubscores,
  currentFeatures,
}: {
  pending: PendingComparison;
  currentEli: number;
  currentSubscores: Subscores;
  currentFeatures: VisionFeatures;
}) {
  const outcome = compareOutcome(pending, currentEli);

  const before = pending.baselineSubscores[pending.factor];
  const after = currentSubscores[pending.factor];

  const verdict = !outcome.directionRight
    ? "The load went up, not down. The prediction was wrong about the direction, not just the size."
    : Math.abs(outcome.error) < 1
      ? "Close. The prediction landed within one point of what actually happened."
      : outcome.error > 0
        ? "The change helped less than predicted. The product over-promised here."
        : "The change helped more than predicted. The product under-promised here.";

  return (
    <section className="space-y-5 rounded-md border border-accent bg-card p-5">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.18em] text-accent">Predicted against actual</p>
        <h2 className="text-sm font-medium">
          You changed {FACTOR_LABELS[pending.factor].toLowerCase()} and came back
        </h2>
        <p className="max-w-reading text-xs leading-relaxed text-muted">
          &ldquo;{pending.action}&rdquo;
        </p>
      </div>

      <dl className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <dt className="text-xs text-muted">Predicted improvement</dt>
          <dd className="numeric text-2xl font-light">
            {pending.predictedDelta.toFixed(1)}
          </dd>
        </div>
        <div className="space-y-1">
          <dt className="text-xs text-muted">Actual improvement</dt>
          <dd className="numeric text-2xl font-light">
            {outcome.actualDelta > 0 ? "" : ""}
            {outcome.actualDelta.toFixed(1)}
          </dd>
        </div>
        <div className="space-y-1">
          <dt className="text-xs text-muted">Miss</dt>
          <dd className="numeric text-2xl font-light">
            {outcome.error > 0 ? "+" : ""}
            {outcome.error.toFixed(1)}
          </dd>
        </div>
      </dl>

      <p className="max-w-reading text-sm leading-relaxed">{verdict}</p>

      <dl className="numeric space-y-2 border-t border-rule pt-4 text-sm">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="font-sans">Environmental Load Index</dt>
          <dd>
            {pending.baselineEli.toFixed(1)} → {currentEli.toFixed(1)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="font-sans">{FACTOR_LABELS[pending.factor]}</dt>
          <dd>
            {before === null ? "not scored" : before.toFixed(0)} →{" "}
            {after === null ? "not scored" : after.toFixed(0)}
          </dd>
        </div>
      </dl>

      <details>
        <summary className="cursor-pointer text-xs text-muted">
          Both feature vectors, side by side
        </summary>
        <dl className="mt-3 divide-y divide-rule border-y border-rule text-xs">
          {VISION_METHODS.map((m) => {
            const b = (pending.baselineFeatures as unknown as Record<string, unknown>)[m.key];
            const a = (currentFeatures as unknown as Record<string, unknown>)[m.key];
            const changed = JSON.stringify(b) !== JSON.stringify(a);
            return (
              <div
                key={m.key}
                className={
                  "grid grid-cols-[1fr_auto_auto] items-baseline gap-3 py-2 " +
                  (changed ? "" : "text-muted")
                }
              >
                <dt className="font-sans">{m.label}</dt>
                <dd className="numeric text-right">{format(b)}</dd>
                <dd className="numeric w-24 text-right">{format(a)}</dd>
              </div>
            );
          })}
        </dl>
      </details>
    </section>
  );
}

function format(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(Math.abs(value) < 1 ? 3 : 1);
  }
  if (typeof value === "object") {
    return Object.values(value as Record<string, number>)
      .map((v) => v.toFixed(2))
      .join(", ");
  }
  return String(value);
}

export type { FactorKey };
