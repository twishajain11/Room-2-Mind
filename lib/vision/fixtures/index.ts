import type { Pixels } from "../types";

/**
 * Synthetic fixture images.
 *
 * These are generated rather than checked in as photographs because every
 * Section 5.1 feature has a known closed-form value on a constructed field, so
 * the tests can assert the actual number instead of a regression snapshot. Real
 * room photographs are used at the calibration stage, not the unit test stage.
 */

export function blank(width: number, height: number, rgb: [number, number, number]): Pixels {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = rgb[0];
    data[i * 4 + 1] = rgb[1];
    data[i * 4 + 2] = rgb[2];
    data[i * 4 + 3] = 255;
  }
  return { data, width, height };
}

/** Mid grey field: zero contrast, zero edges, one colour. */
export function flatGrey(size = 32): Pixels {
  return blank(size, size, [128, 128, 128]);
}

/** Alternating black and white pixels: the maximum-edge case. */
export function checkerboard(size = 32): Pixels {
  const px = blank(size, size, [0, 0, 0]);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if ((x + y) % 2 === 0) {
        const o = (y * size + x) * 4;
        px.data[o] = 255;
        px.data[o + 1] = 255;
        px.data[o + 2] = 255;
      }
    }
  }
  return px;
}

/** Dark room with a bright square standing in for a window, placed by fraction. */
export function windowScene(
  size = 32,
  windowSize = 8,
  originX = 0,
  originY = 0
): Pixels {
  const px = blank(size, size, [20, 20, 20]);
  for (let y = originY; y < originY + windowSize; y++) {
    for (let x = originX; x < originX + windowSize; x++) {
      const o = (y * size + x) * 4;
      px.data[o] = 255;
      px.data[o + 1] = 255;
      px.data[o + 2] = 255;
    }
  }
  return px;
}

/** Vertical bands of n distinct colours in equal proportion. */
export function colourBands(colours: Array<[number, number, number]>, size = 40): Pixels {
  const px = blank(size, size, [0, 0, 0]);
  const bandWidth = size / colours.length;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const c = colours[Math.min(colours.length - 1, Math.floor(x / bandWidth))];
      const o = (y * size + x) * 4;
      px.data[o] = c[0];
      px.data[o + 1] = c[1];
      px.data[o + 2] = c[2];
    }
  }
  return px;
}

/** Vertical black and white stripes of a given band width, in pixels. */
export function verticalStripes(size = 32, bandWidth = 4): Pixels {
  const px = blank(size, size, [0, 0, 0]);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (Math.floor(x / bandWidth) % 2 === 0) {
        const o = (y * size + x) * 4;
        px.data[o] = 255;
        px.data[o + 1] = 255;
        px.data[o + 2] = 255;
      }
    }
  }
  return px;
}

/** A single hard vertical edge down the middle of the frame. */
export function halfSplit(size = 32): Pixels {
  const px = blank(size, size, [0, 0, 0]);
  for (let y = 0; y < size; y++) {
    for (let x = size / 2; x < size; x++) {
      const o = (y * size + x) * 4;
      px.data[o] = 255;
      px.data[o + 1] = 255;
      px.data[o + 2] = 255;
    }
  }
  return px;
}
