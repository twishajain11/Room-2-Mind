import { describe, expect, it } from "vitest";
import { plainSound } from "./plain";
import type { AudioFeatures } from "./types";

function audio(o: Partial<AudioFeatures> = {}): AudioFeatures {
  return {
    rmsMean: 0.1,
    rmsVariance: 0.001,
    spectralCentroidMean: 1200,
    speechBandRatio: 0.3,
    lowFreqRatio: 0.2,
    frameCount: 200,
    ...o,
  };
}

describe("plainSound", () => {
  it("names intermittent speech as the interrupting case", () => {
    const r = plainSound(audio({ rmsVariance: 0.02, speechBandRatio: 0.6 }));
    expect(r.headline.toLowerCase()).toContain("interrupt");
    expect(r.body.toLowerCase()).toContain("talking");
  });

  it("calls a steady quiet room quiet", () => {
    const r = plainSound(audio({ rmsMean: 0.03, rmsVariance: 0.0002 }));
    expect(r.headline.toLowerCase()).toContain("quiet");
  });

  it("uses no jargon a reader would have to look up", () => {
    const r = plainSound(audio({ rmsVariance: 0.02 }));
    const text = (r.headline + " " + r.body).toLowerCase();
    for (const term of ["centroid", "rms", "variance", "hz", "hertz", "spectral", "decibel"]) {
      expect(text).not.toContain(term);
    }
  });

  it("suggests steady sound only for near-silence, not for a busy room", () => {
    const quiet = plainSound(audio({ rmsMean: 0.03, rmsVariance: 0.0002 }));
    expect(quiet.body.toLowerCase()).toContain("fan");

    const busy = plainSound(audio({ rmsVariance: 0.02, speechBandRatio: 0.6 }));
    expect(busy.body.toLowerCase()).not.toContain("fan");
  });

  it("distinguishes low rumble from voices", () => {
    const rumble = plainSound(audio({ lowFreqRatio: 0.5, speechBandRatio: 0.1 }));
    expect(rumble.body.toLowerCase()).toContain("rumble");
  });
});
