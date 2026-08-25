import type { AudioComposition, AudioFeatures } from "@/lib/audio/types";
import type { VisionFeatures } from "@/lib/vision/types";
import { clamp100, lerp, type Breakpoint } from "./interpolate";
import type { Subscores } from "./weights";

/**
 * Raw feature to subscore normalization (§6.1).
 *
 * Every factor is one exported pure function, higher always meaning more load,
 * and every breakpoint list below is provisional until Milestone 3 refits them
 * against the seed dataset. `CALIBRATION_DATE` in `weights.ts` is null for
 * exactly as long as that remains true.
 */

export const BREAKPOINTS = {
  clutterFromEdges: [
    [0.05, 0],
    [0.35, 100],
  ] as Breakpoint[],
  clutterFromCount: [
    [0, 0],
    [15, 100],
  ] as Breakpoint[],
  /** U-shaped: dark rooms and blown-out rooms both load, the middle does not. */
  luminanceLoad: [
    [0, 100],
    [40, 100],
    [110, 0],
    [170, 0],
    [230, 100],
    [255, 100],
  ] as Breakpoint[],
  contrastLoad: [
    [20, 0],
    [90, 100],
  ] as Breakpoint[],
  glareLoad: [
    [0.02, 0],
    [0.35, 100],
  ] as Breakpoint[],
  /** Distance from the bright centroid; near zero means the screen is backlit. */
  backlitLoad: [
    [0, 100],
    [0.5, 0],
  ] as Breakpoint[],
  /** Vertical offset of the screen centre from a comfortable eye line. */
  screenHeightLoad: [
    [0.05, 0],
    [0.35, 100],
  ] as Breakpoint[],
  paletteLoad: [
    [0.8, 0],
    [2.2, 100],
  ] as Breakpoint[],
  saturationLoad: [
    [0.15, 0],
    [0.6, 100],
  ] as Breakpoint[],
  /** Distance from a slightly warm neutral, in either direction. */
  warmthLoad: [
    [0.05, 0],
    [0.55, 100],
  ] as Breakpoint[],
  intermittencyLoad: [
    [0.0002, 0],
    [0.02, 100],
  ] as Breakpoint[],
  speechLoad: [
    [0.15, 0],
    [0.6, 100],
  ] as Breakpoint[],
  yamnetSpeechLoad: [
    [0.05, 0],
    [0.5, 100],
  ] as Breakpoint[],
} as const;

/** Comfortable eye line as a fraction of frame height, used as the screen height reference. */
export const SCREEN_EYE_LINE = 0.45;

/** Red-to-blue ratio treated as neutral, slightly warm because indoor light is. */
export const NEUTRAL_WARMTH = 1.15;

/** Dense visual field competing for attention, from edge density and loose object count. */
export function visualClutter(v: VisionFeatures): number {
  const fromEdges = lerp(v.edgeDensity, BREAKPOINTS.clutterFromEdges);
  const fromCount = lerp(v.clutterObjectCount, BREAKPOINTS.clutterFromCount);
  return clamp100(0.6 * fromEdges + 0.4 * fromCount);
}

/** Too dim, too harsh, or an extreme contrast range, from the three luminance features. */
export function lighting(v: VisionFeatures): number {
  const level = lerp(v.meanLuminance, BREAKPOINTS.luminanceLoad);
  const contrast = lerp(v.luminanceStdDev, BREAKPOINTS.contrastLoad);
  const glare = lerp(v.brightRegionRatio, BREAKPOINTS.glareLoad);
  return clamp100(0.5 * level + 0.3 * contrast + 0.2 * glare);
}

/**
 * Which of lighting's three conditions actually drove the score.
 *
 * "Too dim, too harsh, or an extreme contrast range" is three different rooms
 * with three different fixes, and reporting the disjunction tells the reader
 * nothing. This names the one that dominated and quotes the number behind it.
 */
