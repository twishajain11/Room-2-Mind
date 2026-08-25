import type { AudioFeatures } from "@/lib/audio/types";
import type { VisionFeatures } from "@/lib/vision/types";
import { computeEli } from "./eli";
import { lightingDiagnosis } from "./features";
import { FACTOR_LABELS, type FactorKey, type FactorWeights, type Subscores } from "./weights";

/**
 * Effort coefficients (§8.1). A change that is free and reversible is worth
 * more than an equally large change that needs a purchase.
 */
export const EFFORT: Record<FactorKey, number> = {
  visualClutter: 1.0,
  screenPositioning: 0.9,
  acousticLoad: 0.7,
  workspaceSeparation: 0.6,
  lighting: 0.5,
  colourEnvironment: 0.2,
};

export const EFFORT_REASON: Record<FactorKey, string> = {
  visualClutter: "Free, immediate, reversible.",
  screenPositioning: "Minutes of work.",
  acousticLoad: "Partially outside your control.",
  workspaceSeparation: "May require moving furniture.",
  lighting: "May require a purchase.",
  colourEnvironment: "Expensive and slow to change.",
};

/**
 * Target subscore for each factor: the 25th percentile of the seed dataset.
 *
 * The seed dataset does not exist yet. These are hand-written stand-ins so the
 * ranking can be built and tested before Milestone 3, and every surface that
 * shows an intervention has to say so. `PERCENTILES_ARE_PROVISIONAL` is the flag
 * the UI reads; it flips to false in the same commit that replaces these
 * numbers with real ones.
 */
export const PROVISIONAL_P25: Record<FactorKey, number> = {
  visualClutter: 25,
  acousticLoad: 30,
  workspaceSeparation: 10,
  lighting: 20,
  screenPositioning: 20,
  colourEnvironment: 25,
};

export const PERCENTILES_ARE_PROVISIONAL = true;

export interface Intervention {
  factor: FactorKey;
  label: string;
  /** ELI points recovered if this factor reached its target. */
  realizableDelta: number;
  effort: number;
  /** realizableDelta × effort, the ranking key. */
  score: number;
  /** The subscore this factor would move to. */
  target: number;
  current: number;
  /** The specific physical instruction. */
  action: string;
  /** The measurement that justifies the instruction. */
  evidence: string;
}

/** One physical, specific instruction per factor, quoting what was actually measured. */
function copyFor(
  factor: FactorKey,
  v: VisionFeatures,
  a: AudioFeatures | null
): { action: string; evidence: string } {
  switch (factor) {
    case "visualClutter":
      return {
        action:
          "Clear the loose objects from the surface within arm's reach, and put the ones you have not touched today out of the frame entirely.",
        evidence: `This frame holds ${v.clutterObjectCount} loose object${
          v.clutterObjectCount === 1 ? "" : "s"
        } that belong to no work surface, screen, or resting place, at an edge density of ${v.edgeDensity.toFixed(
          3
        )}.`,
      };

    case "lighting": {
      const { driver, sentence } = lightingDiagnosis(v);
      const action =
        driver === "dim"
          ? "Add a second light source at desk height on the side away from your window, so the room is lit rather than the screen being the brightest thing in it."
          : driver === "contrast"
            ? "Even out the range: put a low lamp in the darkest corner of the frame rather than making the bright part brighter, so your eyes stop adapting back and forth."
            : "Diffuse the strongest light in the room: close a blind partway, or bounce the lamp off the ceiling instead of pointing it at the desk.";
      return { action, evidence: sentence };
    }

    case "workspaceSeparation":
      return {
        action: v.hasRestSurface
          ? "Move the work surface out of the resting zone, or if the room has only one surface, clear and reset it between working and resting so the space changes state even when the furniture cannot."
          : "Give work a dedicated surface that you do not also relax at, even if it is only one end of a table.",
        evidence:
          v.hasWorkSurface && v.hasRestSurface
            ? `A work surface and a rest surface were both detected, overlapping by ${(
                v.workRestOverlap * 100
              ).toFixed(0)}% of their combined area.`
            : v.hasRestSurface
              ? "A rest surface was detected but no distinct work surface was."
              : "A work surface was detected with no rest surface sharing the frame.",
      };

    case "screenPositioning":
      return {
        action:
          "Rotate the desk about 90 degrees so the brightest light falls across the screen from the side rather than sitting behind it.",
        evidence:
          v.screenLightAlignment === null
            ? "No screen was detected in this frame."
            : `The screen centre sits ${v.screenLightAlignment.toFixed(
                2
              )} of a frame-width from the brightest region, where 0 means the light source is directly behind it.`,
      };

    case "colourEnvironment":
      return {
        action:
          "Reduce the number of competing strong colours in the field of view, starting with anything saturated that sits directly behind the screen.",
        evidence: `Palette entropy is ${v.paletteEntropy.toFixed(2)} of a possible 2.32 with mean saturation ${v.meanSaturation.toFixed(
          2
        )}.`,
      };

    case "acousticLoad":
      return {
        action:
          "Replace the silence with something continuous rather than trying to remove the sound: a fan or steady low noise raises the floor so intermittent speech stops cutting through it.",
        evidence: a
          ? `Loudness varied by ${a.rmsVariance.toFixed(5)} across ${a.frameCount} frames, with ${(
              a.speechBandRatio * 100
            ).toFixed(0)}% of energy in the speech band.`
          : "No audio was captured for this snapshot.",
      };
  }
}

/**
 * Rank the factors by what moving each one to its target would actually buy,
 * discounted by how hard it is to move.
 *
 * The delta is computed by re-running the real composite with that one factor
 * replaced, so the number shown is the number the product would produce, not an
 * estimate of it.
 */
export function rankInterventions(
  subscores: Subscores,
  weights: FactorWeights,
  v: VisionFeatures,
  a: AudioFeatures | null = null
): Intervention[] {
  const base = computeEli(subscores, weights).eli;
  const out: Intervention[] = [];

  for (const factor of Object.keys(EFFORT) as FactorKey[]) {
    const current = subscores[factor];
    if (current === null) continue;

    const target = Math.min(current, PROVISIONAL_P25[factor]);
    // Already at or below the target: there is nothing to recommend.
    if (target >= current) continue;

    const improved = computeEli({ ...subscores, [factor]: target }, weights).eli;
    const realizableDelta = base - improved;
    if (realizableDelta <= 0) continue;

    const { action, evidence } = copyFor(factor, v, a);

    out.push({
      factor,
      label: FACTOR_LABELS[factor],
      realizableDelta,
      effort: EFFORT[factor],
      score: realizableDelta * EFFORT[factor],
      target,
      current,
      action,
      evidence,
    });
  }

  return out.sort((x, y) => y.score - x.score);
}

/** The top three, with the first presented as "Your highest impact change". */
export function topInterventions(
  subscores: Subscores,
  weights: FactorWeights,
  v: VisionFeatures,
  a: AudioFeatures | null = null
): Intervention[] {
  return rankInterventions(subscores, weights, v, a).slice(0, 3);
}
