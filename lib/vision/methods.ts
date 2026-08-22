/**
 * The one-sentence method behind every feature.
 *
 * Single source of truth: the debug view, the result page, and the public
 * methodology page all read from here, so a feature can never be described one
 * way in the UI and another way in the docs.
 */
export interface MethodEntry {
  key: string;
  label: string;
  method: string;
  range: string;
  section: "Light" | "Complexity" | "Colour" | "Objects" | "Layout";
}

export const VISION_METHODS: MethodEntry[] = [
  {
    key: "meanLuminance",
    label: "Mean luminance",
    method: "Average of 0.2126R + 0.7152G + 0.0722B across all pixels.",
    range: "0 to 255",
    section: "Light",
  },
  {
    key: "luminanceStdDev",
    label: "Luminance spread",
    method: "Standard deviation of the same luminance values, a measure of contrast spread.",
    range: "0 to about 128",
    section: "Light",
  },
  {
    key: "brightRegionRatio",
    label: "Bright region ratio",
    method:
      "Fraction of pixels brighter than a fixed cutoff of 220, used as a natural light proxy.",
    range: "0 to 1",
    section: "Light",
  },
  {
    key: "brightRegionCentroid",
    label: "Bright region centroid",
    method:
      "Centre of mass of those bright pixels, which approximates where the light source sits.",
    range: "0 to 1 on each axis",
    section: "Light",
  },
  {
    key: "edgeDensity",
    label: "Edge density",
    method:
      "Mean Sobel gradient magnitude over the grayscale image, the standard proxy for visual complexity.",
    range: "0 to 1",
    section: "Complexity",
  },
  {
    key: "paletteEntropy",
    label: "Palette entropy",
    method: "Shannon entropy over a 5 cluster k-means of pixel colours in RGB space.",
    range: "0 to 2.32",
    section: "Colour",
  },
  {
    key: "meanSaturation",
    label: "Mean saturation",
    method: "Average HSV saturation across all pixels.",
    range: "0 to 1",
    section: "Colour",
  },
  {
    key: "warmthRatio",
    label: "Warmth ratio",
    method: "Ratio of mean red channel to mean blue channel.",
    range: "about 0.5 to 2",
    section: "Colour",
  },
  {
    key: "objectCount",
    label: "Object count",
    method: "Total COCO-SSD detections at or above confidence 0.4.",
    range: "count",
    section: "Objects",
  },
  {
    key: "clutterObjectCount",
    label: "Clutter object count",
    method:
      "Count of detections that match no named bucket, so neither a work surface, a screen, nor a rest surface.",
    range: "count",
    section: "Objects",
  },
  {
    key: "hasWorkSurface",
    label: "Work surface present",
    method: "True when any dining table, laptop, keyboard, or mouse was detected.",
    range: "true or false",
    section: "Objects",
  },
  {
    key: "hasRestSurface",
    label: "Rest surface present",
    method: "True when any bed or couch was detected.",
    range: "true or false",
    section: "Objects",
  },
  {
    key: "workRestOverlap",
    label: "Work and rest overlap",
    method:
      "Intersection over union of the largest work surface and largest rest surface boxes, 0 if either is absent.",
    range: "0 to 1",
    section: "Objects",
  },
  {
    key: "screenBox",
    label: "Screen box",
    method: "Bounding box of the largest screen detection, as fractions of the frame.",
    range: "0 to 1 each",
    section: "Objects",
  },
  {
    key: "screenLightAlignment",
    label: "Screen and light alignment",
    method:
      "Distance between the screen centre and the bright region centroid, a proxy for whether the screen is backlit.",
    range: "0 to 1.41, null with no screen",
    section: "Objects",
  },
  {
    key: "bboxScatter",
    label: "Object scatter",
    method:
      "Spread of all detection centre points, where higher means objects are spread across the whole frame rather than grouped.",
    range: "0 to about 0.7",
    section: "Layout",
  },
  {
    key: "alignmentVariance",
    label: "Alignment variance",
    method:
      "Variance of detection bottom edges, where lower means objects sit on shared surfaces rather than at random heights.",
    range: "0 to about 0.25",
    section: "Layout",
  },
];

export const METHOD_BY_KEY: Record<string, MethodEntry> = Object.fromEntries(
  VISION_METHODS.map((m) => [m.key, m])
);
