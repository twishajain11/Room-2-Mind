/**
 * Pixel buffer shape shared by every vision function.
 *
 * Deliberately structural rather than `ImageData` so that all of `lib/vision`
 * is pure, runs in Node, and is unit testable without a DOM or canvas.
 * `data` is RGBA, 4 bytes per pixel, row major.
 */
export interface Pixels {
  data: Uint8ClampedArray | number[];
  width: number;
  height: number;
}

/** A normalized bounding box: every value is a fraction of the frame, 0 to 1. */
export interface NormalizedBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A point in normalized frame coordinates, 0 to 1 on each axis. */
export interface Point {
  x: number;
  y: number;
}

/** One COCO-SSD detection, in raw pixel coordinates as the model returns it. */
export interface Detection {
  /** COCO class name, e.g. "laptop". */
  class: string;
  /** Model confidence, 0 to 1. */
  score: number;
  /** [x, y, width, height] in pixels of the frame the model was run on. */
  bbox: [number, number, number, number];
}

/** Section 5.1 — classical CV features. */
export interface LuminanceFeatures {
  meanLuminance: number;
  luminanceStdDev: number;
  brightRegionRatio: number;
  brightRegionCentroid: Point;
}

export interface EdgeFeatures {
  edgeDensity: number;
}

export interface PaletteFeatures {
  paletteEntropy: number;
  meanSaturation: number;
  warmthRatio: number;
}

/** Section 5.2 — object features. */
export interface ObjectFeatures {
  objectCount: number;
  clutterObjectCount: number;
  hasWorkSurface: boolean;
  hasRestSurface: boolean;
  workRestOverlap: number;
  screenBox: NormalizedBox | null;
  screenLightAlignment: number | null;
}

/** Section 5.3 — spatial organization. */
export interface SpatialFeatures {
  bboxScatter: number;
  alignmentVariance: number;
}

/** The complete visual half of a snapshot's feature vector. */
export type VisionFeatures = LuminanceFeatures &
  EdgeFeatures &
  PaletteFeatures &
  ObjectFeatures &
  SpatialFeatures;
