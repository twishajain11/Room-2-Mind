import { describe, expect, it } from "vitest";
import { meanSaturation, paletteEntropy, warmthRatio, PALETTE_CLUSTERS } from "./palette";
import { blank, colourBands, flatGrey } from "./fixtures";

describe("paletteEntropy", () => {
  it("is zero when the whole frame is one colour", () => {
    expect(paletteEntropy(flatGrey())).toBeCloseTo(0, 6);
  });

  it("approaches log2(5) when five distinct colours share the frame equally", () => {
    const px = colourBands([
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
      [255, 255, 0],
      [255, 255, 255],
    ]);
    expect(paletteEntropy(px)).toBeCloseTo(Math.log2(PALETTE_CLUSTERS), 2);
  });

  it("scores a two-colour frame below a five-colour one", () => {
    const two = paletteEntropy(colourBands([[10, 10, 10], [240, 240, 240]]));
    const five = paletteEntropy(
      colourBands([
        [255, 0, 0],
        [0, 255, 0],
        [0, 0, 255],
        [255, 255, 0],
        [255, 255, 255],
      ])
    );
    expect(two).toBeLessThan(five);
  });

  it("returns the same value for the same image every time", () => {
    const px = colourBands([
      [200, 30, 30],
      [30, 200, 30],
      [30, 30, 200],
    ]);
    expect(paletteEntropy(px)).toBe(paletteEntropy(px));
  });
});

describe("meanSaturation", () => {
  it("is zero on any grey", () => {
    expect(meanSaturation(flatGrey())).toBeCloseTo(0, 6);
  });

  it("is one on a fully saturated primary", () => {
    expect(meanSaturation(blank(8, 8, [255, 0, 0]))).toBeCloseTo(1, 6);
  });

  it("is zero on pure black, where saturation is undefined", () => {
    expect(meanSaturation(blank(8, 8, [0, 0, 0]))).toBe(0);
  });
});

describe("warmthRatio", () => {
  it("is one on a neutral grey", () => {
    expect(warmthRatio(flatGrey())).toBeCloseTo(1, 6);
  });

  it("is above one when red dominates blue", () => {
    expect(warmthRatio(blank(8, 8, [200, 100, 100]))).toBeCloseTo(2, 6);
  });

  it("is below one when blue dominates red", () => {
    expect(warmthRatio(blank(8, 8, [100, 100, 200]))).toBeCloseTo(0.5, 6);
  });

  it("stays finite when there is no blue at all", () => {
    expect(Number.isFinite(warmthRatio(blank(8, 8, [255, 0, 0])))).toBe(true);
  });
});
