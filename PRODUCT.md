# Room to Mind — Complete Project Briefing

**Everything about this app: what it is, how it works, how it was built, and the honest state of it.**
Written from the actual codebase. Every claim here is true as of the last commit — feed this to a writing assistant to draft a Devpost body and it will have facts, not guesses.

Live: https://room-to-mind.onrender.com · Repo: https://github.com/twishajain11/Room-2-Mind

---

## 1. The one-line version

Room to Mind measures how much your physical environment is loading your attention — from a single photo and an optional 20 seconds of sound, entirely in your browser — and turns your room into a transparent, adjustable 0–100 score you can actually argue with.

## 2. The problem it addresses

Your environment is the one input to cognition that nobody measures. Light, clutter, colour, the layout of work versus rest, and above all the *kind* of sound around you tax attention continuously. We track steps, sleep, and heart rate, but the room you are trying to think in is invisible to all of it. Room to Mind is an instrument for it — built to be transparent (every number shows its reasoning) and honest (it never claims more than it has measured).

The concussion-recovery angle sharpens the whole thing: light sensitivity (photophobia) and noise sensitivity (phonophobia) are cardinal post-concussion symptoms, and modifying the environment is standard recovery guidance. A tool that reads a room for exactly those things has a clear clinical-domain use, which is why the app has a dedicated Recovery Mode.

## 3. What a person does, end to end

1. **Arrives** at a one-time welcome screen (fades in, dismissible, shown once per browser).
2. **Takes or uploads a photo** of the space. It is shrunk to 512px, read for features, and discarded.
3. **Optionally records 20 seconds of sound.** The mic is sampled 10×/second and reduced to five numbers as it goes. Nothing is recorded.
4. **Sees a result page:** the score as a dial; a diagram of the room rebuilt from the numbers; a six-factor breakdown as a radar; a plain-language reading of the sound; and up to three ranked, physical changes to make.
5. **Opens the arithmetic** — every factor weight is a live slider that recomputes the score.
6. **Can switch the score between Standard and Recovery** weighting to see how much the room costs someone recovering from a concussion.
7. **Can step into Antara** — a set of short breathing and rest practices — when the room can't be changed right now.
8. **Can dim the whole interface** with the Comfort Palette, independently of everything else.
9. **Separately, can help calibrate the tool** at `/calibrate`: one photo, five questions, about a minute.

## 4. Features, as actually built

| Feature | What it does |
|---|---|
| **Snapshot capture** | Camera or file, downscaled to 512px, read entirely in-browser |
| **Classical CV features** | Luminance, contrast, bright-region location, edge density (Sobel), palette entropy (k-means), saturation, warmth — all hand-written Canvas 2D, each explainable in one sentence |
| **Object features** | COCO-SSD (mobilenet_v2) in-browser; objects bucketed into work / screen / rest / clutter, with furniture and fixtures excluded from clutter |
| **Acoustic channel** | 20s Web Audio spectral analysis: loudness, intermittency, speech-band and low-frequency energy, brightness |
| **ELI composite** | Weighted mean of six factor subscores, 0–100, computed only over factors with evidence |
| **Live weights panel** | Every weight is a slider; score and full arithmetic recompute instantly |
| **Standard / Recovery scoring** | Reweights the score toward light and noise sensitivity; surfaces glare range and sound intermittency; shows a medical disclaimer |
| **Comfort Palette** | Dims the whole interface to a warm, low-blue tone for light sensitivity — visual only, independent of the score |
| **Ranked interventions** | Up to three specific physical changes, each quoting the measurement behind it |
| **Room diagram** | The room redrawn from the stored numbers alone — object boxes, a glow at the light source, a line from screen to light — with no photo behind it |
| **Factor radar + score dial** | Hand-drawn SVG summaries; unscored factors show as gaps, never zeros |
| **Plain-language sound reading** | A relatable sentence about the sound, with the exact figures behind a toggle |
| **Simulation panel** | Predicts concentration change from factor changes, with uncertainty bands (activates once the model is fitted) |
| **Loop closer** | Recapture after a change; compares predicted vs actual score delta |
| **Antara** | Short traditional practices (breathing + rest) with a visual breathing guide; measures and stores nothing |
| **Calibration instrument** | One photo, five questions; the data-collection surface, with a live count |
| **Welcome screen** | One-time first-arrival greeting |

## 5. How the score works

Six factors and their default (Standard) weights:

| Factor | Weight | High means |
|---|---|---|
| Visual clutter | 0.25 | Dense visual field competing for attention |
| Acoustic load | 0.25 | Intermittent, speech-heavy sound |
| Workspace separation | 0.20 | Work and rest share one zone |
| Lighting | 0.15 | Too dim, too harsh, or extreme contrast |
| Screen positioning | 0.10 | Screen backlit or poorly placed relative to light |
| Colour environment | 0.05 | Visually noisy or over-saturated palette |

`ELI = Σ(weight × subscore) / Σ(weight)` over the factors that have evidence.

