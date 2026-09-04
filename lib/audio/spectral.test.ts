import { describe, expect, it } from "vitest";
import {
  bandEnergyRatio,
  decibelsToMagnitudes,
  frameRms,
  spectralCentroid,
  summarizeFrames,
  toFrame,
} from "./spectral";
import type { AudioFrame } from "./types";

/** Build a magnitude spectrum with all its energy in one bin. */
function spikeAt(bin: number, length = 32, value = 1): Float32Array {
  const out = new Float32Array(length);
  out[bin] = value;
  return out;
}

function frame(rms: number): AudioFrame {
  return { rms, centroid: 1000, speechRatio: 0.3, lowRatio: 0.2 };
}

describe("frameRms", () => {
  it("is zero on silence", () => {
    expect(frameRms(new Float32Array(64))).toBe(0);
  });

  it("returns the amplitude of a constant signal", () => {
    expect(frameRms([0.5, 0.5, 0.5, 0.5])).toBeCloseTo(0.5, 9);
  });

  it("ignores sign, so a full-scale square wave reads as full scale", () => {
    expect(frameRms([1, -1, 1, -1])).toBeCloseTo(1, 9);
  });
});

describe("spectralCentroid", () => {
  it("sits exactly on the only bin that carries energy", () => {
    const binHz = 23.4;
    expect(spectralCentroid(spikeAt(10), binHz)).toBeCloseTo(10 * binHz, 6);
  });

  it("sits between two equal spikes", () => {
    const mags = new Float32Array(32);
    mags[4] = 1;
    mags[12] = 1;
    expect(spectralCentroid(mags, 100)).toBeCloseTo(800, 6);
  });

  it("is zero rather than NaN on an empty spectrum", () => {
    expect(spectralCentroid(new Float32Array(32), 100)).toBe(0);
  });
});

describe("bandEnergyRatio", () => {
  it("is one when every bin sits inside the band", () => {
    const mags = new Float32Array(10).fill(1);
    expect(bandEnergyRatio(mags, 100, 0, 1000)).toBeCloseTo(1, 9);
  });

  it("is zero when no bin sits inside the band", () => {
    expect(bandEnergyRatio(spikeAt(1, 32), 100, 3000, 4000)).toBe(0);
  });

  it("splits evenly when half the energy is in band", () => {
    const mags = new Float32Array(10);
    mags[1] = 1; // 100 Hz
    mags[9] = 1; // 900 Hz
    expect(bandEnergyRatio(mags, 100, 0, 500)).toBeCloseTo(0.5, 9);
  });
});

describe("decibelsToMagnitudes", () => {
  it("maps 0 dB to unit magnitude and -20 dB to a tenth of it", () => {
    // Float32Array storage, so six places is the honest precision here.
    const out = decibelsToMagnitudes([0, -20]);
    expect(out[0]).toBeCloseTo(1, 6);
    expect(out[1]).toBeCloseTo(0.1, 6);
  });

  it("zeroes readings at the analyser floor instead of counting them", () => {
    expect(decibelsToMagnitudes([-100, -140])[0]).toBe(0);
    expect(decibelsToMagnitudes([-100, -140])[1]).toBe(0);
  });
});

describe("summarizeFrames", () => {
  it("separates a steady room from an intermittent one at equal mean loudness", () => {
    const steady = summarizeFrames([0.3, 0.3, 0.3, 0.3].map(frame));
    const intermittent = summarizeFrames([0.0, 0.6, 0.0, 0.6].map(frame));

    expect(steady.rmsMean).toBeCloseTo(intermittent.rmsMean, 9);
    expect(steady.rmsVariance).toBeCloseTo(0, 9);
    expect(intermittent.rmsVariance).toBeGreaterThan(steady.rmsVariance);
  });

  it("weights brightness by loudness so silent gaps do not drag it down", () => {
    // Two loud frames at 1000 Hz and two silent frames (centroid 0). A flat
    // mean would report 500 Hz; the audible sound was 1000 Hz.
    const loud = { rms: 0.5, centroid: 1000, speechRatio: 0.3, lowRatio: 0.2 };
    const silent = { rms: 0, centroid: 0, speechRatio: 0, lowRatio: 0 };
    const s = summarizeFrames([loud, silent, loud, silent]);
    expect(s.spectralCentroidMean).toBeCloseTo(1000, 6);
  });

  it("records how many frames it summarized", () => {
    expect(summarizeFrames([0.1, 0.2, 0.3].map(frame)).frameCount).toBe(3);
  });

  it("returns zeros rather than NaN for an empty sample", () => {
    const empty = summarizeFrames([]);
    expect(empty.rmsMean).toBe(0);
    expect(empty.rmsVariance).toBe(0);
    expect(empty.frameCount).toBe(0);
  });
});

describe("toFrame", () => {
  it("reduces one analyser reading to four numbers and nothing else", () => {
    const f = toFrame([0.2, -0.2, 0.2, -0.2], spikeAt(20, 64), 100);
    expect(Object.keys(f).sort()).toEqual(["centroid", "lowRatio", "rms", "speechRatio"]);
    expect(f.rms).toBeCloseTo(0.2, 9);
    expect(f.centroid).toBeCloseTo(2000, 6);
    expect(f.speechRatio).toBeCloseTo(1, 9); // 2000 Hz is inside 300 to 3400
    expect(f.lowRatio).toBe(0);
  });
});
