import type { PaletteFeatures, Pixels } from "./types";

/** Cluster count for the palette k-means, fixed by spec §5.1 so entropy tops out at log2(5). */
export const PALETTE_CLUSTERS = 5;

/** Iterations of Lloyd's algorithm; fixed rather than convergence-tested to keep runtime deterministic. */
export const PALETTE_ITERATIONS = 10;

/** Upper bound on pixels fed to k-means; the image is strided down to this many. */
export const PALETTE_SAMPLE_CAP = 20000;

type RGB = [number, number, number];

/** Evenly strided subsample of the image as RGB triples, so cost does not scale with resolution. */
function sampleRgb(px: Pixels, cap: number): RGB[] {
  const total = px.width * px.height;
  const stride = Math.max(1, Math.ceil(total / cap));
  const out: RGB[] = [];
  for (let i = 0; i < total; i += stride) {
    const o = i * 4;
    out.push([px.data[o], px.data[o + 1], px.data[o + 2]]);
  }
  return out;
}

/**
 * Deterministic seeding: sort the sample by luminance and take five fixed
 * quantiles. k-means++ would seed better on average but uses randomness, and a
 * feature that returns a different number for the same photo twice cannot be
 * explained to a judge.
 */
function seedCentroids(sample: RGB[]): RGB[] {
  const byLuma = [...sample].sort(
    (a, b) =>
      0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2] - (0.2126 * b[0] + 0.7152 * b[1] + 0.0722 * b[2])
  );
  const quantiles = [0.1, 0.3, 0.5, 0.7, 0.9];
  return quantiles.map((q) => {
    const idx = Math.min(byLuma.length - 1, Math.floor(q * byLuma.length));
    return [...byLuma[idx]] as RGB;
  });
}

/** Cluster sample colours into five groups and return how many pixels landed in each. */
export function kMeansPopulations(sample: RGB[], k = PALETTE_CLUSTERS): number[] {
  if (sample.length === 0) return new Array(k).fill(0);

  let centroids = seedCentroids(sample);
  const assign = new Int32Array(sample.length);

  for (let iter = 0; iter < PALETTE_ITERATIONS; iter++) {
    let moved = false;
    for (let i = 0; i < sample.length; i++) {
      const [r, g, b] = sample[i];
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < centroids.length; c++) {
        const dr = r - centroids[c][0];
        const dg = g - centroids[c][1];
        const db = b - centroids[c][2];
        const d = dr * dr + dg * dg + db * db;
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      if (assign[i] !== best) {
        assign[i] = best;
        moved = true;
      }
    }

    const sums = centroids.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < sample.length; i++) {
      const s = sums[assign[i]];
      s[0] += sample[i][0];
      s[1] += sample[i][1];
      s[2] += sample[i][2];
      s[3] += 1;
    }
    // An emptied cluster keeps its previous centroid rather than being reseeded,
    // which would reintroduce nondeterminism.
    centroids = centroids.map((c, idx) =>
      sums[idx][3] === 0
        ? c
        : ([sums[idx][0] / sums[idx][3], sums[idx][1] / sums[idx][3], sums[idx][2] / sums[idx][3]] as RGB)
    );

    if (!moved && iter > 0) break;
  }

  const populations = new Array(k).fill(0);
  for (let i = 0; i < sample.length; i++) populations[assign[i]]++;
  return populations;
}

/** Shannon entropy over a 5 cluster k-means of pixel colours in RGB space. */
export function paletteEntropy(px: Pixels): number {
  const populations = kMeansPopulations(sampleRgb(px, PALETTE_SAMPLE_CAP));
  const total = populations.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  let h = 0;
  for (const n of populations) {
    if (n === 0) continue;
    const p = n / total;
    h -= p * Math.log2(p);
  }
  return h;
}

/** Average HSV saturation across all pixels, where saturation is (max - min) / max. */
export function meanSaturation(px: Pixels): number {
  const count = px.width * px.height;
  if (count === 0) return 0;
  let sum = 0;
  for (let i = 0; i < count; i++) {
    const o = i * 4;
    const r = px.data[o];
    const g = px.data[o + 1];
    const b = px.data[o + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    sum += max === 0 ? 0 : (max - min) / max;
  }
  return sum / count;
}

/** Ratio of mean red channel to mean blue channel. */
export function warmthRatio(px: Pixels): number {
  const count = px.width * px.height;
  if (count === 0) return 1;
  let r = 0;
  let b = 0;
  for (let i = 0; i < count; i++) {
    r += px.data[i * 4];
    b += px.data[i * 4 + 2];
  }
  // Floor the denominator at one channel step so a fully blue-free image
  // returns a large finite ratio instead of Infinity.
  return r / count / Math.max(b / count, 1);
}

export function paletteFeatures(px: Pixels): PaletteFeatures {
  return {
    paletteEntropy: paletteEntropy(px),
    meanSaturation: meanSaturation(px),
    warmthRatio: warmthRatio(px),
  };
}
