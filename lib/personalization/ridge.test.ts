import { describe, expect, it } from "vitest";
import { fitRidge, predict, predictionStdError, rankByStrength } from "./ridge";

/** Deterministic pseudo-random source, so a failing test fails every time. */
function lcg(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/** y depends only on the first predictor, plus a little noise. */
function oneSignalDataset(rows: number, noise = 0.5) {
  const rand = lcg(42);
  const X: number[][] = [];
  const y: number[] = [];
  for (let i = 0; i < rows; i++) {
    const a = rand() * 100;
    const b = rand() * 100;
    const c = rand() * 100;
    X.push([a, b, c]);
    y.push(0.06 * a + 1 + (rand() - 0.5) * noise);
  }
  return { X, y };
}

describe("fitRidge", () => {
  it("refuses to fit when there are fewer rows than predictors", () => {
    expect(fitRidge([[1, 2, 3]], [1])).toBeNull();
    expect(
      fitRidge(
        [
          [1, 2, 3],
          [2, 3, 4],
        ],
        [1, 2]
      )
    ).toBeNull();
  });

  it("returns null rather than a fit when there is nothing to fit", () => {
    expect(fitRidge([], [])).toBeNull();
  });

  it("finds the predictor that actually drives the target", () => {
    const { X, y } = oneSignalDataset(60);
    const fit = fitRidge(X, y, 1)!;
    expect(fit).not.toBeNull();
    expect(fit.n).toBe(60);

    const ranked = rankByStrength(fit, ["signal", "noise1", "noise2"]);
    expect(ranked[0].label).toBe("signal");
    expect(Math.abs(ranked[0].coefficient)).toBeGreaterThan(
      Math.abs(ranked[1].coefficient) * 3
    );
  });

  it("explains most of the variance on a nearly clean signal", () => {
    const fit = fitRidge(...Object.values(oneSignalDataset(80, 0.1)).slice(0, 2) as [number[][], number[]], 1)!;
    expect(fit.rSquared).toBeGreaterThan(0.9);
  });

  it("drops rows with a missing predictor rather than imputing one", () => {
    const { X, y } = oneSignalDataset(40);
    const holed: Array<Array<number | null>> = X.map((r) => [...r]);
    holed[0][1] = null;
    holed[5][2] = null;

    const fit = fitRidge(holed, y, 1)!;
    expect(fit.n).toBe(38);
  });

  it("drops rows with a missing target too", () => {
    const { X, y } = oneSignalDataset(40);
    const holedY: Array<number | null> = [...y];
    holedY[3] = null;
    expect(fitRidge(X, holedY, 1)!.n).toBe(39);
  });

  it("shrinks coefficients as the penalty grows", () => {
    const { X, y } = oneSignalDataset(60);
    const light = fitRidge(X, y, 0.1)!;
    const heavy = fitRidge(X, y, 100)!;
    expect(Math.abs(heavy.coefficients[0])).toBeLessThan(Math.abs(light.coefficients[0]));
  });

  it("survives a predictor that never varies", () => {
    const rand = lcg(7);
    const X: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < 30; i++) {
      const a = rand() * 100;
      X.push([a, 50, rand() * 10]);
      y.push(0.05 * a);
    }
    const fit = fitRidge(X, y, 1)!;
    expect(fit).not.toBeNull();
    expect(Number.isFinite(fit.coefficients[1])).toBe(true);
  });

  it("reports tighter standard errors on more data", () => {
    const small = fitRidge(...(Object.values(oneSignalDataset(20)).slice(0, 2) as [number[][], number[]]), 1)!;
    const large = fitRidge(...(Object.values(oneSignalDataset(200)).slice(0, 2) as [number[][], number[]]), 1)!;
    expect(large.standardErrors[0]).toBeLessThan(small.standardErrors[0]);
  });
});

describe("predict", () => {
  it("lands close to the truth on a clean signal", () => {
    const { X, y } = oneSignalDataset(80, 0.1);
    const fit = fitRidge(X, y, 0.1)!;
    const predicted = predict(fit, [50, 50, 50]);
    expect(predicted).toBeGreaterThan(2.5);
    expect(predicted).toBeLessThan(5.5);
  });
});

describe("predictionStdError", () => {
  it("is always at least the residual spread", () => {
    const { X, y } = oneSignalDataset(60);
    const fit = fitRidge(X, y, 1)!;
    expect(predictionStdError(fit, [50, 50, 50])).toBeGreaterThanOrEqual(fit.residualStdDev);
  });

  it("widens as a row moves away from the data it was fitted on", () => {
    const { X, y } = oneSignalDataset(60);
    const fit = fitRidge(X, y, 1)!;
    const nearCentre = predictionStdError(fit, fit.means);
    const farAway = predictionStdError(fit, fit.means.map((m) => m + 500));
    expect(farAway).toBeGreaterThan(nearCentre);
  });
});
