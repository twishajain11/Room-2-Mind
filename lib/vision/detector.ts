import type { Detection, Pixels } from "./types";

/**
 * COCO-SSD wrapper.
 *
 * The model and TensorFlow.js are imported dynamically so that neither ends up
 * in the server bundle or the first paint: detection is a browser-only step and
 * the weights are fetched only once the user actually captures something.
 */
type CocoModel = {
  detect: (
    input: HTMLCanvasElement | HTMLImageElement | ImageData,
    maxNumBoxes?: number,
    minScore?: number
  ) => Promise<Array<{ bbox: [number, number, number, number]; class: string; score: number }>>;
};

/**
 * Which COCO-SSD backbone to load.
 *
 * This was `lite_mobilenet_v2` through Week 1 and 2, chosen for download size
 * and speed. It missed a laptop sitting in the middle of a real room photo,
 * which silently blanked both `workspaceSeparation` and `screenPositioning`,
 * since `laptop` feeds both buckets. Warm captures run in about 200ms, so
 * there was never a latency budget worth protecting here: accuracy is the
 * scarce resource, not milliseconds.
 */
export const DETECTOR_BASE = "mobilenet_v2" as const;

/**
 * Floor for what the model is asked to return.
 *
 * Deliberately far below the 0.4 threshold that features are computed at, so
 * near misses stay visible in the debug view. A laptop the model saw at 0.31 is
 * a different problem from a laptop it never saw at all, and the UI should be
 * able to tell those apart.
 */
export const DETECTOR_FLOOR = 0.15;

/** Upper bound on returned boxes; a cluttered room can legitimately fill this. */
export const MAX_DETECTIONS = 30;

let modelPromise: Promise<CocoModel> | null = null;

/** Load COCO-SSD once per page and reuse it for every subsequent snapshot. */
export function loadDetector(): Promise<CocoModel> {
  if (!modelPromise) {
    modelPromise = (async () => {
      await import("@tensorflow/tfjs");
      const cocoSsd = await import("@tensorflow-models/coco-ssd");
      return (await cocoSsd.load({ base: DETECTOR_BASE })) as unknown as CocoModel;
    })();
  }
  return modelPromise;
}

/** Run detection over a working-size pixel buffer and return raw detections. */
export async function detect(px: Pixels): Promise<Detection[]> {
  const model = await loadDetector();
  // Copied rather than aliased: ImageData requires a plain ArrayBuffer, and the
  // copy is released with everything else as soon as detection returns.
  const imageData = new ImageData(new Uint8ClampedArray(px.data), px.width, px.height);
  const raw = await model.detect(imageData, MAX_DETECTIONS, DETECTOR_FLOOR);
  return raw.map((r) => ({ class: r.class, score: r.score, bbox: r.bbox }));
}
