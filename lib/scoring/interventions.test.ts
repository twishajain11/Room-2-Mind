import { describe, expect, it } from "vitest";
import { EFFORT, PROVISIONAL_P25, rankInterventions, topInterventions } from "./interventions";
import { computeEli } from "./eli";
import { STANDARD_WEIGHTS, type Subscores } from "./weights";
import { makeVisionFeatures } from "@/lib/vision/fixtures/features";

function subs(overrides: Partial<Subscores> = {}): Subscores {
  return {
    visualClutter: 80,
    acousticLoad: 80,
    workspaceSeparation: 80,
    lighting: 80,
    screenPositioning: 80,
    colourEnvironment: 80,
    ...overrides,
  };
}

const v = makeVisionFeatures();

describe("rankInterventions", () => {
  it("reports a delta equal to what the composite would actually do", () => {
    const s = subs();
    const [top] = rankInterventions(s, STANDARD_WEIGHTS, v);
    const before = computeEli(s, STANDARD_WEIGHTS).eli;
    const after = computeEli({ ...s, [top.factor]: top.target }, STANDARD_WEIGHTS).eli;
    expect(top.realizableDelta).toBeCloseTo(before - after, 9);
  });

  it("ranks by delta times effort, not by delta alone", () => {
    const ranked = rankInterventions(subs(), STANDARD_WEIGHTS, v);
    for (let i = 0; i < ranked.length - 1; i++) {
      expect(ranked[i].score).toBeGreaterThanOrEqual(ranked[i + 1].score);
      expect(ranked[i].score).toBeCloseTo(ranked[i].realizableDelta * EFFORT[ranked[i].factor], 9);
    }
  });

  it("prefers the free change over an equally large expensive one", () => {
    // Clutter and colour both at 80, but colour is weighted 0.05 and costs the
    // most effort, so it must never outrank clutter.
    const ranked = rankInterventions(subs(), STANDARD_WEIGHTS, v);
    const clutter = ranked.findIndex((r) => r.factor === "visualClutter");
    const colour = ranked.findIndex((r) => r.factor === "colourEnvironment");
    expect(clutter).toBeLessThan(colour);
  });

  it("does not recommend a factor already at or below its target", () => {
    const ranked = rankInterventions(
      subs({ visualClutter: PROVISIONAL_P25.visualClutter - 1 }),
      STANDARD_WEIGHTS,
      v
    );
    expect(ranked.some((r) => r.factor === "visualClutter")).toBe(false);
  });

  it("skips a factor with no evidence rather than recommending a guess", () => {
    const ranked = rankInterventions(subs({ acousticLoad: null }), STANDARD_WEIGHTS, v);
    expect(ranked.some((r) => r.factor === "acousticLoad")).toBe(false);
  });

  it("returns nothing at all for a room already below every target", () => {
    const good = subs({
      visualClutter: 0,
      acousticLoad: 0,
      workspaceSeparation: 0,
      lighting: 0,
      screenPositioning: 0,
      colourEnvironment: 0,
    });
    expect(rankInterventions(good, STANDARD_WEIGHTS, v)).toHaveLength(0);
  });
});

describe("intervention copy", () => {
  it("quotes the measurement that justifies the instruction", () => {
    const withClutter = rankInterventions(
      subs(),
      STANDARD_WEIGHTS,
      makeVisionFeatures({ clutterObjectCount: 9, edgeDensity: 0.22 })
    ).find((r) => r.factor === "visualClutter")!;

    expect(withClutter.evidence).toContain("9");
    expect(withClutter.evidence).toContain("0.220");
  });

  it("gives a physical instruction, not an abstract one", () => {
    for (const r of rankInterventions(subs(), STANDARD_WEIGHTS, v)) {
      // Every action names something to move, clear, add, or rotate.
      expect(r.action.length).toBeGreaterThan(40);
      expect(/clear|move|rotate|add|diffuse|replace|reduce|give|even out|put/i.test(r.action)).toBe(true);
    }
  });

  it("makes the singular case read correctly", () => {
    const one = rankInterventions(
      subs(),
      STANDARD_WEIGHTS,
      makeVisionFeatures({ clutterObjectCount: 1 })
    ).find((r) => r.factor === "visualClutter")!;
    expect(one.evidence).toContain("1 loose object that");
  });
});

describe("topInterventions", () => {
  it("returns at most three", () => {
    expect(topInterventions(subs(), STANDARD_WEIGHTS, v).length).toBeLessThanOrEqual(3);
  });

  it("puts the highest scoring change first", () => {
    const all = rankInterventions(subs(), STANDARD_WEIGHTS, v);
    expect(topInterventions(subs(), STANDARD_WEIGHTS, v)[0].factor).toBe(all[0].factor);
  });
});
