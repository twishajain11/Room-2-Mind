/** A breakpoint: an input value paired with the subscore it maps to. */
export type Breakpoint = [input: number, output: number];

/**
 * Piecewise linear interpolation between breakpoints, clamped at both ends.
 *
 * Every normalization in the product goes through this one function so that a
 * factor's shape is fully described by a list of numbers a reader can check,
 * rather than by a formula they have to trust.
 */
export function lerp(value: number, breakpoints: Breakpoint[]): number {
  if (breakpoints.length === 0) return 0;
  if (breakpoints.length === 1) return breakpoints[0][1];

  const points = [...breakpoints].sort((a, b) => a[0] - b[0]);

  if (value <= points[0][0]) return points[0][1];
  if (value >= points[points.length - 1][0]) return points[points.length - 1][1];

  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    if (value >= x0 && value <= x1) {
      if (x1 === x0) return y1;
      return y0 + ((value - x0) / (x1 - x0)) * (y1 - y0);
    }
  }

  return points[points.length - 1][1];
}

/** Clamp a subscore into the 0 to 100 range the whole scoring layer works in. */
export function clamp100(value: number): number {
  return Math.min(100, Math.max(0, value));
}
