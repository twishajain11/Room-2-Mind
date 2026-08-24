"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadSnapshot, type SnapshotPayload } from "@/lib/snapshotStore";
import ResultView from "./ResultView";

export default function ResultLoader({ id }: { id: string }) {
  const [state, setState] = useState<{ status: "loading" | "missing" | "ready"; snapshot?: SnapshotPayload }>(
    { status: "loading" }
  );

  useEffect(() => {
    const snapshot = loadSnapshot(id);
    setState(snapshot ? { status: "ready", snapshot } : { status: "missing" });
  }, [id]);

  if (state.status === "loading") {
    return <p className="mt-10 text-sm text-muted">Reading the snapshot…</p>;
  }

  if (state.status === "missing") {
    return (
      <div className="mt-10 max-w-reading space-y-3">
        <h1 className="text-xl font-medium">That snapshot is gone</h1>
        <p className="text-sm leading-relaxed text-muted">
          Snapshots live in the tab that took them and nowhere else yet, so a reopened link or a new
          tab has nothing to read. Take another one and the score comes straight back.
        </p>
        <Link href="/capture" className="inline-block text-sm text-accent underline underline-offset-4">
          Take a snapshot
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-10">
      <ResultView snapshot={state.snapshot!} />
    </div>
  );
}
