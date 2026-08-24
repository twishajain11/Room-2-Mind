import { describe, expect, it } from "vitest";
import {
  acousticLoad,
  colourEnvironment,
  computeSubscores,
  lighting,
  screenPositioning,
  visualClutter,
  workspaceSeparation,
} from "./features";
import { lerp } from "./interpolate";
import { makeVisionFeatures } from "@/lib/vision/fixtures/features";
import type { AudioFeatures } from "@/lib/audio/types";

function audio(overrides: Partial<AudioFeatures> = {}): AudioFeatures {
  return {
    rmsMean: 0.1,
    rmsVariance: 0.001,
    spectralCentroidMean: 1200,
    speechBandRatio: 0.3,
    lowFreqRatio: 0.2,
    frameCount: 200,
    ...overrides,
  };
}

describe("lerp", () => {
  it("clamps below the first and above the last breakpoint", () => {
    const bp: [number, number][] = [
      [0, 0],
      [10, 100],
    ];
    expect(lerp(-5, bp)).toBe(0);
    expect(lerp(15, bp)).toBe(100);
  });

  it("interpolates linearly between two breakpoints", () => {
    expect(
      lerp(5, [
        [0, 0],
        [10, 100],
      ])
    ).toBeCloseTo(50, 9);
  });

  it("follows a U shape through a multi-segment list", () => {
    const u: [number, number][] = [
      [0, 100],
      [50, 0],
      [100, 100],
    ];
    expect(lerp(0, u)).toBe(100);
    expect(lerp(50, u)).toBe(0);
    expect(lerp(100, u)).toBe(100);
    expect(lerp(25, u)).toBeCloseTo(50, 9);
  });
});

describe("visualClutter", () => {
  it("matches the worked example in the spec", () => {
    // edgeDensity 0.35 -> 100, clutterObjectCount 15 -> 100
    const busy = visualClutter(makeVisionFeatures({ edgeDensity: 0.35, clutterObjectCount: 15 }));
    expect(busy).toBeCloseTo(100, 6);

    // 0.6 * 100 + 0.4 * 0 = 60
    const edgesOnly = visualClutter(
      makeVisionFeatures({ edgeDensity: 0.35, clutterObjectCount: 0 })
    );
    expect(edgesOnly).toBeCloseTo(60, 6);
  });

  it("is zero for a bare, smooth room", () => {
    expect(visualClutter(makeVisionFeatures({ edgeDensity: 0.05, clutterObjectCount: 0 }))).toBeCloseTo(
      0,
      6
    );
  });

  it("rises with object count at fixed edge density", () => {
    const few = visualClutter(makeVisionFeatures({ clutterObjectCount: 2 }));
    const many = visualClutter(makeVisionFeatures({ clutterObjectCount: 12 }));
    expect(many).toBeGreaterThan(few);
  });
});

describe("lighting", () => {
  it("loads a dark room and a blown-out room, but not a well-lit one", () => {
    const dark = lighting(makeVisionFeatures({ meanLuminance: 30, luminanceStdDev: 20, brightRegionRatio: 0 }));
    const good = lighting(makeVisionFeatures({ meanLuminance: 140, luminanceStdDev: 20, brightRegionRatio: 0.02 }));
    const blown = lighting(makeVisionFeatures({ meanLuminance: 240, luminanceStdDev: 20, brightRegionRatio: 0.02 }));

    expect(good).toBeLessThan(dark);
    expect(good).toBeLessThan(blown);
    expect(good).toBeCloseTo(0, 6);
  });

  it("loads an extreme contrast range even at a comfortable mean", () => {
    const flat = lighting(makeVisionFeatures({ meanLuminance: 140, luminanceStdDev: 20 }));
    const harsh = lighting(makeVisionFeatures({ meanLuminance: 140, luminanceStdDev: 90 }));
    expect(harsh).toBeGreaterThan(flat);
  });
});

describe("workspaceSeparation", () => {
  it("scores a desk with no bed in the frame as almost no load", () => {
    expect(workspaceSeparation(makeVisionFeatures({ hasWorkSurface: true, hasRestSurface: false }))).toBe(10);
  });

  it("scores a laptop on a bed as the worst case", () => {
    const onBed = workspaceSeparation(
      makeVisionFeatures({ hasWorkSurface: true, hasRestSurface: true, workRestOverlap: 1 })
    );
    expect(onBed).toBeCloseTo(100, 6);
  });

  it("scales with how much the two surfaces overlap", () => {
    const apart = workspaceSeparation(
      makeVisionFeatures({ hasWorkSurface: true, hasRestSurface: true, workRestOverlap: 0 })
    );
    const together = workspaceSeparation(
      makeVisionFeatures({ hasWorkSurface: true, hasRestSurface: true, workRestOverlap: 0.5 })
    );
    expect(together!).toBeGreaterThan(apart!);
  });

  it("is null when the model read no furniture at all", () => {
    // A midpoint here would look like a measurement and move the composite like
    // one, off the back of no evidence whatsoever.
    expect(
      workspaceSeparation(makeVisionFeatures({ hasWorkSurface: false, hasRestSurface: false }))
    ).toBeNull();
  });
});

