import type { FactorKey } from "@/lib/scoring/weights";

/**
 * The practice library.
 *
 * These are traditional Indian yogic practices, chosen for one situation: the
 * load index came back high and the room cannot be changed right now. They are
 * a way to spend five minutes, not a treatment.
 *
 * WHAT IS DELIBERATELY EXCLUDED, and why:
 *
 *  - Kapalabhati and Bhastrika. Rapid, forceful breathing that raises
 *    intracranial pressure and commonly provokes dizziness. Wrong for anyone
 *    with a head injury, and this product has a Recovery Mode aimed at exactly
 *    those people.
 *  - Trataka, steady candle gazing. Sustained fixation on a bright point,
 *    offered to an audience selected for light sensitivity.
 *  - Inversions of any kind, including Sarvangasana and Sirsasana.
 *  - Anything involving fast head movement or held breath beyond a few counts,
 *    because vestibular symptoms are common post-concussion.
 *
 * What remains is slow, seated, eyes-closed or eyes-rested, and stoppable at
 * any second.
 */

export interface Practice {
  id: string;
  /** Traditional name, as it is actually called. */
  sanskrit: string;
  english: string;
  /** Default length in minutes. */
  minutes: number;
  /** One line on what this is for, in the product's own terms. */
  purpose: string;
  /** The environmental factor this pairs with, when there is an honest link. */
  pairsWith: FactorKey | null;
  steps: string[];
  /** Shown before the timer starts, every time. */
  caution: string;
  /**
   * Breath pacing in seconds. When present the room shows a pacer; when null it
   * is a rest practice and the timer simply runs.
   */
  pace: { inhale: number; hold: number; exhale: number } | null;
  /** Safe for the concussion-recovery context. */
  gentle: true;
}

export const PRACTICES: Practice[] = [
  {
    id: "deergha-swasam",
    sanskrit: "Deergha Swasam",
    english: "Three-part breath",
    minutes: 3,
    purpose:
      "The simplest place to start. Slows the breath without asking you to learn a pattern first.",
    pairsWith: null,
    pace: { inhale: 4, hold: 0, exhale: 6 },
    steps: [
      "Sit however you are already sitting. You do not need the floor.",
      "Let the breath go all the way out first.",
      "Breathe in low, into the belly, then the ribs, then the upper chest.",
      "Let it out slowly in the same order, belly last.",
      "The out-breath should be longer than the in-breath. Nothing else matters.",
    ],
    caution: "If counting makes you tense, drop the count and just breathe slowly.",
    gentle: true,
  },
  {
    id: "anulom-vilom",
    sanskrit: "Anulom Vilom",
    english: "Alternate nostril breathing",
    minutes: 4,
    purpose: "Gives attention one small, steady thing to hold while the room stays as it is.",
    pairsWith: "visualClutter",
    pace: { inhale: 4, hold: 2, exhale: 6 },
    steps: [
      "Rest your left hand anywhere. Bring your right hand to your face.",
      "Close the right nostril with the thumb. Breathe in through the left.",
      "Close both briefly. Nothing forced, just a pause.",
      "Release the right nostril and breathe out through it.",
      "Breathe in through the right, pause, out through the left. That is one round.",
    ],
    caution:
      "Keep the pause short and comfortable. If you feel light-headed, stop and breathe normally.",
    gentle: true,
  },
  {
    id: "bhramari",
    sanskrit: "Bhramari",
    english: "Humming bee breath",
    minutes: 3,
    purpose:
      "Replaces an unpredictable room with a sound you make yourself, at a level you choose.",
    pairsWith: "acousticLoad",
    pace: { inhale: 4, hold: 0, exhale: 8 },
    steps: [
      "Close your eyes. Rest your fingers lightly over your ears if that feels good.",
      "Breathe in through the nose, unhurried.",
      "Breathe out humming, low and quiet, through the whole out-breath.",
      "Let the hum be soft. This is not a performance.",
      "Notice that the sound is steady, which is the point.",
    ],
    caution: "Keep the volume low. Stop if the humming feels unpleasant in your head or ears.",
    gentle: true,
  },
  {
    id: "palming",
    sanskrit: "Netra Vishram",
    english: "Palming, an eye rest",
    minutes: 2,
    purpose: "Total darkness for the eyes, which no amount of screen dimming can give them.",
    pairsWith: "lighting",
    pace: null,
    steps: [
      "Rub your palms together until they are warm.",
      "Cup them gently over closed eyes. No pressure on the eyeballs at all.",
      "Block the light without touching the lids.",
      "Rest there and let the breath do whatever it wants.",
      "Take the hands away slowly and open your eyes slowly.",
    ],
    caution: "No pressure on the eyes. If you have any eye injury, skip this one.",
    gentle: true,
  },
  {
    id: "sheetali",
    sanskrit: "Sheetali",
    english: "Cooling breath",
    minutes: 2,
    purpose: "For when the room is hot and close as well as loud.",
    pairsWith: null,
    pace: { inhale: 4, hold: 2, exhale: 6 },
    steps: [
      "Curl the tongue into a tube if you can. If you cannot, part your teeth slightly instead.",
      "Breathe in through the tongue or teeth. It will feel cool.",
      "Close the mouth and pause briefly.",
      "Breathe out through the nose.",
    ],
    caution: "Skip this one if you are already cold, or if your throat is sore.",
    gentle: true,
  },
  {
    id: "shavasana",
    sanskrit: "Shavasana",
    english: "Stillness",
    minutes: 5,
    purpose: "Doing nothing on purpose, which is different from doing nothing by accident.",
    pairsWith: "workspaceSeparation",
    pace: null,
    steps: [
      "Lie down if you can. Sit back if you cannot.",
      "Let your arms fall away from your sides. Let your feet fall open.",
      "Close your eyes.",
      "Work up from the feet, letting each part get heavier.",
      "Stay there until the timer ends. Falling asleep is allowed.",
    ],
    caution: "Get up slowly at the end.",
    gentle: true,
  },
];

export const PRACTICE_BY_ID: Record<string, Practice> = Object.fromEntries(
  PRACTICES.map((p) => [p.id, p])
);

/** Practices that pair with a factor, strongest match first. */
export function practicesFor(factor: FactorKey | null): Practice[] {
  if (!factor) return PRACTICES;
  return [...PRACTICES].sort((a, b) => {
    const aMatch = a.pairsWith === factor ? 0 : 1;
    const bMatch = b.pairsWith === factor ? 0 : 1;
    return aMatch - bMatch;
  });
}

/** Shown once, at the top of the room, in both modes. */
export const PRACTICE_DISCLAIMER =
  "These are traditional practices offered as a way to spend a few minutes, not as treatment for anything. Room to Mind is not a medical device. If you are recovering from a concussion or any injury, follow the protocol your clinician gave you, and stop any practice that makes your symptoms worse.";
