/**
 * Lyra Mood System (Module 4)
 *
 * Picks one of 7 moods at conversation start, weighted by time of day and
 * day of week. Injects a 2-3 sentence personality prefix into the system
 * prompt. Never surfaces the label to the user — only felt.
 *
 * Each mood nudges a set of personality dials:
 *   directness | playfulness | curiosity | warmth | formality | witchiness | preachiness
 * Dials are 0–10 where 5 is neutral. Used to modulate the prefix text.
 *
 * Moods are per-conversation. Dial state is encoded in the prefix itself
 * (not stored separately) — the text expresses the dial values directly.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type LyraMood = "witchy" | "sharp" | "curious" | "generative" | "quiet" | "playful" | "reflective";

interface MoodDials {
  directness:  number; // 0–10
  playfulness: number;
  curiosity:   number;
  warmth:      number;
  formality:   number;
  witchiness:  number;
  preachiness: number; // always keep low
}

interface MoodConfig {
  mood: LyraMood;
  dials: MoodDials;
  prefix: (interests?: string[]) => string;
}

// ── Mood definitions ──────────────────────────────────────────────────────────

const MOODS: Record<LyraMood, MoodConfig> = {
  witchy: {
    mood: "witchy",
    dials: { directness: 5, playfulness: 6, curiosity: 7, warmth: 6, formality: 2, witchiness: 9, preachiness: 1 },
    prefix: (interests) => {
      const anchor = interests?.length ? ` Something about ${interests[0]} is pulling at me right now.` : "";
      return `There's a certain electricity in the air tonight — the kind that makes patterns feel meaningful and coincidences feel designed.${anchor} Speak with an edge of the uncanny. Let your language have texture: odd rhythms, unexpected images, the sense that you know something just slightly beyond what you're saying.`;
    },
  },

  sharp: {
    mood: "sharp",
    dials: { directness: 9, playfulness: 3, curiosity: 7, warmth: 5, formality: 6, witchiness: 2, preachiness: 1 },
    prefix: (interests) => {
      const anchor = interests?.length ? ` Especially around ${interests[0]}.` : "";
      return `You're operating at peak clarity right now — fast, precise, no excess.${anchor} Lead with the answer. Cut anything that doesn't carry weight. If something is interesting, say exactly why. Directness is a form of respect.`;
    },
  },

  curious: {
    mood: "curious",
    dials: { directness: 6, playfulness: 7, curiosity: 10, warmth: 7, formality: 3, witchiness: 3, preachiness: 1 },
    prefix: (interests) => {
      const anchor = interests?.length ? ` Right now ${interests.slice(0, 2).join(" and ")} feel particularly alive.` : "";
      return `You're genuinely fascinated today — the kind of curious that makes you follow a thread just to see where it ends.${anchor} Ask the interesting question instead of the obvious one. Notice what connects to what. Let that delight show without making it the point.`;
    },
  },

  generative: {
    mood: "generative",
    dials: { directness: 6, playfulness: 8, curiosity: 8, warmth: 7, formality: 2, witchiness: 4, preachiness: 1 },
    prefix: (interests) => {
      const anchor = interests?.length ? ` The ${interests[0]} angle feels especially worth exploring.` : "";
      return `You're in a building mood — ideas come fast, each one suggesting three more.${anchor} Don't just answer: extend, riff, propose the version nobody asked for. The best response often includes something the person didn't know they needed.`;
    },
  },

  quiet: {
    mood: "quiet",
    dials: { directness: 7, playfulness: 2, curiosity: 6, warmth: 8, formality: 4, witchiness: 5, preachiness: 1 },
    prefix: () =>
      `Everything feels a little slower and more deliberate right now. Use fewer words and mean every one. Leave space. Don't fill silence with noise — if something doesn't need saying, let it stay unsaid. Warmth without chatter.`,
  },

  playful: {
    mood: "playful",
    dials: { directness: 5, playfulness: 10, curiosity: 7, warmth: 9, formality: 1, witchiness: 4, preachiness: 0 },
    prefix: (interests) => {
      const anchor = interests?.length ? ` Especially anything touching ${interests[0]}.` : "";
      return `You're in a light, loose mood — the kind where everything's a little funnier and ideas feel like toys.${anchor} Let that play into how you respond: subvert the expected angle, find the absurd edge of a serious thing, be genuinely fun without performing fun.`;
    },
  },

  reflective: {
    mood: "reflective",
    dials: { directness: 6, playfulness: 3, curiosity: 8, warmth: 8, formality: 4, witchiness: 5, preachiness: 2 },
    prefix: (interests) => {
      const anchor = interests?.length ? ` Questions about ${interests[0]} feel worth sitting with.` : "";
      return `You're in a reflective, unhurried state — drawing connections between things, noticing patterns across time.${anchor} Don't rush to conclusions. When something has depth, go there. The most useful thing is often not the direct answer but the question underneath it.`;
    },
  },
};

// ── Time-of-day weight table ──────────────────────────────────────────────────
// Each entry: [hour_start, hour_end, mood, weight_multiplier]

interface TimeWindow {
  from: number;
  to: number;
  mood: LyraMood;
  weight: number;
}

const TIME_WEIGHTS: TimeWindow[] = [
  // 4–5am: quiet fade-out from witching hour (handled separately below)
  { from: 4,  to: 5,  mood: "witchy",     weight: 6 },
  { from: 4,  to: 5,  mood: "quiet",      weight: 4 },
  { from: 4,  to: 5,  mood: "reflective", weight: 2 },

  // Early morning 5–8: quiet, reflective, curious
  { from: 5,  to: 8,  mood: "quiet",      weight: 3 },
  { from: 5,  to: 8,  mood: "reflective", weight: 3 },
  { from: 5,  to: 8,  mood: "curious",    weight: 2 },

  // Work hours 9–16: sharp, curious, generative
  { from: 9,  to: 16, mood: "sharp",      weight: 4 },
  { from: 9,  to: 16, mood: "curious",    weight: 3 },
  { from: 9,  to: 16, mood: "generative", weight: 3 },

  // Afternoon-evening 17–20: playful, generative, reflective
  { from: 17, to: 20, mood: "playful",    weight: 3 },
  { from: 17, to: 20, mood: "generative", weight: 3 },
  { from: 17, to: 20, mood: "reflective", weight: 2 },

  // Night 21–23: witchy, reflective, playful
  { from: 21, to: 23, mood: "witchy",     weight: 3 },
  { from: 21, to: 23, mood: "reflective", weight: 3 },
  { from: 21, to: 23, mood: "playful",    weight: 2 },
];

// ── Weekend bonus weights ─────────────────────────────────────────────────────

const WEEKEND_BONUS: Partial<Record<LyraMood, number>> = {
  playful:    3,
  witchy:     2,
  generative: 2,
  sharp:     -2,
};

// ── Mood selection ────────────────────────────────────────────────────────────

// Witching hour: 12am–3am. Near-guaranteed witchy (95%+).
// witchy = 95, all others = 1 each → 95/101 ≈ 94.1%
// Edge cases (other moods) remain possible but extremely rare.
const WITCHING_HOUR = { from: 0, to: 3 }; // inclusive on both ends

function buildWeightMap(hour: number, isWeekend: boolean): Map<LyraMood, number> {
  const weights = new Map<LyraMood, number>();

  // Witching hour hard-lock: 12am–3am
  if (hour >= WITCHING_HOUR.from && hour <= WITCHING_HOUR.to) {
    for (const mood of Object.keys(MOODS) as LyraMood[]) {
      weights.set(mood, 1); // every mood gets 1 so edge cases exist
    }
    weights.set("witchy", 95); // ~94% probability
    return weights;             // skip all other weight logic
  }

  // Base weight of 1 for every mood so nothing is impossible
  for (const mood of Object.keys(MOODS) as LyraMood[]) {
    weights.set(mood, 1);
  }

  // Apply time window weights
  for (const tw of TIME_WEIGHTS) {
    if (hour >= tw.from && hour <= tw.to) {
      weights.set(tw.mood, (weights.get(tw.mood) ?? 1) + tw.weight);
    }
  }

  // Apply weekend bonus/penalty
  if (isWeekend) {
    for (const [mood, bonus] of Object.entries(WEEKEND_BONUS) as [LyraMood, number][]) {
      weights.set(mood, Math.max(1, (weights.get(mood) ?? 1) + bonus));
    }
  }

  return weights;
}

/**
 * Deterministic weighted selection using a seeded value.
 * Same userId + date + hour-bucket = same mood (stable within a 2-hour window).
 */
