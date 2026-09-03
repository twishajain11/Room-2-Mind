import type { AudioFeatures } from "./types";

/**
 * Plain-language reading of a sound sample.
 *
 * The technical vector stays available behind a toggle, but the first thing a
 * reader sees should be a sentence they can feel, not a row of hertz. This
 * matters most for the recovery audience: someone with a concussion reading on
 * a hard day should not have to parse "spectral centroid" to learn whether
 * their room is a problem.
 *
 * Thresholds here are read against the same provisional breakpoints the score
 * uses, and are as approximate as everything else until the calibration set
 * lands. They describe, they do not diagnose.
 */

export interface PlainSound {
  /** One short headline, e.g. "Quiet, but it keeps starting and stopping". */
  headline: string;
  /** A sentence or two a person can relate to. */
  body: string;
}

export function plainSound(a: AudioFeatures): PlainSound {
  const loud = a.rmsMean;
  const jumpy = a.rmsVariance;
  const speech = a.speechBandRatio;
  const lowRumble = a.lowFreqRatio;

  // These cut points mirror the feels-like bands, not the exact score maths.
  const isQuiet = loud < 0.06;
  const isLoud = loud > 0.2;
  const isIntermittent = jumpy > 0.006;
  const speechHeavy = speech > 0.4;
  const rumbleHeavy = lowRumble > 0.35;

  let headline: string;
  if (isIntermittent && speechHeavy) {
    headline = "Sound that keeps interrupting you";
  } else if (isIntermittent) {
    headline = "The sound keeps starting and stopping";
  } else if (isQuiet) {
    headline = "Mostly quiet and steady";
  } else if (isLoud) {
    headline = "Loud, but at least it is steady";
  } else {
    headline = "A steady background hum";
  }

  const parts: string[] = [];

  if (isIntermittent) {
    parts.push(
      "The sound in this room keeps changing — going quiet, then loud again. That on-and-off pattern is the kind that pulls your attention away, more than a sound that just stays the same."
    );
  } else {
    parts.push(
      "The sound here stays fairly even. A steady, unchanging background is much easier to work through than one that keeps jumping."
    );
  }

  if (speechHeavy) {
    parts.push(
      "A lot of it sits in the range of talking, which is the hardest kind to tune out because your brain keeps trying to follow it."
    );
  } else if (rumbleHeavy) {
    parts.push(
      "Most of it is low rumble, like traffic or a machine. That tends to sit in the background more easily than voices do."
    );
  }

  if (isQuiet && !isIntermittent) {
    parts.push(
      "If near-silence makes it harder to settle, a low steady sound like a fan can sometimes help more than complete quiet."
    );
  }

  return { headline, body: parts.join(" ") };
}
