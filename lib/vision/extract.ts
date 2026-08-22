import type { Detection, Pixels, VisionFeatures } from "./types";
import { luminanceFeatures } from "./luminance";
import { edgeFeatures } from "./edges";
import { paletteFeatures } from "./palette";
import { objectFeatures } from "./objects";
import { spatialFeatures } from "./spatial";

/**
 * Orchestrator for the visual channel.
 *
 * Pure by design: it takes a pixel buffer and a detection list and returns
 * numbers. It never touches the DOM, never holds a reference to the source
 * image, and has nothing to dispose. Everything that owns raw media lives in
 * `lib/vision/capture.ts`, which is the only place a buffer has to be released.
 */
export function extractVisionFeatures(px: Pixels, detections: Detection[]): VisionFeatures {
  const lum = luminanceFeatures(px);
  return {
    ...lum,
    ...edgeFeatures(px),
    ...paletteFeatures(px),
    ...objectFeatures(detections, px.width, px.height, lum.brightRegionCentroid),
    ...spatialFeatures(detections, px.width, px.height),
  };
}