export function lightingDiagnosis(v: VisionFeatures): { driver: string; sentence: string } {
  const parts = [
    { driver: "level", weighted: 0.5 * lerp(v.meanLuminance, BREAKPOINTS.luminanceLoad) },
    { driver: "contrast", weighted: 0.3 * lerp(v.luminanceStdDev, BREAKPOINTS.contrastLoad) },
    { driver: "glare", weighted: 0.2 * lerp(v.brightRegionRatio, BREAKPOINTS.glareLoad) },
  ].sort((a, b) => b.weighted - a.weighted);

  const top = parts[0];

  if (top.weighted <= 0) {
    return {
      driver: "none",
      sentence: `Light level, contrast spread, and bright-area share are all inside the comfortable band, at ${v.meanLuminance.toFixed(
        0
      )} of 255 mean brightness.`,
    };
  }

  if (top.driver === "level") {
    return v.meanLuminance < 110
      ? {
          driver: "dim",
          sentence: `The room is dim: mean brightness ${v.meanLuminance.toFixed(
            0
          )} of 255, where the comfortable band starts around 110.`,
        }
      : {
          driver: "blown",
          sentence: `The room is very bright overall: mean brightness ${v.meanLuminance.toFixed(
            0
          )} of 255, where the comfortable band ends around 170.`,
        };
  }

  if (top.driver === "contrast") {
    return {
      driver: "contrast",
      sentence: `The contrast range is wide: brightness varies by ${v.luminanceStdDev.toFixed(
        0
      )} across the frame, so your eyes are adapting between bright and dark areas.`,
    };
  }

  return {
    driver: "glare",
    sentence: `A bright source dominates: ${(v.brightRegionRatio * 100).toFixed(
      1
    )}% of the frame is at or near full brightness.`,
  };
}

/**
 * Work and rest occupying the same physical zone.
 *
 * Stepped rather than interpolated because the underlying question is
 * categorical: the cases below are genuinely different situations, and
 * pretending there is a smooth ramp between them would invent precision.
 *
 * Null when neither surface was detected. A midpoint score would look like a
 * measurement and move the composite like one, and a room the model could not
 * read has not earned a score in either direction.
 */
export function workspaceSeparation(v: VisionFeatures): number | null {
  if (v.hasWorkSurface && v.hasRestSurface) {
    // Both present: how bad depends on whether they are the same furniture.
    return clamp100(55 + 45 * v.workRestOverlap);
  }
  if (v.hasWorkSurface) return 10;
  // A rest surface with no work surface detected: probably working from a bed
  // or couch, which is the situation this factor exists to name.
  if (v.hasRestSurface) return 65;
  return null;
}

/**
 * Screen backlit or poorly placed, from its distance to the light source and
 * its height in frame. Null when no screen was detected, because a room with no
 * screen has not passed this test, it has skipped it.
 */
export function screenPositioning(v: VisionFeatures): number | null {
  if (!v.screenBox || v.screenLightAlignment === null) return null;
  const backlit = lerp(v.screenLightAlignment, BREAKPOINTS.backlitLoad);
  const centreY = v.screenBox.y + v.screenBox.height / 2;
  const height = lerp(Math.abs(centreY - SCREEN_EYE_LINE), BREAKPOINTS.screenHeightLoad);
  return clamp100(0.7 * backlit + 0.3 * height);
}

/** Visually noisy or over saturated palette, from entropy, saturation, and colour temperature. */
export function colourEnvironment(v: VisionFeatures): number {
  const entropy = lerp(v.paletteEntropy, BREAKPOINTS.paletteLoad);
  const saturation = lerp(v.meanSaturation, BREAKPOINTS.saturationLoad);
  const warmth = lerp(Math.abs(v.warmthRatio - NEUTRAL_WARMTH), BREAKPOINTS.warmthLoad);
  return clamp100(0.45 * entropy + 0.35 * saturation + 0.2 * warmth);
}

/**
 * Intermittent and speech heavy sound, weighted toward intermittency because
 * that is the claim the product is making: a steady fan is not a conversation.
 * Null when no audio was captured.
 */
export function acousticLoad(
  a: AudioFeatures | null,
  composition: AudioComposition | null = null
): number | null {
  if (!a || a.frameCount === 0) return null;

  const intermittency = lerp(a.rmsVariance, BREAKPOINTS.intermittencyLoad);
  const speechBand = lerp(a.speechBandRatio, BREAKPOINTS.speechLoad);

  if (!composition) {
    return clamp100(0.55 * intermittency + 0.45 * speechBand);
  }

  const yamnetSpeech = lerp(composition.speech, BREAKPOINTS.yamnetSpeechLoad);
  return clamp100(0.45 * intermittency + 0.3 * speechBand + 0.25 * yamnetSpeech);
}

/** All six factor subscores for one snapshot. */
export function computeSubscores(
  v: VisionFeatures,
  a: AudioFeatures | null = null,
  composition: AudioComposition | null = null
): Subscores {
  return {
    visualClutter: visualClutter(v),
    lighting: lighting(v),
    workspaceSeparation: workspaceSeparation(v),
    screenPositioning: screenPositioning(v),
    colourEnvironment: colourEnvironment(v),
    acousticLoad: acousticLoad(a, composition),
  };
}
