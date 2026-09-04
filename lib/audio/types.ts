/** Section 5.4: the acoustic channel. */

/**
 * One 100ms observation of the room.
 *
 * A frame is already reduced: four numbers, no samples. Nothing downstream of
 * the recorder ever sees a waveform, which is what makes the §3.1 promise
 * checkable rather than a claim.
 */
export interface AudioFrame {
  /** Root mean square amplitude of this frame's time-domain samples, 0 to 1. */
  rms: number;
  /** Spectral centroid of this frame, in Hz. */
  centroid: number;
  /** Share of this frame's spectral energy inside the speech band. */
  speechRatio: number;
  /** Share of this frame's spectral energy below the low-frequency cutoff. */
  lowRatio: number;
}

export interface AudioFeatures {
  rmsMean: number;
  rmsVariance: number;
  spectralCentroidMean: number;
  speechBandRatio: number;
  lowFreqRatio: number;
  /** How many 100ms frames the summary was computed from. */
  frameCount: number;
}

/**
 * YAMNet composition vector, collapsed to the six reported categories.
 *
 * Null throughout Week 2: the spectral fallback path is built first so the
 * acoustic channel is never blocked, and YAMNet is a Week 3 upgrade that only
 * happens if Weeks 1 and 2 finished on schedule (§9).
 */
export interface AudioComposition {
  speech: number;
  traffic: number;
  construction: number;
  music: number;
  keyboard: number;
  other: number;
}
