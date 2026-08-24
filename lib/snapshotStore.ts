import type { AudioFeatures } from "@/lib/audio/types";
import type { Detection, VisionFeatures } from "@/lib/vision/types";

/**
 * Where a snapshot lives between the capture page and the result page.
 *
 * This is `sessionStorage`, not the database. The Prisma schema and the
 * `/api/snapshots` route are Week 3 work and the Render Postgres instance does
 * not exist yet, so the result route takes the shape the spec specifies,
 * `/result/[snapshotId]`, and reads the vector from the tab that produced it.
 * Swapping this module for a fetch is the whole of the migration.
 *
 * It also happens to be the strictest possible reading of §3.1: right now the
 * feature vector does not leave the tab either.
 */

export interface SnapshotPayload {
  id: string;
  createdAt: string;
  vision: VisionFeatures;
  audio: AudioFeatures | null;
  /** Kept for the debug view; not part of what a stored snapshot would be. */
  detections: Detection[];
  frame: { width: number; height: number };
  elapsedMs: number;
}

const PREFIX = "rtm:snapshot:";

export function newSnapshotId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function saveSnapshot(payload: SnapshotPayload): void {
  sessionStorage.setItem(PREFIX + payload.id, JSON.stringify(payload));
}

export function loadSnapshot(id: string): SnapshotPayload | null {
  try {
    const raw = sessionStorage.getItem(PREFIX + id);
    return raw ? (JSON.parse(raw) as SnapshotPayload) : null;
  } catch {
    return null;
  }
}

/**
 * Exactly what a POST to `/api/snapshots` will carry once the database exists.
 *
 * Numbers and enum labels only. The "What we store" panel renders the output of
 * this function verbatim, which is why it is built here rather than assembled
 * inline in a component: the panel and the request cannot drift apart if they
 * are the same function.
 */
export function storedPayload(
  payload: SnapshotPayload,
  mode: string,
  subscores: Record<string, number | null>,
  eli: number
) {
  return {
    mode,
    hasAudio: payload.audio !== null,
    eli: Number(eli.toFixed(2)),
    features: { ...payload.vision, ...(payload.audio ?? {}) },
    subscores,
  };
}
