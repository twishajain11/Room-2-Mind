/**
 * Ridge regression, written out rather than pulled in.
 *
 * Six predictors and at most a hundred rows: this is small enough that a
 * dependency would cost more to explain than the arithmetic does. Every step
 * below is a step a reader can check, which is the same standard the vision
 * features are held to.
 */

export interface RidgeFit {
  /** One coefficient per predictor, in the order the columns were given. */
  coefficients: number[];
  intercept: number;
  /** Standard error of each coefficient, for the §8.2 uncertainty bands. */
  standardErrors: number[];
  /** Rows actually used, after dropping incomplete ones. */
  n: number;
  /** Predictors used. */
  k: number;
  /** Residual standard deviation, the spread of the prediction itself. */
  residualStdDev: number;
  rSquared: number;
  /** Column means and standard deviations, needed to score a new row. */
  means: number[];
  stdDevs: number[];
  lambda: number;
}

/** Multiply two matrices. */
function matmul(a: number[][], b: number[][]): number[][] {
  const rows = a.length;
  const inner = b.length;
  const cols = b[0].length;
  const out: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let i = 0; i < rows; i++) {
    for (let k = 0; k < inner; k++) {
      const aik = a[i][k];
      if (aik === 0) continue;
      for (let j = 0; j < cols; j++) out[i][j] += aik * b[k][j];
    }
  }
  return out;
}

function transpose(a: number[][]): number[][] {
  return a[0].map((_, j) => a.map((row) => row[j]));
}

/**
 * Invert a square matrix by Gauss-Jordan elimination with partial pivoting.
 *
 * Returns null when the matrix is singular, which the caller treats as "not
 * enough independent data to fit" rather than crashing.
 */
function invert(m: number[][]): number[][] | null {
  const n = m.length;
  const a = m.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);

  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
    }
    if (Math.abs(a[pivot][col]) < 1e-12) return null;
    [a[col], a[pivot]] = [a[pivot], a[col]];

    const d = a[col][col];
    for (let j = 0; j < 2 * n; j++) a[col][j] /= d;

    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = a[r][col];
      if (factor === 0) continue;
      for (let j = 0; j < 2 * n; j++) a[r][j] -= factor * a[col][j];
    }
  }

  return a.map((row) => row.slice(n));
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/**
 * Fit `y` from `X` with an L2 penalty.
 *
 * Rows containing a null in either `X` or `y` are dropped whole: with six
 * correlated predictors and a handful of rows, imputing a missing subscore
 * would invent exactly the signal the regression is meant to find. `n` in the
 * result is the count after dropping, and it is the number the UI must show.
 *
 * Predictors are standardized before fitting so the penalty falls on each one
 * equally, then coefficients are returned on the standardized scale, which is
 * also the scale on which they can be compared to each other.
 */
export function fitRidge(
  X: Array<Array<number | null>>,
  y: Array<number | null>,
  lambda = 1
): RidgeFit | null {
  const rows: number[][] = [];
  const targets: number[] = [];

  for (let i = 0; i < X.length; i++) {
    const row = X[i];
    const target = y[i];
    if (target === null || target === undefined) continue;
    if (row.some((v) => v === null || v === undefined || !Number.isFinite(v))) continue;
    rows.push(row as number[]);
    targets.push(target);
  }

  const n = rows.length;
  if (n === 0) return null;
  const k = rows[0].length;
  // With fewer rows than predictors the fit is not identified even with a
  // penalty holding it together, and reporting one would be dishonest.
  if (n <= k) return null;

  const means: number[] = [];
  const stdDevs: number[] = [];
  for (let j = 0; j < k; j++) {
    const col = rows.map((r) => r[j]);
    const m = mean(col);
    const sd = Math.sqrt(mean(col.map((v) => (v - m) * (v - m))));
    means.push(m);
    // A predictor that never varies carries no information; giving it sd 1
    // leaves its standardized column at zero rather than dividing by zero.
    stdDevs.push(sd < 1e-9 ? 1 : sd);
  }

  const Z = rows.map((r) => r.map((v, j) => (v - means[j]) / stdDevs[j]));
  const yMean = mean(targets);
  const yCentred = targets.map((v) => v - yMean);

  const Zt = transpose(Z);
  const ZtZ = matmul(Zt, Z);
  const penalised = ZtZ.map((row, i) => row.map((v, j) => (i === j ? v + lambda : v)));

  const inverse = invert(penalised);
  if (!inverse) return null;

  const Zty = matmul(Zt, yCentred.map((v) => [v]));
  const beta = matmul(inverse, Zty).map((r) => r[0]);

  const predictions = Z.map((row) => row.reduce((acc, v, j) => acc + v * beta[j], 0) + yMean);
  const residuals = targets.map((v, i) => v - predictions[i]);
  const rss = residuals.reduce((a, r) => a + r * r, 0);
  const tss = yCentred.reduce((a, v) => a + v * v, 0);

  // Degrees of freedom charged as k, which slightly overstates what ridge
  // actually spends; the effect is to widen the bands rather than narrow them,
  // and erring wide is the honest direction for an interval.
  const dof = Math.max(1, n - k - 1);
  const sigmaSquared = rss / dof;

  // Ridge's sandwich: (Z'Z + lambda I)^-1 Z'Z (Z'Z + lambda I)^-1, scaled by
  // the residual variance.
  const sandwich = matmul(matmul(inverse, ZtZ), inverse);
  const standardErrors = sandwich.map((row, i) => Math.sqrt(Math.max(0, sigmaSquared * row[i])));

  return {
    coefficients: beta,
    intercept: yMean,
    standardErrors,
    n,
    k,
    residualStdDev: Math.sqrt(sigmaSquared),
    rSquared: tss <= 0 ? 0 : Math.max(0, 1 - rss / tss),
    means,
    stdDevs,
    lambda,
  };
}

/** Predict a target for one row of raw predictors, using a fit's own scaling. */
export function predict(fit: RidgeFit, row: number[]): number {
  return (
    fit.intercept +
    row.reduce((acc, v, j) => acc + ((v - fit.means[j]) / fit.stdDevs[j]) * fit.coefficients[j], 0)
  );
}

/**
 * Standard error of a single prediction.
 *
 * Wider than the coefficient errors alone, because predicting one new
 * observation carries the residual spread as well as the uncertainty in where
 * the line sits. This is the number the §8.2 band is drawn from.
 */
export function predictionStdError(fit: RidgeFit, row: number[]): number {
  const scaled = row.map((v, j) => (v - fit.means[j]) / fit.stdDevs[j]);
  const fromCoefficients = scaled.reduce(
    (acc, z, j) => acc + (z * fit.standardErrors[j]) * (z * fit.standardErrors[j]),
    0
  );
  return Math.sqrt(fromCoefficients + fit.residualStdDev * fit.residualStdDev);
}

/** Rank predictors by absolute standardized coefficient, strongest first. */
export function rankByStrength(
  fit: RidgeFit,
  labels: string[]
): Array<{ label: string; coefficient: number; standardError: number; index: number }> {
  return fit.coefficients
    .map((coefficient, index) => ({
      label: labels[index] ?? `predictor ${index}`,
      coefficient,
      standardError: fit.standardErrors[index],
      index,
    }))
    .sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient));
}