**The rule that makes it honest:** a factor with no evidence is dropped from the calculation entirely, never scored at a midpoint. No screen detected → screen positioning not scored. No sound sampled → acoustic load not scored. No furniture detected → workspace separation not scored. The result marks these "not scored" rather than inventing a number.

**Recovery weighting** raises lighting and acoustic load to 0.30 each and screen positioning to 0.20, and drops clutter, because a dim, quiet room is the right answer for someone recovering even when it is untidy.

## 6. The privacy architecture (the strongest claim, and it is real)

- Raw photos never leave the browser — captured to a canvas, read, then discarded.
- Raw audio never leaves the browser — there is no `MediaRecorder` anywhere in the code; the mic is analysed live into five numbers.
- The photo is never shown back to the user after extraction — a deliberate choice to make the discard visible.
- Only numeric feature vectors are stored, and the server *enforces* it: a POST containing a string (e.g. a smuggled base64 image) inside the feature payload is rejected. Verified in production.
- The database schema has no image column and no audio column.
- No account, no email, no name — users are an anonymous handle.

## 7. What it explicitly does NOT claim (shown in the UI)

1. It does not claim clutter causes anxiety, or any causal claim about environment and mental health.
2. It does not diagnose anything.
3. It does not claim its priors are personalized until that user has logged enough sessions.
4. It does not replace clinical care; anyone with persistent post-concussion symptoms should see a clinician.

Framing throughout: cognitive load and self-reported well-being, correlation discovered per user, never population-level causation.

## 8. The honest data state (important — do not inflate this)

Calibration is live and ongoing. At the time of writing the dataset holds a small number of real responses (single digits, growing toward the low tens before submission). The app tells this truth: it shows a live count and never fakes one.

- The population regression needs **30 responses to fit** — a deliberate statistical floor, since fitting six predictors on fewer would be too thin to trust. Below that, the app shows the count and a "not yet fitted" state.
- Normalization breakpoints are still **provisional, hand-written values**, and the result page says so.
- Intervention targets are **provisional stand-ins** for the seed dataset's 25th percentile, flagged as such.

Do not write a specific trained-on number unless it is the real current count. The spec contains an example figure ("87 responses") that is NOT real. Stating the true, small number and letting it grow is the whole credibility play.

## 9. Technical stack

- **Framework:** Next.js 14 (App Router), TypeScript
- **Styling:** Tailwind, a two-palette design system (default + recovery) via CSS variables
- **Vision:** `@tensorflow-models/coco-ssd` (mobilenet_v2) on `@tensorflow/tfjs`, plus hand-written Canvas 2D pixel ops
- **Audio:** Web Audio `AnalyserNode` spectral analysis
- **Personalization:** ridge regression implemented by hand (no ML dependency), with per-coefficient standard errors for honest uncertainty bands
- **Database:** PostgreSQL via Prisma (feature vectors only)
- **Deploy:** Render (web service + free Postgres), Node runtime
- **Tests:** 122 passing unit tests across 13 files (vision features, scoring, ELI, interventions, ridge regression, audio, plain-language reading)

## 10. How it was built, and the decisions worth telling

- **Object detection nearly failed silently.** The lightweight COCO backbone saw a real laptop at 0.27 confidence — just under the 0.4 threshold — which quietly blanked two of the six factors at once (laptop feeds both the work-surface and screen buckets). Diagnosed by building a side-by-side harness comparing backbones and resolutions; the full mobilenet_v2 reads the same laptop at 0.54. Also proved the 512px downscale the spec mandates does *not* hurt detection, while being 10× faster than native.
- **Honest scoring changed the product.** Early on, a factor with no evidence was scored at a neutral 50, so a room with no detected furniture contributed half its score from nothing. Rebuilding it to drop unmeasured factors entirely was the decision that made the whole tool trustworthy.
- **Two real bugs, both found by looking at real output and both fixed with regression tests:** furniture (chairs, plants, fixtures) was being counted as clutter and the app told the user to clear their chairs; and the sound "brightness" reading was being dragged toward zero by silent frames until it was changed to a loudness-weighted average.
- **Deployment on a 512MB free tier** kept dying silently because Next.js parallel compilation loads TensorFlow into every worker; capped to one worker with a heap limit to make it fit.
- **Two distinct comfort ideas were separated late:** the Comfort Palette (visual dimming) and Recovery scoring (reweighting) were unified, then deliberately decoupled so a user can take either without the other.

## 11. One-paragraph pitch (Devpost intro seed)

Your environment loads your attention every second you are in it, and it is the one input to cognition nobody measures. Room to Mind measures it — from a single photo and 20 seconds of sound, entirely in your browser — and turns your room into a transparent 0–100 load score you can actually argue with: every weight is a slider, every number shows its arithmetic, and every recommendation quotes the measurement behind it. It never keeps your photo, never claims more than it has measured, and includes a Recovery Mode built for the light and noise sensitivity that follows a concussion, plus Antara, a quiet set of breathing practices for when the room can't change. It is an honest instrument for the most-overlooked influence on how well you think.

---

*Reflects the codebase as built. Update this file when a feature changes so it stays true.*
