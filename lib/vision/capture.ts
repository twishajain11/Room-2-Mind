import type { Pixels } from "./types";

/** Longest edge of the working copy, in pixels (spec §5.1). */
export const WORKING_EDGE = 512;

/**
 * Draw a source frame into an offscreen canvas whose longest edge is 512px and
 * return its pixels.
 *
 * Browser only. The returned buffer is the only copy of the image that survives
 * this call; the caller is expected to hand it straight to `extractVisionFeatures`
 * and then drop it.
 */
export function toWorkingPixels(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  edge: number = WORKING_EDGE
): Pixels {
  const srcW =
    source instanceof HTMLVideoElement ? source.videoWidth : (source as HTMLImageElement).naturalWidth ?? source.width;
  const srcH =
    source instanceof HTMLVideoElement ? source.videoHeight : (source as HTMLImageElement).naturalHeight ?? source.height;

  if (!srcW || !srcH) throw new Error("Capture source has no dimensions yet.");

  const scale = Math.min(1, edge / Math.max(srcW, srcH));
  const width = Math.max(1, Math.round(srcW * scale));
  const height = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not acquire a 2D context.");
  ctx.drawImage(source, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);

  // Collapse the canvas so the browser is not holding a second copy of the
  // frame while feature extraction runs.
  canvas.width = 0;
  canvas.height = 0;

  return { data: imageData.data, width, height };
}

/**
 * Release everything that could still hold image bytes.
 *
 * Called after extraction completes, and again on unmount. Spec §3.1 requires
 * raw media to be discarded once features exist, and this is the function that
 * does it.
 */
export function discardMedia(opts: {
  stream?: MediaStream | null;
  objectUrl?: string | null;
  canvas?: HTMLCanvasElement | null;
}): void {
  opts.stream?.getTracks().forEach((t) => t.stop());
  if (opts.objectUrl) URL.revokeObjectURL(opts.objectUrl);
  if (opts.canvas) {
    opts.canvas.width = 0;
    opts.canvas.height = 0;
  }
}
