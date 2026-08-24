import type { VisionFeatures } from "../types";

/**
 * A neutral, unremarkable room as a feature vector.
 *
 * Every scoring test starts from this and overrides only the feature it is
 * about, so a test that claims "clutter raises the score" is not quietly also
 * changing the lighting.
 */
export function makeVisionFeatures(overrides: Partial<VisionFeatures> = {}): VisionFeatures {
  return {
    meanLuminance: 140,
    luminanceStdDev: 40,
    brightRegionRatio: 0.05,
    brightRegionCentroid: { x: 0.5, y: 0.5 },
    edgeDensity: 0.1,
    paletteEntropy: 1.4,
    meanSaturation: 0.25,
    warmthRatio: 1.15,
    objectCount: 3,
    clutterObjectCount: 3,
    hasWorkSurface: true,
    hasRestSurface: false,
    workRestOverlap: 0,
    screenBox: { x: 0.3, y: 0.3, width: 0.3, height: 0.25 },
    screenLightAlignment: 0.4,
    bboxScatter: 0.2,
    alignmentVariance: 0.02,
    ...overrides,
  };
}