describe("screenPositioning", () => {
  it("is null when there is no screen to judge", () => {
    expect(screenPositioning(makeVisionFeatures({ screenBox: null, screenLightAlignment: null }))).toBeNull();
  });

  it("loads a backlit screen more than a side-lit one", () => {
    const backlit = screenPositioning(makeVisionFeatures({ screenLightAlignment: 0 }))!;
    const sidelit = screenPositioning(makeVisionFeatures({ screenLightAlignment: 0.5 }))!;
    expect(backlit).toBeGreaterThan(sidelit);
  });

  it("loads a screen far above or below the eye line", () => {
    const level = screenPositioning(
      makeVisionFeatures({ screenBox: { x: 0.3, y: 0.35, width: 0.3, height: 0.2 }, screenLightAlignment: 0.5 })
    )!;
    const low = screenPositioning(
      makeVisionFeatures({ screenBox: { x: 0.3, y: 0.75, width: 0.3, height: 0.2 }, screenLightAlignment: 0.5 })
    )!;
    expect(low).toBeGreaterThan(level);
  });
});

describe("colourEnvironment", () => {
  it("is near zero for a muted, neutral palette", () => {
    const calm = colourEnvironment(
      makeVisionFeatures({ paletteEntropy: 0.8, meanSaturation: 0.15, warmthRatio: 1.15 })
    );
    expect(calm).toBeCloseTo(0, 6);
  });

  it("rises for a busy, saturated palette", () => {
    const loud = colourEnvironment(
      makeVisionFeatures({ paletteEntropy: 2.2, meanSaturation: 0.6, warmthRatio: 1.15 })
    );
    expect(loud).toBeGreaterThan(70);
  });

  it("treats cool and warm departures from neutral the same way", () => {
    const cool = colourEnvironment(makeVisionFeatures({ warmthRatio: 1.15 - 0.3 }));
    const warm = colourEnvironment(makeVisionFeatures({ warmthRatio: 1.15 + 0.3 }));
    expect(cool).toBeCloseTo(warm, 6);
  });
});

describe("acousticLoad", () => {
  it("is null with no audio, and null with an empty sample", () => {
    expect(acousticLoad(null)).toBeNull();
    expect(acousticLoad(audio({ frameCount: 0 }))).toBeNull();
  });

  it("scores intermittent sound above steady sound at the same speech content", () => {
    const steady = acousticLoad(audio({ rmsVariance: 0.0002 }))!;
    const intermittent = acousticLoad(audio({ rmsVariance: 0.02 }))!;
    expect(intermittent).toBeGreaterThan(steady);
  });

  it("weights intermittency above speech band content", () => {
    // Same total departure from the low end, moved into different features.
    const allIntermittency = acousticLoad(audio({ rmsVariance: 0.02, speechBandRatio: 0.15 }))!;
    const allSpeech = acousticLoad(audio({ rmsVariance: 0.0002, speechBandRatio: 0.6 }))!;
    expect(allIntermittency).toBeGreaterThan(allSpeech);
  });

  it("brings YAMNet speech share in when a composition is supplied", () => {
    const withoutModel = acousticLoad(audio())!;
    const withSpeech = acousticLoad(audio(), {
      speech: 0.5,
      traffic: 0.1,
      construction: 0,
      music: 0,
      keyboard: 0.1,
      other: 0.3,
    })!;
    expect(withSpeech).toBeGreaterThan(withoutModel);
  });
});

describe("computeSubscores", () => {
  it("returns all six factors, with nulls where evidence is missing", () => {
    const s = computeSubscores(makeVisionFeatures({ screenBox: null, screenLightAlignment: null }), null);
    expect(Object.keys(s).sort()).toEqual(
      [
        "acousticLoad",
        "colourEnvironment",
        "lighting",
        "screenPositioning",
        "visualClutter",
        "workspaceSeparation",
      ].sort()
    );
    expect(s.screenPositioning).toBeNull();
    expect(s.acousticLoad).toBeNull();
    expect(s.visualClutter).not.toBeNull();
  });

  it("keeps every subscore inside 0 to 100 on extreme input", () => {
    const s = computeSubscores(
      makeVisionFeatures({
        edgeDensity: 5,
        clutterObjectCount: 500,
        meanLuminance: 255,
        luminanceStdDev: 200,
        brightRegionRatio: 1,
        paletteEntropy: 10,
        meanSaturation: 1,
        warmthRatio: 10,
        workRestOverlap: 1,
        hasRestSurface: true,
        screenLightAlignment: 0,
      }),
      audio({ rmsVariance: 10, speechBandRatio: 1 })
    );
    for (const value of Object.values(s)) {
      if (value === null) continue;
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  });
});
