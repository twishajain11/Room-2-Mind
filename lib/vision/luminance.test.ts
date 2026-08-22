import { describe, expect, it } from "vitest";
import {
  BRIGHT_LUMINANCE_THRESHOLD,
  brightRegionCentroid,
  brightRegionRatio,
  luminanceChannel,
  luminanceFeatures,
} from "./luminance";
import { blank, flatGrey, windowScene } from "./fixtures";

describe("luminance", () => {
  it("averages a flat grey field to its own value with no spread", () => {
    const f = luminanceFeatures(flatGrey());
    expect(f.meanLuminance).toBeCloseTo(128, 6);
    expect(f.luminanceStdDev).toBeCloseTo(0, 6);
  });

  it("applies Rec. 709 coefficients rather than a flat channel average", () => {
    // Pure green is the heaviest channel at 0.7152.
    const lum = luminanceChannel(blank(4, 4, [0, 255, 0]));
    expect(lum[0]).toBeCloseTo(0.7152 * 255, 6);
  });

  it("measures contrast spread on a half-black half-white field", () => {
    const px = blank(2, 1, [0, 0, 0]);
    px.data[4] = 255;
    px.data[5] = 255;
    px.data[6] = 255;
    const f = luminanceFeatures(px);
    expect(f.meanLuminance).toBeCloseTo(127.5, 6);
    expect(f.luminanceStdDev).toBeCloseTo(127.5, 6);
  });

  it("reports the bright-pixel fraction, not a fixed 5 percent", () => {
    // 8x8 bright square inside 32x32 is 64/1024 of the frame.
    const lum = luminanceChannel(windowScene());
    expect(brightRegionRatio(lum)).toBeCloseTo(64 / 1024, 6);

    // A uniformly bright room has almost all of its pixels above the cutoff,
    // which a self-referential percentile could never report.
    const bright = luminanceChannel(blank(8, 8, [250, 250, 250]));
    expect(brightRegionRatio(bright)).toBe(1);
  });

  it("locates the light source at the centre of mass of the bright pixels", () => {
    const px = windowScene(32, 8, 0, 0);
    const lum = luminanceChannel(px);
    const c = brightRegionCentroid(lum, 32, 32);
    // Bright block spans indices 0..7 on both axes, mean 3.5, over 31 steps.
    expect(c.x).toBeCloseTo(3.5 / 31, 6);
    expect(c.y).toBeCloseTo(3.5 / 31, 6);

    const right = brightRegionCentroid(luminanceChannel(windowScene(32, 8, 24, 24)), 32, 32);
    expect(right.x).toBeCloseTo(27.5 / 31, 6);
    expect(right.y).toBeCloseTo(27.5 / 31, 6);
  });

  it("falls back to the frame centre when nothing clears the cutoff", () => {
    const lum = luminanceChannel(blank(8, 8, [10, 10, 10]));
    expect(brightRegionRatio(lum)).toBe(0);
    expect(brightRegionCentroid(lum, 8, 8)).toEqual({ x: 0.5, y: 0.5 });
  });

  it("keeps the cutoff inside the 8-bit range", () => {
    expect(BRIGHT_LUMINANCE_THRESHOLD).toBeGreaterThan(0);
    expect(BRIGHT_LUMINANCE_THRESHOLD).toBeLessThan(255);
  });
});
