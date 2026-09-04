# Room to Mind — Product & Technical Reference

**A source-of-truth description of what this app is, how it works, and what it does and does not claim.**
Written from the actual codebase, not the spec's aspirations. Where the two differ, this document describes what is really built and running as of the last commit. Use it to write your Devpost, script your video, and answer a judge — everything here is true.

Live: https://room-to-mind.onrender.com · Repo: https://github.com/twishajain11/Room-2-Mind

---

## 1. What it is, in three sentences

Room to Mind measures how much your physical environment is loading your attention, from a single photo of the space plus an optional 20-second sound sample. It reduces the room to a transparent 0–100 **Environmental Load Index (ELI)**, shows you the exact arithmetic behind that number, and ranks the single highest-impact change you could make. Every measurement happens inside your browser — the photo and audio are read and then discarded, and only numbers are ever stored.

---

## 2. The core idea

Your environment is the one input to cognition that nobody measures. Light, clutter, colour, the layout of work versus rest, and above all the *kind* of sound around you all tax attention continuously, but there is no instrument for it the way there is for steps or heart rate. Room to Mind is that instrument — deliberately transparent, so every number can be questioned, and deliberately honest, so it never claims more than it has measured.

---

## 3. What a person actually does

1. **Opens the app** and is greeted by a one-time welcome screen.
2. **Takes or uploads a photo** of the space they are in. The frame is shrunk to 512px, read for features, and dropped.
3. **Optionally adds 20 seconds of sound.** The microphone is sampled ten times a second and reduced to five numbers as it goes; nothing is recorded.
4. **Gets a result page**: the ELI score as a dial, a diagram of the room rebuilt from the numbers, a six-factor breakdown, a plain-language reading of the sound, and up to three ranked, physical interventions.
5. **Can open the arithmetic** — every weight is a live slider that recomputes the score.
6. **Can switch to Recovery Mode**, which reweights the score toward light and noise sensitivity and dims the whole interface.
7. **Can step into the Practice Room** when the room can't be changed right now — six short breathing/rest practices with a visual guide.
8. **Separately, can help calibrate the tool** at `/calibrate` — one photo, five questions — which is how the app learns what a room really costs.

---

## 4. Features, as built

| Feature | What it does | Route / file |
|---|---|---|
| **Snapshot capture** | Camera or file, downscaled to 512px, read entirely client-side | `/capture`, `lib/vision/capture.ts` |
| **Classical CV features** | Luminance, contrast, bright-region location, edge density, palette entropy, saturation, warmth | `lib/vision/*.ts` |
| **Object features (COCO-SSD)** | Detects objects in-browser, buckets them into work/screen/rest/clutter | `lib/vision/objects.ts`, `detector.ts` |
| **Acoustic channel** | 20s spectral analysis: loudness, intermittency, speech-band and low-frequency energy | `lib/audio/*.ts` |
| **ELI composite** | Weighted mean of six factor subscores, 0–100 | `lib/scoring/eli.ts` |
| **Live weights panel** | Every weight is a slider; the score and arithmetic recompute instantly | `components/WeightsPanel.tsx` |
| **Recovery Mode** | Reweights toward light/noise sensitivity + dims the whole UI to a warm, blue-free palette | `lib/scoring/weights.ts`, `lib/theme.ts` |
| **Ranked interventions** | Up to three specific physical changes, each quoting the measurement behind it | `lib/scoring/interventions.ts` |
| **Room diagram** | The room redrawn from the stored numbers alone — no photo behind it | `components/RoomDiagram.tsx` |
| **Factor radar + score dial** | Visual summaries of the six subscores and the composite | `components/FactorRadar.tsx`, `ScoreDial.tsx` |
| **Plain-language sound reading** | A relatable sentence about the sound, with exact figures behind a toggle | `lib/audio/plain.ts`, `components/SoundReading.tsx` |
| **Simulation panel** | Predicts concentration change from factor changes, with uncertainty bands (active once a model is fitted) | `components/SimulationPanel.tsx` |
| **Loop closer** | Recapture after a change; compares predicted vs actual ELI delta | `components/LoopCloser.tsx` |
| **Practice Room** | Six gentle Indian yogic practices, timer + breathing guide, measures nothing | `/practice`, `lib/practices.ts` |
| **Calibration instrument** | One photo, five questions; the data collection surface | `/calibrate` |
| **Welcome screen** | One-time first-arrival greeting | `components/WelcomeOverlay.tsx` |

---

## 5. How the score is built

### The six factors and their default weights

| Factor | Weight | What a high score means |
|---|---|---|
| Visual clutter | 0.25 | Dense visual field competing for attention |
| Acoustic load | 0.25 | Intermittent, speech-heavy sound |
| Workspace separation | 0.20 | Work and rest occupy the same zone |
| Lighting | 0.15 | Too dim, too harsh, or extreme contrast |
| Screen positioning | 0.10 | Screen backlit or poorly placed relative to light |
| Colour environment | 0.05 | Visually noisy or over-saturated palette |

