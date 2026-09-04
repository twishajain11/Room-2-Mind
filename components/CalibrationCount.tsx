"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Live count of calibration responses collected so far.
 *
 * Shows a real count once there is one, and a plain invitation before then. It
 * never announces a zero: an empty tally is not something to advertise, and by
 * the time this matters the count is real. It still never inflates the number.
 */
export default function CalibrationCount() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/insights")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!alive) return;
        const n = data?.population?.responses;
        if (typeof n === "number") setCount(n);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const line =
    count && count > 0
      ? `${count} room${count === 1 ? "" : "s"} calibrated so far. Add yours: one photo, five questions, about a minute.`
      : "Help teach this tool what a room really costs someone's attention. One photo, five questions, about a minute.";

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
