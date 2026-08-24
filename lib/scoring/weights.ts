/**
 * Factor weights, and the only place they are written down.
 *
 * The UI reads these, the README reads these, and the weights panel mutates a
 * copy of these. If a weight is changed, it is changed here.
 */

export const FACTORS = [
  "visualClutter",
  "acousticLoad",
  "workspaceSeparation",
  "lighting",
  "screenPositioning",
  "colourEnvironment",
] as const;

export type FactorKey = (typeof FACTORS)[number];

export type FactorWeights = Record<FactorKey, number>;

/** A subscore is null when the snapshot carries no evidence for that factor. */
export type Subscores = Record<FactorKey, number | null>;

export type ScoringMode = "standard" | "recovery";

/**
 * Date the normalization breakpoints were last fitted against real data.
 *
 * Null means never: every breakpoint in `features.ts` is still the provisional
 * value written by hand, and Milestone 3 replaces them with values fitted to the
 * seed dataset. The UI reads this so the product can say which of the two it is
 * currently running on instead of implying calibration it has not done.
 */
export const CALIBRATION_DATE: string | null = null;

export const FACTOR_LABELS: Record<FactorKey, string> = {
  visualClutter: "Visual clutter",
  acousticLoad: "Acoustic load",
  workspaceSeparation: "Workspace separation",
  lighting: "Lighting",
  screenPositioning: "Screen positioning",
  colourEnvironment: "Colour environment",
};

/** What a high score on this factor means, in the UI's words. */
export const FACTOR_MEANING: Record<FactorKey, string> = {
  visualClutter: "Dense visual field competing for attention.",
  acousticLoad: "Intermittent and speech heavy sound.",
  workspaceSeparation: "Work and rest occupy the same physical zone.",
  lighting: "Too dim, too harsh, or an extreme contrast range.",
  screenPositioning: "Screen is backlit or poorly placed relative to light.",
  colourEnvironment: "Visually noisy or over saturated palette.",
};

export const STANDARD_WEIGHTS: FactorWeights = {
  visualClutter: 0.25,
  acousticLoad: 0.25,
  workspaceSeparation: 0.2,
  lighting: 0.15,
  screenPositioning: 0.1,
  colourEnvironment: 0.05,
};

/**
 * Recovery Mode reweights toward light and noise sensitivity, which are
 * cardinal post-concussion symptoms and the dimensions environmental
 * modification guidance actually targets.
 */
export const RECOVERY_WEIGHTS: FactorWeights = {
  lighting: 0.3,
  acousticLoad: 0.3,
  screenPositioning: 0.2,
  visualClutter: 0.1,
  workspaceSeparation: 0.05,
  colourEnvironment: 0.05,
};

export const WEIGHTS_BY_MODE: Record<ScoringMode, FactorWeights> = {
  standard: STANDARD_WEIGHTS,
  recovery: RECOVERY_WEIGHTS,
};

/** Why each weight is what it is. Shown in the weights panel, not buried in a doc. */
export const WEIGHT_JUSTIFICATION: Record<FactorKey, string> = {
  visualClutter:
    "Visual complexity in the field of view is the most consistently studied environmental attention cost.",
  acousticLoad:
    "Intermittent speech has a large and well replicated effect on concentration tasks.",
  workspaceSeparation:
    "Contextual separation of work and rest zones is a standard behavioural recommendation.",
  lighting: "Light level affects alertness, but with wide individual variation.",
  screenPositioning: "Real but narrower in effect than the factors above.",
  colourEnvironment: "Weakest evidence base, deliberately weighted low.",
};

/** The disclaimer that must render whenever Recovery Mode is active. */
export const RECOVERY_DISCLAIMER =
  "Room to Mind is not a medical device and does not diagnose or treat concussion. Environmental modification is one part of recovery guidance. Follow the protocol your clinician gives you.";

/** Stated once, everywhere weights are shown. */
export const WEIGHTS_ARE_PRIORS =
  "These weights are priors, not truths. They are a starting position drawn from published work on environmental attention costs, not a measurement of you.";