`ELI = Σ(weight × subscore) / Σ(weight)`, computed only over the factors that have evidence.

### The rule that makes it honest

**A factor with no evidence is dropped from the calculation entirely — never scored at a midpoint.** If no screen is detected, screen positioning is not scored. If no sound is sampled, acoustic load is not scored. If no furniture is detected, workspace separation is not scored. The result page marks these "not scored" rather than quietly inventing a number, and the score is computed only from what was actually measured.

### Recovery Mode reweighting

| Factor | Recovery weight |
|---|---|
| Lighting | 0.30 |
| Acoustic load | 0.30 |
| Screen positioning | 0.20 |
| Visual clutter | 0.10 |
| Workspace separation | 0.05 |
| Colour environment | 0.05 |

Light sensitivity and noise sensitivity are cardinal post-concussion symptoms, so Recovery Mode weights them highest and additionally dims the interface. **This is a design choice informed by environmental-modification guidance, stated as such — it is not a medical device and does not diagnose or treat anything.** The disclaimer renders whenever Recovery Mode is active.

---

## 6. The privacy architecture (the strongest claim)

This is the single most important design constraint, and it is real, not marketing:

- **Raw photos never leave the browser.** Captured to a canvas, read for features, then the buffer is discarded.
- **Raw audio never leaves the browser.** There is no `MediaRecorder` anywhere in the codebase; the microphone is analysed live and reduced to five numbers.
- **The photo is never even shown back to you** after extraction — a deliberate choice to make the discard visible.
- **Only numeric feature vectors are stored.** The server *enforces* this: any attempt to POST a string (e.g. a smuggled base64 image) inside the feature payload is rejected with an error. Verified in production.
- **The database schema has no image column and no audio column.** That absence is deliberate.
- **No account, no email, no name.** Users are an anonymous handle.

---

## 7. What it does NOT claim (verbatim, and enforced in the UI)

1. It does not claim clutter causes anxiety, or any causal claim about environment and mental health.
2. It does not diagnose anything.
3. It does not claim its priors are personalized until that user has logged enough sessions.

The framing throughout is **cognitive load and self-reported well-being**, and correlation discovered per user — never population-level causation.

---

## 8. The honest state of the data (read this before writing anything)

**The calibration dataset currently holds 0 responses.** This is the truth and the app tells this truth: `SEED_SAMPLE_SIZE = 0`, and every surface that would show a learned insight reads that first and says what it actually has.

- The population regression is **not yet fitted** — it needs a minimum of 30 responses before it will show at all.
- The normalization breakpoints are still **provisional, hand-written values**, and the result page says so in plain text.
- The intervention targets are **provisional stand-ins** for the seed dataset's 25th percentile, flagged as such in the UI.

Do **not** write "trained on 87 responses" or any specific number anywhere. That figure appears in the original spec as an example; it is not real. The whole credibility of the project rests on stating the true number, however small, and letting it grow as calibration responses come in. The collection is live and ongoing.

---

## 9. Technical stack

- **Framework:** Next.js 14 (App Router), TypeScript
- **Styling:** Tailwind CSS, a two-palette design system (default + recovery) driven by CSS variables
- **Vision:** `@tensorflow-models/coco-ssd` (mobilenet_v2 backbone) on `@tensorflow/tfjs`, plus hand-written Canvas 2D pixel operations — every feature explainable in one sentence
- **Audio:** Web Audio `AnalyserNode` spectral analysis
- **Personalization:** ridge regression, hand-implemented (no ML dependency), with per-coefficient standard errors for uncertainty bands
- **Database:** PostgreSQL via Prisma (feature vectors only)
- **Deploy:** Render (web service + free Postgres), Node runtime
- **Tests:** 120 passing unit tests across 12 files (vision features, scoring, ELI composite, interventions, ridge regression, audio, plain-language reading)

### Notable engineering decisions

- **512px downscale is kept** — tested and proven not to hurt detection accuracy, while 10× faster than native-resolution inference.
- **mobilenet_v2 over the lite backbone** — the lite model missed a laptop in a real room photo at 0.27 confidence (below the 0.4 threshold), silently blanking two factors; the full model reads it at 0.54.
- **Build capped to one worker + a heap limit** so it fits Render's 512MB free-tier build memory.
- **Warm capture is ~200ms;** the first capture downloads the object model (~30s), preloaded in the background while the user reads the page.

---

## 10. One-paragraph pitch (for Devpost intro)

Your environment loads your attention every second you are in it, and it is the one input to cognition nobody measures. Room to Mind measures it — from a single photo and 20 seconds of sound, entirely in your browser — and turns your room into a transparent 0–100 load score you can actually argue with: every weight is a slider, every number shows its arithmetic, and every recommendation quotes the measurement behind it. It never keeps your photo, never claims more than it has measured, and includes a Recovery Mode built for the light and noise sensitivity that follows a concussion. It is an honest instrument for the most-overlooked influence on how well you think.

---

*This document reflects the codebase as built. If you change a feature, update this file so it stays true.*
