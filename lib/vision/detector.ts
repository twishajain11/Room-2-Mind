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

let modelPromise: Promise<CocoModel> | null = null;

/** Load COCO-SSD once per page and reuse it for every subsequent snapshot. */
export function loadDetector(): Promise<CocoModel> {
  if (!modelPromise) {
    modelPromise = (async () => {
      await import("@tensorflow/tfjs");
      const cocoSsd = await import("@tensorflow-models/coco-ssd");
      return (await cocoSsd.load({ base: "lite_mobilenet_v2" })) as unknown as CocoModel;
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
  const raw = await model.detect(imageData, 20, 0.2);
  return raw.map((r) => ({ class: r.class, score: r.score, bbox: r.bbox }));
}
