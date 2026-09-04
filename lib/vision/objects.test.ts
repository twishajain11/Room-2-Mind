import { describe, expect, it } from "vitest";
import {
  DETECTION_CONFIDENCE_THRESHOLD,
  aboveThreshold,
  inBucket,
  iou,
  isClutter,
  objectFeatures,
  screenLightAlignment,
} from "./objects";
import type { Detection } from "./types";

const CENTRE = { x: 0.5, y: 0.5 };

function det(cls: string, bbox: [number, number, number, number], score = 0.9): Detection {
  return { class: cls, score, bbox };
}

describe("bucketing", () => {
  it("puts a laptop in both the work surface and the screen bucket", () => {
    expect(inBucket("laptop", "workSurface")).toBe(true);
    expect(inBucket("laptop", "screen")).toBe(true);
  });

  it("does not count a bucketed object as clutter", () => {
    expect(isClutter("laptop")).toBe(false);
    expect(isClutter("bed")).toBe(false);
    expect(isClutter("book")).toBe(true);
    expect(isClutter("cup")).toBe(true);
  });

  it("does not count room furniture or fixtures as clutter", () => {
    // Regression: a real office photo flagged its chairs as loose objects and
    // told the user to clear them. Furniture is the room, not clutter on it.
    expect(isClutter("chair")).toBe(false);
    expect(isClutter("potted plant")).toBe(false);
    expect(isClutter("refrigerator")).toBe(false);
    // Portable pile-up items are still clutter.
    expect(isClutter("bottle")).toBe(true);
    expect(isClutter("backpack")).toBe(true);
  });

  it("drops detections below the confidence threshold", () => {
    const kept = aboveThreshold([det("cup", [0, 0, 10, 10], 0.39), det("book", [0, 0, 10, 10], 0.41)]);
    expect(kept.map((d) => d.class)).toEqual(["book"]);
    expect(DETECTION_CONFIDENCE_THRESHOLD).toBe(0.4);
  });
});

describe("iou", () => {
  it("is one for identical boxes", () => {
    const b = { x: 0, y: 0, width: 0.5, height: 0.5 };
    expect(iou(b, b)).toBeCloseTo(1, 9);
  });

  it("is zero for disjoint boxes", () => {
    expect(
      iou({ x: 0, y: 0, width: 0.2, height: 0.2 }, { x: 0.5, y: 0.5, width: 0.2, height: 0.2 })
    ).toBe(0);
  });

  it("is one third for boxes sharing half their area", () => {
    const a = { x: 0, y: 0, width: 1, height: 1 };
    const b = { x: 0.5, y: 0, width: 1, height: 1 };
    expect(iou(a, b)).toBeCloseTo(0.5 / 1.5, 9);
  });
});

describe("objectFeatures", () => {
  const W = 100;
  const H = 100;

  it("counts clutter separately from total detections", () => {
    const f = objectFeatures(
      [det("laptop", [10, 10, 20, 20]), det("cup", [40, 40, 5, 5]), det("book", [50, 50, 5, 5])],
      W,
      H,
      CENTRE
    );
    expect(f.objectCount).toBe(3);
    expect(f.clutterObjectCount).toBe(2);
  });

  it("reports zero work-rest overlap when only one of the two is present", () => {
    const f = objectFeatures([det("laptop", [10, 10, 20, 20])], W, H, CENTRE);
    expect(f.hasWorkSurface).toBe(true);
    expect(f.hasRestSurface).toBe(false);
    expect(f.workRestOverlap).toBe(0);
  });

  it("scores a laptop sitting on a bed as high work-rest overlap", () => {
    const f = objectFeatures(
      [det("bed", [0, 0, 100, 100]), det("laptop", [0, 0, 100, 100])],
      W,
      H,
      CENTRE
    );
    expect(f.hasWorkSurface).toBe(true);
    expect(f.hasRestSurface).toBe(true);
    expect(f.workRestOverlap).toBeCloseTo(1, 9);
  });

  it("picks the largest screen when several are detected", () => {
    const f = objectFeatures(
      [det("cell phone", [0, 0, 5, 5]), det("tv", [20, 20, 60, 40])],
      W,
      H,
      CENTRE
    );
    expect(f.screenBox).toEqual({ x: 0.2, y: 0.2, width: 0.6, height: 0.4 });
  });

  it("leaves screen alignment null when no screen is present", () => {
    const f = objectFeatures([det("cup", [0, 0, 5, 5])], W, H, CENTRE);
    expect(f.screenBox).toBeNull();
    expect(f.screenLightAlignment).toBeNull();
  });

  it("reports a small distance when the screen sits on the light source", () => {
    const backlit = screenLightAlignment({ x: 0.4, y: 0.4, width: 0.2, height: 0.2 }, CENTRE);
    const sidelit = screenLightAlignment({ x: 0.0, y: 0.0, width: 0.2, height: 0.2 }, CENTRE);
    expect(backlit).toBeCloseTo(0, 9);
    expect(sidelit!).toBeGreaterThan(backlit!);
  });
});
