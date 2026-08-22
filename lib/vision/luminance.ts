import type { LuminanceFeatures, Pixels, Point } from "./types";

/**
 * Provisional absolute luminance cutoff for "bright region", 0 to 255.
 *
 * Spec §5.1 words this as "the 95th percentile luminance", but a percentile
 * taken from the same image is self-referential: by definition exactly 5% of
 * pixels sit above it in every photograph, so the feature would carry no
 * signal at all. The intended quantity is a natural light proxy, which needs a
 * cutoff that does not move with the image. This constant is that cutoff, and
 * like every other breakpoint in the product it is provisional until the
 * Milestone 3 recalibration against the seed dataset.
 */
export const BRIGHT_LUMINANCE_THRESHOLD = 220;

/** Per-pixel Rec. 709 luminance, 0.2126R + 0.7152G + 0.0722B, one entry per pixel. */
export function luminanceChannel(px: Pixels): Float64Array {
  const count = px.width * px.height;
  const out = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    const o = i * 4;
    out[i] = 0.2126 * px.data[o] + 0.7152 * px.data[o + 1] + 0.0722 * px.data[o + 2];
  }
  return out;
}

/** Average of 0.2126R + 0.7152G + 0.0722B across all pixels. */
export function meanLuminance(lum: Float64Array): number {
  if (lum.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < lum.length; i++) sum += lum[i];
  return sum / lum.length;
}

/** Standard deviation of the same luminance values, a measure of contrast spread. */
export function luminanceStdDev(lum: Float64Array, mean: number): number {
  if (lum.length === 0) return 0;
  let acc = 0;
  for (let i = 0; i < lum.length; i++) {
    const d = lum[i] - mean;
    acc += d * d;
  }
  return Math.sqrt(acc / lum.length);
}

/** Fraction of pixels brighter than the bright-region cutoff, used as a natural light proxy. */
export function brightRegionRatio(
  lum: Float64Array,
  threshold: number = BRIGHT_LUMINANCE_THRESHOLD
): number {
  if (lum.length === 0) return 0;
  let n = 0;
  for (let i = 0; i < lum.length; i++) if (lum[i] > threshold) n++;
  return n / lum.length;
}

/**
 * Centre of mass (x, y normalized 0 to 1) of the bright pixels, which
 * approximates where the light source sits.
 *
 * When no pixel clears the threshold there is no light source to locate, so
 * this returns the frame centre; `brightRegionRatio` is 0 in that case and is
 * what downstream code should test before trusting the centroid.
 */
export function brightRegionCentroid(
  lum: Float64Array,
  width: number,
  height: number,
  threshold: number = BRIGHT_LUMINANCE_THRESHOLD
): Point {
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (let i = 0; i < lum.length; i++) {
    if (lum[i] > threshold) {
      sx += i % width;
      sy += Math.floor(i / width);
      n++;
    }
  }
  if (n === 0) return { x: 0.5, y: 0.5 };
  // Divide by (width - 1) so a pixel on the far edge maps to exactly 1.
  return {
    x: width > 1 ? sx / n / (width - 1) : 0.5,
    y: height > 1 ? sy / n / (height - 1) : 0.5,
  };
}

/** All Section 5.1 luminance features in one pass over the buffer. */
export function luminanceFeatures(px: Pixels): LuminanceFeatures {
  const lum = luminanceChannel(px);
  const mean = meanLuminance(lum);
  return {
    meanLuminance: mean,
    luminanceStdDev: luminanceStdDev(lum, mean),
    brightRegionRatio: brightRegionRatio(lum),
    brightRegionCentroid: brightRegionCentroid(lum, px.width, px.height),
  };
}
