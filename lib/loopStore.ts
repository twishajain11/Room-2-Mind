import type { FactorKey, Subscores } from "@/lib/scoring/weights";
import type { VisionFeatures } from "@/lib/vision/types";

/**
 * State carried across the §8.3 loop: capture, change the room, recapture.
 *
 * Held in sessionStorage alongside the snapshot itself, for the same reason
 * (see `snapshotStore.ts`): the database exists now, but a comparison is a
 * property of one sitting rather than something worth persisting, and keeping
 * it local means the loop works before anyone has a handle worth trusting.
 */
export interface PendingComparison {
  baselineId: string;
  baselineEli: number;
  baselineSubscores: Subscores;
  baselineFeatures: VisionFeatures;
  /** The factor the intervention asked the user to change. */
  factor: FactorKey;
  factorLabel: string;
  /** The action the user was asked to take, quoted back after the recapture. */
  action: string;
  /** ELI points the ranking said this change was worth. */
  predictedDelta: number;
  createdAt: string;
}

const KEY = "rtm:pending-comparison";

export function savePending(pending: PendingComparison): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(pending));
  } catch {
    // Nothing to do: the loop simply will not close in this browser.
  }
}

export function loadPending(): PendingComparison | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PendingComparison) : null;
  } catch {
    return null;
  }
}

export function clearPending(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Already gone.
  }
}

export interface ComparisonOutcome {
  predictedDelta: number;
  /** What the composite actually did. Positive means load came down. */
  actualDelta: number;
  /** Signed miss: positive means the product over-promised. */
  error: number;
  /** Whether the change moved the score in the direction predicted at all. */
  directionRight: boolean;
}

/**
 * Compare what was promised against what happened.
 *
 * Deltas are stated as improvements, so a positive number always means the load
 * index came down. The error is signed on purpose: over-promising and
 * under-promising are different failures and the UI should be able to say
 * which one occurred.
 */
export function compareOutcome(
  pending: PendingComparison,
  actualEli: number
): ComparisonOutcome {
  const actualDelta = pending.baselineEli - actualEli;
  return {
    predictedDelta: pending.predictedDelta,
    actualDelta,
    error: pending.predictedDelta - actualDelta,
    directionRight: actualDelta > 0,
  };
}
