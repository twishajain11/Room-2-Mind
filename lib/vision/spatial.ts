import type { Detection, SpatialFeatures } from "./types";
import { aboveThreshold, normalizeBox, boxCentre } from "./objects";

function variance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / values.length;
}

/**
 * Standard deviation of all detection centre points, where higher means objects
 * are spread across the whole frame rather than grouped.
 *
 * Spread is two dimensional, so the per-axis variances are summed and rooted:
 * that is the RMS distance of the centres from their own mean, one number that
 * grows when objects scatter on either axis.
 */
export function bboxScatter(detections: Detection[], width: number, height: number): number {
  const kept = aboveThreshold(detections);
  if (kept.length < 2) return 0;
  const centres = kept.map((d) => boxCentre(normalizeBox(d, width, height)));
  return Math.sqrt(variance(centres.map((c) => c.x)) + variance(centres.map((c) => c.y)));
}

/**
 * Variance of detection bounding box bottom edge y values, where lower means
 * objects sit on shared surfaces rather than scattered at random heights.
 */
export function alignmentVariance(detections: Detection[], width: number, height: number): number {
  const kept = aboveThreshold(detections);
  if (kept.length < 2) return 0;
  const bottoms = kept.map((d) => {
    const b = normalizeBox(d, width, height);
    return b.y + b.height;
  });
  return variance(bottoms);
}

export function spatialFeatures(
  detections: Detection[],
  width: number,
  height: number
): SpatialFeatures {
  return {
    bboxScatter: bboxScatter(detections, width, height),
    alignmentVariance: alignmentVariance(detections, width, height),
  };
}
