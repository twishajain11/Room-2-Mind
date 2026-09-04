# Room to Mind

Measures the attention load of a physical space from one photo and an optional 20 seconds of sound, entirely in the browser, and turns it into a transparent, adjustable score.

**Live:** https://room-to-mind.onrender.com  ·  **Repo:** https://github.com/twishajain11/Room-2-Mind

---

## What this measures and why

Your physical environment loads your attention every second you are in it, and it is the one input to cognition that nobody measures. Room to Mind reads a room across two channels, a visual one from a photo and an acoustic one from a short sound sample, and reduces it to a 0–100 Environmental Load Index where higher means more load. The point is not the single number but its transparency: every factor, weight, and recommendation is visible and can be questioned.

## How every feature is computed

Everything below is computed in the browser. The photo is downscaled to 512px on its longest edge first.

**Visual, classical (hand-written Canvas 2D):**
- `meanLuminance` — average of 0.2126R + 0.7152G + 0.0722B over all pixels.
- `luminanceStdDev` — standard deviation of those luminance values; the contrast spread.
- `brightRegionRatio` — fraction of pixels above a fixed brightness cutoff (220/255), a natural-light proxy.
- `brightRegionCentroid` — centre of mass of the bright pixels; where the light source sits.
- `edgeDensity` — mean Sobel gradient magnitude over the greyscale image; the standard proxy for visual complexity.
- `paletteEntropy` — Shannon entropy over a 5-cluster k-means of pixel colours.
- `meanSaturation` — average HSV saturation across all pixels.
- `warmthRatio` — mean red channel over mean blue channel.

**Visual, objects (COCO-SSD, mobilenet_v2, confidence ≥ 0.4):**
- `objectCount` / `clutterObjectCount` — total detections, and those that are loose clutter (not a work surface, screen, rest surface, or a piece of furniture/fixture).
- `hasWorkSurface` / `hasRestSurface` — presence of desk/laptop/keyboard/mouse, or bed/couch.
- `workRestOverlap` — intersection-over-union of the largest work and rest surfaces.
- `screenBox` / `screenLightAlignment` — the largest screen's box, and the distance from its centre to the bright-region centroid (a backlighting proxy); null when no screen is detected.
- `bboxScatter` / `alignmentVariance` — how spread out and how aligned the detected objects are.

**Acoustic (Web Audio, 20s at 10 frames/second):**
- `rmsMean` — overall loudness.
- `rmsVariance` — how much loudness moves across the sample; the single most important acoustic feature (steady vs intermittent).
- `spectralCentroidMean` — brightness of the sound, averaged weighted by loudness so silent frames do not drag it down.
- `speechBandRatio` — share of energy in 300–3400 Hz; a speech-presence proxy.
- `lowFreqRatio` — share of energy below 250 Hz; a traffic/machinery proxy.

Nothing is recorded: the microphone is analysed live into these five numbers.

## The scoring formula

`ELI = Σ(weight × subscore) / Σ(weight)`, computed only over the factors that have evidence. A factor with no evidence (no screen, no sound sample, no furniture detected) is dropped from both the numerator and the denominator, never scored at a midpoint.

Default (Standard) weights:

| Factor | Weight | Reasoning |
|---|---|---|
| Visual clutter | 0.25 | Visual complexity in the field of view is the most consistently studied environmental attention cost. |
| Acoustic load | 0.25 | Intermittent speech has a large, well-replicated effect on concentration. |
| Workspace separation | 0.20 | Separating work and rest zones is a standard behavioural recommendation. |
| Lighting | 0.15 | Light level affects alertness, with wide individual variation. |
| Screen positioning | 0.10 | Real but narrower in effect than the factors above. |
| Colour environment | 0.05 | Weakest evidence base, deliberately weighted low. |

Weights are priors, not truths, and every one is adjustable with a live slider in the app. **Recovery Mode** reweights toward lighting and acoustic load (0.30 each) and screen positioning (0.20), because light and noise sensitivity are cardinal post-concussion symptoms.

## What we trained on, honestly

Calibration is ongoing and the dataset is small: on the order of a dozen real responses at submission, each one a photo plus five self-report questions (concentration, stress, energy, time in the space, and whether it is a usual workspace), collected from volunteers via Discord, classmates, and family. The app shows the live count and never fakes it.

Because of that:
- The population regression is **not yet fitted** — it requires 30 responses, a deliberate floor since fitting six predictors on fewer would be too thin to trust. Below that, the app says so.
- The normalization breakpoints are still **provisional, hand-written values**, stated as such on the result page.
- Intervention targets are **provisional stand-ins** for the seed dataset's 25th percentile, flagged in the UI.

The personalization is built (a hand-written ridge regression with per-coefficient standard errors) and runs the moment there is enough data; it is honestly inert until then.

## What this does not claim

1. It does not claim clutter causes anxiety, or any causal claim about environment and mental health.
2. It does not diagnose anything.
3. It does not claim its priors are personalized until that user has logged enough sessions.
4. It does not replace clinical care. Anyone with persistent post-concussion symptoms should see a clinician.

The framing throughout is cognitive load and self-reported well-being, correlation discovered per user, never population-level causation.

## Privacy architecture

- **Raw photos never leave the browser.** Captured to a canvas, read for features, then discarded. The photo is never shown back to you after extraction, so the discard is visible.
- **Raw audio never leaves the browser.** There is no `MediaRecorder` anywhere in the code; the microphone is analysed live into five numbers.
- **Only numeric feature vectors are stored,** and the server enforces it: a request carrying a string (for example a smuggled base64 image) inside the feature payload is rejected.
- **The database has no image column and no audio column.** That absence is deliberate.
- **No account, no email, no name.** Users are an anonymous handle.

---

## Running it locally

```
npm install
npm run dev      # http://localhost:5220
npm run test     # 122 unit tests
npm run build
```

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · TensorFlow.js + COCO-SSD · Web Audio API · Prisma + PostgreSQL · hand-written ridge regression · deployed on Render.

## Licence

MIT. See [LICENSE](LICENSE).
