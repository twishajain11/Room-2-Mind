import { describe, expect, it } from "vitest";
import { computeEli, eliBand } from "./eli";
import { STANDARD_WEIGHTS, RECOVERY_WEIGHTS, type Subscores } from "./weights";

function subs(overrides: Partial<Subscores> = {}): Subscores {
  return {
    visualClutter: 50,
    acousticLoad: 50,
    workspaceSeparation: 50,
    lighting: 50,
    screenPositioning: 50,
    colourEnvironment: 50,
    ...overrides,
  };
}

describe("computeEli", () => {
  it("returns the common value when every factor agrees", () => {
    expect(computeEli(subs(), STANDARD_WEIGHTS).eli).toBeCloseTo(50, 9);
  });

  it("is a weighted mean a reader can check by hand", () => {
    const result = computeEli(
      subs({ visualClutter: 100, acousticLoad: 0, workspaceSeparation: 0, lighting: 0, screenPositioning: 0, colourEnvironment: 0 }),
      STANDARD_WEIGHTS
    );
    // 0.25 * 100 / 1.00
    expect(result.eli).toBeCloseTo(25, 9);
  });

  it("drops a null factor from the numerator and the denominator alike", () => {
    const result = computeEli(subs({ acousticLoad: null }), STANDARD_WEIGHTS);
    expect(result.skipped).toEqual(["acousticLoad"]);
    expect(result.weightSum).toBeCloseTo(0.75, 9);
    // Every remaining factor is 50, so the score is still 50, not dragged down
    // by a missing channel being treated as zero.
    expect(result.eli).toBeCloseTo(50, 9);
  });

  it("does not let a missing channel look like a good one", () => {
    const quiet = computeEli(subs({ acousticLoad: 0 }), STANDARD_WEIGHTS).eli;
    const unknown = computeEli(subs({ acousticLoad: null }), STANDARD_WEIGHTS).eli;
    expect(quiet).toBeLessThan(unknown);
  });

  it("contributions sum to the score itself", () => {
    const result = computeEli(
      subs({ visualClutter: 80, lighting: 20, colourEnvironment: 10 }),
      STANDARD_WEIGHTS
    );
    const summed = result.terms.reduce((a, t) => a + t.contribution, 0);
    expect(summed).toBeCloseTo(result.eli, 9);
  });

  it("orders terms by how much of the score they explain", () => {
    const result = computeEli(subs({ visualClutter: 100, colourEnvironment: 100 }), STANDARD_WEIGHTS);
    expect(result.terms[0].factor).toBe("visualClutter");
  });

  it("moves the score toward light and sound in Recovery Mode", () => {
    const brightAndLoud = subs({ lighting: 100, acousticLoad: 100, visualClutter: 0, workspaceSeparation: 0, screenPositioning: 0, colourEnvironment: 0 });
    const standard = computeEli(brightAndLoud, STANDARD_WEIGHTS).eli;
    const recovery = computeEli(brightAndLoud, RECOVERY_WEIGHTS).eli;
    expect(recovery).toBeGreaterThan(standard);
    expect(standard).toBeCloseTo(40, 9); // 0.15 + 0.25
    expect(recovery).toBeCloseTo(60, 9); // 0.30 + 0.30
  });

  it("returns zero rather than NaN when nothing can be scored", () => {
    const nothing = computeEli(
      {
        visualClutter: null,
        acousticLoad: null,
        workspaceSeparation: null,
        lighting: null,
        screenPositioning: null,
        colourEnvironment: null,
      },
      STANDARD_WEIGHTS
    );
    expect(nothing.eli).toBe(0);
    expect(nothing.terms).toHaveLength(0);
  });

  it("ignores a factor whose weight the user has dialled to zero", () => {
    const result = computeEli(subs({ visualClutter: 100 }), { ...STANDARD_WEIGHTS, visualClutter: 0 });
    expect(result.terms.some((t) => t.factor === "visualClutter")).toBe(false);
    expect(result.eli).toBeCloseTo(50, 9);
  });
});

describe("eliBand", () => {
  it("labels the score without replacing it", () => {
    expect(eliBand(10)).toBe("Low load");
    expect(eliBand(35)).toBe("Moderate load");
    expect(eliBand(55)).toBe("High load");
    expect(eliBand(80)).toBe("Very high load");
  });
});
