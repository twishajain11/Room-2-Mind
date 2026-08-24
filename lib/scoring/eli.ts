import { FACTORS, type FactorKey, type FactorWeights, type Subscores } from "./weights";

/** One line of the ELI arithmetic, in the order the UI shows it. */
export interface EliTerm {
  factor: FactorKey;
  subscore: number;
  weight: number;
  /** weight × subscore, before division by the weight sum. */
  weighted: number;
  /** This factor's share of the final score, in ELI points. */
  contribution: number;
}

export interface EliResult {
  /** Environmental Load Index, 0 to 100. Higher means more load, which is worse. */
  eli: number;
  terms: EliTerm[];
  /** Sum of the weights that were actually used. */
  weightSum: number;
  /** Factors with no evidence in this snapshot, excluded from both sums. */
  skipped: FactorKey[];
}

/**
 * The composite: ELI = Σ (weight × subscore) / Σ weight.
 *
 * A factor with a null subscore is dropped from the numerator *and* the
 * denominator rather than being scored zero or fifty. A room with no screen has
 * not earned a good screen-positioning score, and a snapshot with no audio has
 * not earned a quiet one, so neither is allowed to move the composite. The
 * skipped list is returned so the UI can say which ones those were.
 */
export function computeEli(subscores: Subscores, weights: FactorWeights): EliResult {
  const terms: EliTerm[] = [];
  const skipped: FactorKey[] = [];
  let weightSum = 0;
  let weightedSum = 0;

  for (const factor of FACTORS) {
    const subscore = subscores[factor];
    const weight = weights[factor];

    if (subscore === null || weight <= 0) {
      if (subscore === null) skipped.push(factor);
      continue;
    }

    weightSum += weight;
    weightedSum += weight * subscore;
    terms.push({ factor, subscore, weight, weighted: weight * subscore, contribution: 0 });
  }

  const eli = weightSum === 0 ? 0 : weightedSum / weightSum;

  for (const term of terms) {
    term.contribution = weightSum === 0 ? 0 : term.weighted / weightSum;
  }

  // Largest contributor first: the UI reads top down and so should the reason
  // for the number.
  terms.sort((a, b) => b.contribution - a.contribution);

  return { eli, terms, weightSum, skipped };
}

/** Plain-language band for an ELI value, used as a label beside the number, never instead of it. */
export function eliBand(eli: number): string {
  if (eli < 25) return "Low load";
  if (eli < 45) return "Moderate load";
  if (eli < 65) return "High load";
  return "Very high load";
}