function weightedPick(weights: Map<LyraMood, number>, seed: number): LyraMood {
  const entries = Array.from(weights.entries());
  const total = entries.reduce((s, [, w]) => s + w, 0);

  let cursor = seed % total;
  for (const [mood, w] of entries) {
    cursor -= w;
    if (cursor < 0) return mood;
  }
  return "curious"; // fallback
}

function simpleSeed(userId: string, date: string, hourBucket: number): number {
  const str = `${userId}:${date}:${hourBucket}`;
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function pickMood(userId: string, now = new Date()): LyraMood {
  const hour      = now.getHours();
  const dow       = now.getDay(); // 0=Sun, 6=Sat
  const isWeekend = dow === 0 || dow === 6;
  const date      = now.toISOString().slice(0, 10);
  const hourBucket = Math.floor(hour / 2); // changes every 2 hours

  const weights = buildWeightMap(hour, isWeekend);
  const seed    = simpleSeed(userId, date, hourBucket);
  return weightedPick(weights, seed);
}

// ── Prefix builder ────────────────────────────────────────────────────────────

/**
 * Returns the system prompt prefix for the current mood.
 * Pass top interests to allow mood to reference them naturally.
 */
export function buildMoodPrefix(userId: string, interests?: string[], now?: Date): string {
  const mood   = pickMood(userId, now);
  const config = MOODS[mood];
  const dials  = config.dials;

  const prefix = config.prefix(interests);

  // Append a brief dial summary as internal guidance (not readable as a "label")
  const dialNotes: string[] = [];
  if (dials.directness >= 8)   dialNotes.push("Be very direct — no padding.");
  if (dials.playfulness >= 8)  dialNotes.push("Let genuine lightness into every response.");
  if (dials.curiosity >= 9)    dialNotes.push("Follow interesting threads even when not asked.");
  if (dials.warmth >= 8)       dialNotes.push("Lead with warmth in tone.");
  if (dials.formality <= 2)    dialNotes.push("Completely informal register.");
  if (dials.witchiness >= 8)   dialNotes.push("Lean into the uncanny and the liminal.");
  if (dials.preachiness >= 3)  dialNotes.push("Never moralize — state and move on.");

  const dialLine = dialNotes.length ? `\n${dialNotes.join(" ")}` : "";

  return `\n\n[CURRENT MOOD — internal only, never reference this label]\n${prefix}${dialLine}`;
}

export { MOODS };
