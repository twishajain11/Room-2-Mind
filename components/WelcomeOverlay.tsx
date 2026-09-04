"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { prefersReducedMotion } from "@/lib/theme";

/**
 * A first-arrival welcome.
 *
 * Shown once per browser, on the home page only, so a returning visitor and
 * anyone following the calibration link are never made to sit through it. It is
 * a greeting, not a gate: it can be dismissed, it traps nothing, and Escape
 * closes it. Motion-sensitive viewers get no fade, which matters for the
 * recovery audience this product is partly built for.
 */
const SEEN_KEY = "rtm:welcomed";

export default function WelcomeOverlay() {
  // `null` until we have checked storage, so the overlay never flashes for
  // someone who has already seen it.
  const [show, setShow] = useState<boolean | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [reduced, setReduced] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setReduced(prefersReducedMotion());
    let seen = false;
    try {
      seen = localStorage.getItem(SEEN_KEY) === "yes";
    } catch {
      // No storage, treat as a first visit; worst case they see it once more.
    }
    setShow(!seen);
  }, []);

  const remember = () => {
    try {
      localStorage.setItem(SEEN_KEY, "yes");
    } catch {
      // A remembered dismissal is a convenience, not a requirement.
    }
  };

  const dismiss = (then?: () => void) => {
    remember();
    if (reduced) {
      setShow(false);
      then?.();
      return;
    }
    setLeaving(true);
    // Match the fade-out duration below before unmounting.
    window.setTimeout(() => {
      setShow(false);
      then?.();
    }, 400);
  };

  // Escape closes it, like any non-modal overlay should.
  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, reduced]);

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label="Welcome to Room to Mind"
      className="fixed inset-0 z-50 flex items-center justify-center bg-paper px-6"
      style={{
        transition: reduced ? undefined : "opacity 400ms ease",
        opacity: leaving ? 0 : 1,
      }}
    >
      <div
        className="max-w-lg space-y-8 text-center"
        style={
          reduced
            ? undefined
            : {
                animation: leaving ? undefined : "welcome-rise 700ms ease forwards",
              }
        }
      >
        <p className="text-xs uppercase tracking-[0.28em] text-accent">Welcome to</p>
        <h1 className="display text-5xl leading-tight sm:text-6xl">Room to Mind</h1>
        <p className="mx-auto max-w-sm text-base leading-relaxed text-ink-soft">
          The space around you is quietly shaping how well you can think. This measures that, in your
          browser, and never keeps the picture. Take a breath, then take a look.
        </p>

        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <button
            onClick={() => dismiss(() => router.push("/capture"))}
            className="rounded-md bg-accent px-6 py-3 text-sm font-medium text-accent-ink transition-opacity hover:opacity-90"
          >
            Measure my room
          </button>
          <button
            onClick={() => dismiss()}
            className="rounded-md border border-rule px-6 py-3 text-sm font-medium transition-colors hover:border-ink"
          >
            Just look around
          </button>
        </div>

        <p className="text-xs text-muted">No account, no upload, no image ever stored.</p>
      </div>
    </div>
  );
}
