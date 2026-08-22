import type { EdgeFeatures, Pixels } from "./types";
import { luminanceChannel } from "./luminance";

/**
 * Divisor that turns a raw Sobel magnitude into the 0 to 1 range.
 *
 * A 3x3 Sobel on 8-bit data can in principle reach 1442, but that maximum only
 * occurs at a full black-to-white step across the whole kernel, so normalizing
 * by it would crush every real photograph into the bottom two percent of the
 * range. Dividing by 255 and clamping keeps ordinary room photos inside the
 * 0.02 to 0.30 band the §6.1 clutter breakpoints are written against.
 */
export const SOBEL_NORMALIZER = 255;

/** Mean Sobel gradient magnitude over the grayscale image, the standard proxy for visual complexity. */
export function edgeDensity(px: Pixels): number {
  const { width, height } = px;
  if (width < 3 || height < 3) return 0;

  const lum = luminanceChannel(px);
  let sum = 0;
  let n = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const tl = lum[i - width - 1];
      const tc = lum[i - width];
      const tr = lum[i - width + 1];
      const ml = lum[i - 1];
      const mr = lum[i + 1];
      const bl = lum[i + width - 1];
      const bc = lum[i + width];
      const br = lum[i + width + 1];

      const gx = tl + 2 * ml + bl - (tr + 2 * mr + br);
      const gy = tl + 2 * tc + tr - (bl + 2 * bc + br);

      sum += Math.min(Math.hypot(gx, gy) / SOBEL_NORMALIZER, 1);
      n++;
    }
  }

  return n === 0 ? 0 : sum / n;
}

export function edgeFeatures(px: Pixels): EdgeFeatures {
  return { edgeDensity: edgeDensity(px) };
}
