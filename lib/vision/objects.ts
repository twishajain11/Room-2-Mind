import type { Detection, NormalizedBox, ObjectFeatures, Point } from "./types";

/** Detections below this confidence are discarded before any feature is computed (spec §5.2). */
export const DETECTION_CONFIDENCE_THRESHOLD = 0.4;

/**
 * COCO class to bucket mapping.
 *
 * Two deliberate departures from the spec table, both forced by the model:
 *  - `desk` is not one of COCO's 80 classes, so `dining table` carries the
 *    work-surface signal on its own. The spec's "desk if present" cannot be
 *    honoured without training a model, which §12 forbids.
 *  - `laptop` is listed under both `workSurface` and `screen` in the spec, so
 *    the buckets genuinely overlap. `clutterObjects` is therefore defined as
 *    everything matching no named bucket, not as "everything else detected"
 *    minus one bucket, which would double count.
 */
export const BUCKETS = {
  workSurface: ["dining table", "laptop", "keyboard", "mouse"],
  screen: ["tv", "laptop", "cell phone"],
  restSurface: ["bed", "couch"],
} as const;

export type BucketName = keyof typeof BUCKETS;

export function inBucket(cls: string, bucket: BucketName): boolean {
  return (BUCKETS[bucket] as readonly string[]).includes(cls);
}

/** True when a detection matches none of the named buckets. */
export function isClutter(cls: string): boolean {
  return !(Object.keys(BUCKETS) as BucketName[]).some((b) => inBucket(cls, b));
}

export function aboveThreshold(
  detections: Detection[],
  threshold = DETECTION_CONFIDENCE_THRESHOLD
): Detection[] {
  return detections.filter((d) => d.score >= threshold);
}

/** Convert a pixel-space detection box into frame fractions. */
export function normalizeBox(d: Detection, width: number, height: number): NormalizedBox {
  return {
    x: d.bbox[0] / width,
    y: d.bbox[1] / height,
    width: d.bbox[2] / width,
    height: d.bbox[3] / height,
  };
}

export function boxArea(b: NormalizedBox): number {
  return Math.max(0, b.width) * Math.max(0, b.height);
}

export function boxCentre(b: NormalizedBox): Point {
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

/** Intersection over union of two normalized boxes. */
export function iou(a: NormalizedBox, b: NormalizedBox): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = boxArea(a) + boxArea(b) - inter;
  return union <= 0 ? 0 : inter / union;
}

/** Largest-by-area normalized box among detections in a bucket, or null if the bucket is empty. */
export function largestInBucket(
  detections: Detection[],
  bucket: BucketName,
  width: number,
  height: number
): NormalizedBox | null {
  let best: NormalizedBox | null = null;
  for (const d of detections) {
    if (!inBucket(d.class, bucket)) continue;
    const box = normalizeBox(d, width, height);
    if (!best || boxArea(box) > boxArea(best)) best = box;
  }
  return best;
}

/**
 * Euclidean distance between the screen box centre and the bright-region
 * centroid, a proxy for whether the screen is backlit by the window.
 *
 * Null when no screen was detected: absent evidence is not the same as a screen
 * sitting on top of the light source, and collapsing the two to 0 would score a
 * screenless room as the worst possible case.
 */
export function screenLightAlignment(
  screenBox: NormalizedBox | null,
  brightCentroid: Point
): number | null {
  if (!screenBox) return null;
  const c = boxCentre(screenBox);
  return Math.hypot(c.x - brightCentroid.x, c.y - brightCentroid.y);
}

/** All Section 5.2 object features from a detection list already filtered by confidence. */
export function objectFeatures(
  detections: Detection[],
  width: number,
  height: number,
  brightCentroid: Point
): ObjectFeatures {
  const kept = aboveThreshold(detections);
  const work = largestInBucket(kept, "workSurface", width, height);
  const rest = largestInBucket(kept, "restSurface", width, height);
  const screen = largestInBucket(kept, "screen", width, height);

  return {
    objectCount: kept.length,
    clutterObjectCount: kept.filter((d) => isClutter(d.class)).length,
    hasWorkSurface: work !== null,
    hasRestSurface: rest !== null,
    workRestOverlap: work && rest ? iou(work, rest) : 0,
    screenBox: screen,
    screenLightAlignment: screenLightAlignment(screen, brightCentroid),
  };
}
