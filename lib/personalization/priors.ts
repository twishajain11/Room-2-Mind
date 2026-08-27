import { FACTORS, type FactorKey } from "@/lib/scoring/weights";
import type { RidgeFit } from "./ridge";

/**
 * Population priors fitted to the seed dataset.
 *
 * Everything in this file is generated from real collected responses by
 * `npm run fit:priors`, which reads the database and rewrites the constants
 * below. Nothing here is hand-written, and nothing here is a guess.
 *
 * Right now the dataset is empty, so the sample size is 0 and there are no
 * coefficients. Every surface that would show a prior reads
 * `SEED_SAMPLE_SIZE` first and says what it actually has. The spec's §7.3
 * label, "based on 87 calibration responses", is not something to hardcode: 87
 * is a number the collection has to earn, and until it does, the UI says 0.
 */

/** Responses the priors below were fitted to. Written by the fitting script. */
export const SEED_SAMPLE_SIZE = 0;

/** ISO date the priors were last fitted, or null if they never have been. */
export const SEED_FITTED_AT: string | null = null;

/** How the responses were collected, stated for the README and /method page. */
export const SEED_COLLECTION_METHOD =
  "One photograph plus five self-report questions, collected from volunteers via Discord, classmates, and family. Each response is one room at one moment, reported by the person sitting in it.";

/** Predictor order for every fit in this project. Never reorder without refitting. */
export const PRIOR_PREDICTORS: FactorKey[] = [...FACTORS];

/**
 * Standardized coefficients from factor subscores to reported concentration.
 *
 * Null until the seed dataset exists. A caller that finds null must fall back
 * to saying it has no population model, never to a plausible-looking default.
 */
export const POPULATION_FIT: RidgeFit | null = null;

/** Minimum responses before the population fit is shown at all. */
export const MIN_SEED_RESPONSES = 30;

/** Session counts that gate what the personalization surface may claim (§7.3). */
export const PERSONALIZATION_TIERS = {
  populationOnly: 5,
  emerging: 12,
} as const;

export type PersonalizationTier = "population" | "emerging" | "personal";

/** Which tier a user has reached, from how many sessions they have logged. */
export function tierFor(sessionCount: number): PersonalizationTier {
  if (sessionCount >= PERSONALIZATION_TIERS.emerging) return "personal";
  if (sessionCount >= PERSONALIZATION_TIERS.populationOnly) return "emerging";
  return "population";
}

/**
 * The label shown beside any prior-derived claim.
 *
 * Written as one function so the honest sample size cannot appear one way on
 * the result page and another way in the personalization panel.
 */
export function priorLabel(): string {
  if (SEED_SAMPLE_SIZE === 0) {
    return "No calibration responses have been collected yet, so this product has no population model. Nothing below is personalized to you, and nothing below is fitted to anyone else either.";
  }
  if (SEED_SAMPLE_SIZE < MIN_SEED_RESPONSES) {
    return `Based on ${SEED_SAMPLE_SIZE} calibration responses, which is too few to fit a population model worth showing. Not yet personalized to you.`;
  }
  return `Based on ${SEED_SAMPLE_SIZE} calibration responses, not yet personalized to you.`;
}
