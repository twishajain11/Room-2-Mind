import { describe, expect, it } from "vitest";
import { extractVisionFeatures } from "./extract";
import { flatGrey, verticalStripes, windowScene } from "./fixtures";
import type { Detection } from "./types";

const NONE: Detection[] = [];

describe("extractVisionFeatures", () => {
  it("returns every Section 5.1 to 5.3 key, with numbers only", () => {
    const f = extractVisionFeatures(flatGrey(), NONE);
    const expected = [
      "meanLuminance",
      "luminanceStdDev",
      "brightRegionRatio",
      "brightRegionCentroid",
      "edgeDensity",
      "paletteEntropy",
      "meanSaturation",
      "warmthRatio",
      "objectCount",
      "clutterObjectCount",
      "hasWorkSurface",
      "hasRestSurface",
      "workRestOverlap",
      "screenBox",
      "screenLightAlignment",
      "bboxScatter",
      "alignmentVariance",
    ];
    expect(Object.keys(f).sort()).toEqual(expected.sort());
  });

  it("feeds the bright-region centroid into screen alignment", () => {
    // Window bottom-right, screen top-left: the screen is not backlit.
    const px = windowScene(32, 8, 24, 24);
    const screen: Detection[] = [{ class: "tv", score: 0.9, bbox: [0, 0, 8, 8] }];
    const far = extractVisionFeatures(px, screen).screenLightAlignment!;

    // Same screen, window now behind it.
    const near = extractVisionFeatures(windowScene(32, 8, 0, 0), screen).screenLightAlignment!;
    expect(far).toBeGreaterThan(near);
  });

  it("orders a busy frame above a bare one on visual complexity", () => {
    expect(extractVisionFeatures(verticalStripes(64, 2), NONE).edgeDensity).toBeGreaterThan(
      extractVisionFeatures(flatGrey(64), NONE).edgeDensity
    );
  });

  it("holds no reference to the source buffer", () => {
    const px = flatGrey();
    const f = extractVisionFeatures(px, NONE);
    expect(JSON.stringify(f)).not.toContain("data");
  });
});
