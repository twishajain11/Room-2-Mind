"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Live count of calibration responses collected so far.
 *
 * Honest by construction: it reads the real number from the insights endpoint
 * and shows exactly that, including zero. A zero is not hidden — "be the first"
 * is a truer invitation than a faked tally, and the whole product's credibility
 * rests on never inflating this number.
 */
export default function CalibrationCount() {
  const [count, setCount] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/insights")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!alive) return;
        const n = data?.population?.responses;
        if (typeof n === "number") setCount(n);
        else setFailed(true);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const line =
    count === null
      ? failed
        ? "Help calibrate it — one photo, five questions, about a minute."
        : "Loading calibration progress…"
      : count === 0
        ? "No rooms calibrated yet. Be the first — one photo, five questions, about a minute."
        : `${count} room${count === 1 ? "" : "s"} calibrated so far, on the way to the 30 needed to fit the model. One photo, five questions, about a minute.`;

  return (
    <div className="space-y-2 rounded-md border border-rule bg-card p-5">
      <p className="text-sm leading-relaxed text-ink-soft">{line}</p>
      <Link
        href="/calibrate"
        className="inline-block text-sm text-accent underline underline-offset-4"
      >
        Help calibrate Room to Mind
      </Link>
    </div>
  );
}
