import { describe, expect, it } from "vitest";
import { alignmentVariance, bboxScatter } from "./spatial";
import type { Detection } from "./types";

const W = 100;
const H = 100;

function det(cls: string, bbox: [number, number, number, number]): Detection {
  return { class: cls, score: 0.9, bbox };
}

describe("bboxScatter", () => {
  it("is zero when there is nothing to compare", () => {
    expect(bboxScatter([], W, H)).toBe(0);
    expect(bboxScatter([det("cup", [0, 0, 10, 10])], W, H)).toBe(0);
  });

  it("is larger when objects sit in opposite corners than when they are grouped", () => {
    const grouped = bboxScatter(
      [det("cup", [40, 40, 10, 10]), det("book", [50, 50, 10, 10])],
      W,
      H
    );
    const spread = bboxScatter([det("cup", [0, 0, 10, 10]), det("book", [90, 90, 10, 10])], W, H);
    expect(spread).toBeGreaterThan(grouped);
  });
});

describe("alignmentVariance", () => {
  it("is zero when every object shares a bottom edge", () => {
    const onOneSurface = alignmentVariance(
      [det("cup", [10, 40, 10, 20]), det("book", [50, 30, 10, 30])],
      W,
      H
    );
    expect(onOneSurface).toBeCloseTo(0, 9);
  });

  it("rises when objects sit at unrelated heights", () => {
    const scattered = alignmentVariance(
      [det("cup", [10, 0, 10, 10]), det("book", [50, 80, 10, 10])],
      W,
      H
    );
    expect(scattered).toBeGreaterThan(0);
  });
});
