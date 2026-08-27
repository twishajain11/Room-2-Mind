"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  PRACTICES,
  PRACTICE_BY_ID,
  PRACTICE_DISCLAIMER,
  practicesFor,
  type Practice,
} from "@/lib/practices";
import { FACTOR_LABELS, type FactorKey } from "@/lib/scoring/weights";
import { applyTheme, prefersReducedMotion, readTheme, type Theme } from "@/lib/theme";

/**
 * The practice room.
 *
 * Reached from a result when the load is high and the room cannot be changed
 * right now. Everything here is stoppable mid-breath, nothing counts anything,
 * and no practice is recorded anywhere: this is the one surface in the product
 * that measures nothing at all, which is the point of it.
 */

type Phase = "inhale" | "hold" | "exhale";

export default function PracticeRoom({ suggestedFor }: { suggestedFor: FactorKey | null }) {
  const [theme, setTheme] = useState<Theme>("default");
  const [selected, setSelected] = useState<Practice | null>(null);
  const [running, setRunning] = useState(false);
  /** Seconds elapsed in this sitting. Everything else is derived from it. */
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState(false);
  const [stillMotion, setStillMotion] = useState(false);

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const t = readTheme();
    setTheme(t);
    applyTheme(t);
    setStillMotion(prefersReducedMotion());
  }, []);

  const ordered = useMemo(() => practicesFor(suggestedFor), [suggestedFor]);

  const stop = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    setRunning(false);
  }, []);

  useEffect(() => stop, [stop]);

  const begin = useCallback(
    (practice: Practice) => {
      stop();
      setSelected(practice);
      setFinished(false);
      setElapsed(0);
      setRunning(false);
    },
    [stop]
  );

  const start = useCallback(() => {
    if (!selected) return;
    const total = selected.minutes * 60;
    setRunning(true);
    setFinished(false);

    tickRef.current = setInterval(() => {
      setElapsed((e) => {
        const next = e + 1;
        if (next >= total) {
          if (tickRef.current) clearInterval(tickRef.current);
          tickRef.current = null;
          setRunning(false);
          setFinished(true);
          return total;
        }
        return next;
      });
    }, 1000);
  }, [selected]);

  const toggleTheme = () => {
    const next: Theme = theme === "recovery" ? "default" : "recovery";
    setTheme(next);
    applyTheme(next);
  };

  const total = selected ? selected.minutes * 60 : 0;
  const remaining = Math.max(0, total - elapsed);
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  /**
   * The breath phase is a pure function of elapsed time rather than its own
   * piece of state. Deriving it means the cue can never drift out of step with
   * the clock, and a pause and resume lands exactly where it left off.
   */
  const breath = useMemo((): { phase: Phase; left: number; length: number } | null => {
    const pace = selected?.pace;
    if (!pace) return null;
    const cycle = pace.inhale + pace.hold + pace.exhale;
    if (cycle <= 0) return null;
    const position = elapsed % cycle;
    if (position < pace.inhale) {
      return { phase: "inhale", left: pace.inhale - position, length: pace.inhale };
    }
    if (position < pace.inhale + pace.hold) {
      return { phase: "hold", left: pace.inhale + pace.hold - position, length: pace.hold };
    }
    return { phase: "exhale", left: cycle - position, length: pace.exhale };
  }, [elapsed, selected]);

  const phase: Phase = breath?.phase ?? "inhale";
  const cue = phase === "inhale" ? "Breathe in" : phase === "hold" ? "Rest" : "Breathe out";
  const phaseSeconds = breath?.length;

  const animate = running && !stillMotion && theme !== "recovery" && !!selected?.pace;

  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">A few minutes</p>
            <h1 className="display text-3xl leading-tight">
              When the room cannot change, and you still have to work in it
            </h1>
          </div>
          <button
            onClick={toggleTheme}
            className="shrink-0 rounded-full border border-rule px-4 py-2 text-xs transition-colors hover:border-ink"
          >
            {theme === "recovery" ? "Normal light" : "Dim the page"}
          </button>
        </div>

        <p className="max-w-reading text-sm leading-relaxed text-muted">
          {suggestedFor
            ? `Your snapshot put the most load on ${FACTOR_LABELS[suggestedFor].toLowerCase()}. The practice suggested first is the one that speaks to it, though any of them will do.`
            : "Six traditional practices, none longer than five minutes. Nothing here is counted, scored, or stored."}
        </p>
      </header>

      <p className="max-w-reading rounded-md border border-rule bg-card p-4 text-xs leading-relaxed text-muted">
        {PRACTICE_DISCLAIMER}
      </p>

      {!selected && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {ordered.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => begin(p)}
                className="h-full w-full space-y-2 rounded-md border border-rule bg-card p-5 text-left transition-colors hover:border-accent"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="display text-lg">{p.sanskrit}</span>
                  <span className="numeric text-xs text-muted">{p.minutes} min</span>
                </div>
                <p className="text-xs text-muted">{p.english}</p>
                <p className="text-sm leading-relaxed text-ink-soft">{p.purpose}</p>
                {p.pairsWith === suggestedFor && suggestedFor && (
                  <p className="text-[11px] uppercase tracking-[0.15em] text-accent">
                    Suggested for you
                  </p>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div className="space-y-8">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h2 className="display text-2xl">{selected.sanskrit}</h2>
              <p className="text-sm text-muted">{selected.english}</p>
            </div>
            <button
              onClick={() => {
                stop();
                setSelected(null);
                setFinished(false);
              }}
              className="text-xs text-muted underline underline-offset-4 hover:text-ink"
            >
              Choose something else
            </button>
          </div>

          {/* The timer, and the pacer when there is one. */}
          <div className="flex flex-col items-center gap-6 rounded-md border border-rule bg-card p-8">
            {selected.pace ? (
              <div className="relative flex h-44 w-44 items-center justify-center">
                <div
                  className="breathe-visual absolute inset-0 rounded-full bg-accent-soft"
                  style={
                    animate && phaseSeconds
                      ? {
                          animation: `breathe-scale ${phaseSeconds}s ease-in-out forwards`,
                          animationDirection: phase === "exhale" ? "reverse" : "normal",
                          transform: phase === "exhale" ? "scale(1)" : "scale(0.5)",
                        }
                      : { transform: "scale(0.85)" }
                  }
                  aria-hidden
                />
                <div className="relative text-center">
                  <p className="text-sm font-medium">{running ? cue : "Ready"}</p>
                  {running && breath ? (
                    <p className="numeric text-xs text-muted">{breath.left}</p>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="flex h-44 w-44 items-center justify-center rounded-full bg-accent-soft">
                <p className="text-sm">{running ? "Rest" : "Ready"}</p>
              </div>
            )}

            <p className="numeric text-4xl font-light" aria-live="off">
              {minutes}:{String(seconds).padStart(2, "0")}
            </p>

            {finished ? (
              <div className="space-y-3 text-center">
                <p className="text-sm">Done. Come back whenever the room is loud.</p>
                <button
                  onClick={() => begin(selected)}
                  className="rounded-md border border-rule px-5 py-2 text-sm transition-colors hover:border-ink"
                >
                  Again
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  onClick={running ? stop : start}
                  className="rounded-md bg-accent px-6 py-2.5 text-sm font-medium text-accent-ink transition-opacity hover:opacity-90"
                >
                  {running ? "Pause" : elapsed > 0 ? "Continue" : "Begin"}
                </button>
                <button
                  onClick={() => begin(selected)}
                  className="rounded-md border border-rule px-5 py-2.5 text-sm transition-colors hover:border-ink"
                >
                  Reset
                </button>
              </div>
            )}

            <p className="text-center text-xs text-muted">
              Stop at any point. Nothing is being recorded.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-xs uppercase tracking-[0.18em] text-muted">How</h3>
              <ol className="space-y-2 text-sm leading-relaxed">
                {selected.steps.map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="numeric shrink-0 text-muted">{i + 1}</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-xs uppercase tracking-[0.18em] text-muted">Why this one</h3>
                <p className="text-sm leading-relaxed text-ink-soft">{selected.purpose}</p>
              </div>
              <div className="space-y-2">
                <h3 className="text-xs uppercase tracking-[0.18em] text-muted">Care</h3>
                <p className="text-sm leading-relaxed text-ink-soft">{selected.caution}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-rule pt-6">
        <Link href="/capture" className="text-sm text-accent underline underline-offset-4">
          Measure the room instead
        </Link>
      </div>
    </div>
  );
}

export { PRACTICES, PRACTICE_BY_ID };
