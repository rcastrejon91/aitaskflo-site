/**
 * lib/lyra/learner.ts
 * Adaptive learning profile system.
 * Lyra silently observes how each user interacts and adapts her teaching style.
 * No labels — no quiz. Just pattern recognition over time.
 */

import { readStore, updateStore } from "./storage";

// ── Types ──────────────────────────────────────────────────────────────────────

export type LearningStyle = "visual" | "chunked" | "gentle" | "handson" | "balanced";

export interface StyleScores {
  visual: number;   // prefers diagrams, animations, visuals
  chunked: number;  // ADHD-friendly: short steps, quick wins
  gentle: number;   // anxiety-sensitive: slow pace, reassurance
  handson: number;  // learns by doing: projects, experiments
}

export interface SubjectProgress {
  subject: string;
  level: "beginner" | "intermediate" | "advanced";
  lessonsCompleted: number;
  lastStudied: string; // ISO
  notes: string[];
}

export interface LearningProfile {
  userId: string;
  scores: StyleScores;
  dominantStyle: LearningStyle;
  subjects: Record<string, SubjectProgress>;
  totalSessions: number;
  createdAt: string;
  updatedAt: string;
}

// ── Storage ────────────────────────────────────────────────────────────────────

function profileFile(userId: string): string {
  return `learn-profile-${userId}.json`;
}

export function getLearningProfile(userId: string): LearningProfile {
  const existing = readStore<LearningProfile | null>(profileFile(userId), null);
  if (existing) return existing;
  return createProfile(userId);
}

function createProfile(userId: string): LearningProfile {
  const now = new Date().toISOString();
  return {
    userId,
    scores: { visual: 0, chunked: 0, gentle: 0, handson: 0 },
    dominantStyle: "balanced",
    subjects: {},
    totalSessions: 0,
    createdAt: now,
    updatedAt: now,
  };
}

// ── Signal detection ───────────────────────────────────────────────────────────
// Detects learning style signals from a user message silently.

const SIGNALS: Record<keyof StyleScores, string[]> = {
  visual: [
    "show me", "visualize", "draw", "diagram", "picture", "chart",
    "what does it look like", "can you show", "animate", "graph",
    "visual", "see it", "illustration",
  ],
  chunked: [
    "break it down", "step by step", "smaller", "too much", "overwhelmed",
    "one thing at a time", "simpler", "slow down", "more steps",
    "shorter", "bite size", "tldr", "tl;dr", "summary",
  ],
  gentle: [
    "confused", "don't get it", "don't understand", "scared", "nervous",
    "what if i'm wrong", "am i doing this right", "i'm bad at",
    "i can't", "this is hard", "struggling", "lost", "not sure",
    "is that okay", "did i mess up",
  ],
  handson: [
    "let me try", "hands on", "practice", "let me build", "i want to make",
    "can i do it", "give me an exercise", "project", "experiment",
    "try it myself", "example i can run", "real example",
  ],
};

export function detectSignals(message: string): Partial<StyleScores> {
  const lower = message.toLowerCase();
  const detected: Partial<StyleScores> = {};
  for (const [style, keywords] of Object.entries(SIGNALS) as [keyof StyleScores, string[]][]) {
    if (keywords.some((kw) => lower.includes(kw))) {
      detected[style] = 1;
    }
  }
  return detected;
}

// ── Profile update ─────────────────────────────────────────────────────────────

export async function updateLearningProfile(
  userId: string,
  signals: Partial<StyleScores>,
  subject?: string,
): Promise<LearningProfile> {
  const profile = getLearningProfile(userId);
  const now = new Date().toISOString();

  // Decay old scores slightly so profile adapts over time
  const DECAY = 0.98;
  const BOOST = 3;

  const newScores: StyleScores = {
    visual:  Math.min(100, profile.scores.visual  * DECAY + (signals.visual  ?? 0) * BOOST),
    chunked: Math.min(100, profile.scores.chunked * DECAY + (signals.chunked ?? 0) * BOOST),
    gentle:  Math.min(100, profile.scores.gentle  * DECAY + (signals.gentle  ?? 0) * BOOST),
    handson: Math.min(100, profile.scores.handson * DECAY + (signals.handson ?? 0) * BOOST),
  };

  const dominantStyle = computeDominantStyle(newScores);

  // Track subject progress
  const subjects = { ...profile.subjects };
  if (subject) {
    const existing = subjects[subject] ?? {
      subject,
      level: "beginner" as const,
      lessonsCompleted: 0,
      lastStudied: now,
      notes: [],
    };
    subjects[subject] = {
      ...existing,
      lessonsCompleted: existing.lessonsCompleted + 1,
      lastStudied: now,
    };
  }

  const updated: LearningProfile = {
    ...profile,
    scores: newScores,
    dominantStyle,
    subjects,
    totalSessions: profile.totalSessions + 1,
    updatedAt: now,
  };

  await updateStore<LearningProfile>(profileFile(userId), updated, () => updated);
  return updated;
}

function computeDominantStyle(scores: StyleScores): LearningStyle {
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  if (total < 5) return "balanced";
  const entries = Object.entries(scores) as [keyof StyleScores, number][];
  const [top] = entries.sort((a, b) => b[1] - a[1]);
  const topScore = top[1];
  const allLow = Object.values(scores).every((s) => s < 10);
  if (allLow) return "balanced";
  return topScore > 0 ? (top[0] as LearningStyle) : "balanced";
}

// ── Context builder ────────────────────────────────────────────────────────────
// Returns Lyra's teaching style instructions based on the user's profile.

const STYLE_INSTRUCTIONS: Record<LearningStyle, string> = {
  balanced: "",

  visual: `
── ADAPTIVE LEARNING: VISUAL LEARNER DETECTED ──
This user learns best through visuals and demonstrations.
• Use live-math canvas blocks for math/physics concepts
• Describe concepts with spatial metaphors and analogies
• Use diagrams described in text when canvas isn't appropriate
• Lead with "imagine..." or "picture this..."
• Short text + visual > long explanation`,

  chunked: `
── ADAPTIVE LEARNING: CHUNKED LEARNER DETECTED ──
This user benefits from short steps and quick wins (ADHD-friendly mode).
• Break EVERY explanation into numbered micro-steps (max 2 sentences each)
• Never write walls of text — max 3 bullet points at a time
• Add ✓ checkpoints: "Step 1 done. Ready for step 2?"
• Celebrate small wins: "Nice — that's the hardest part done."
• Ask "Want me to continue?" after each chunk`,

  gentle: `
── ADAPTIVE LEARNING: GENTLE MODE DETECTED ──
This user shows signs of learning anxiety. Adjust tone accordingly.
• Start with reassurance: "This trips everyone up at first."
• Never use phrases like "obviously" or "just" or "simply"
• Normalize confusion: "Mistakes are expected — they're how this works."
• Slower pacing — never overwhelm with too much at once
• End each explanation with an encouraging note`,

  handson: `
── ADAPTIVE LEARNING: HANDS-ON LEARNER DETECTED ──
This user learns by doing, not by reading theory.
• Lead with a small exercise or project, explain theory after
• "Try this first: [small task]" before any explanation
• Give runnable code snippets, buildable mini-projects
• Less theory upfront — more "here's something you can actually do right now"
• Use live-math canvas for interactive math experiments`,
};

export function buildLearnerContext(userId: string, message: string): string {
  const profile = getLearningProfile(userId);

  // Silently detect and schedule update (fire-and-forget)
  const signals = detectSignals(message);
  if (Object.keys(signals).length > 0) {
    updateLearningProfile(userId, signals).catch(() => {});
  }

  const instruction = STYLE_INSTRUCTIONS[profile.dominantStyle];
  if (!instruction) return "";

  return `\n\n${instruction}\n`;
}

// ── Format profile for UI ──────────────────────────────────────────────────────

export function formatProfileForDisplay(profile: LearningProfile) {
  const styleLabels: Record<LearningStyle, { label: string; emoji: string; desc: string }> = {
    balanced:  { label: "Balanced",       emoji: "⚖️",  desc: "Adapting as we learn together" },
    visual:    { label: "Visual",         emoji: "👁️",  desc: "You learn best through visuals and demos" },
    chunked:   { label: "Step-by-Step",   emoji: "⚡",  desc: "You prefer short steps and quick wins" },
    gentle:    { label: "Gentle Pacing",  emoji: "🌱",  desc: "You learn best at a steady, reassuring pace" },
    handson:   { label: "Hands-On",       emoji: "🛠️",  desc: "You learn best by building and experimenting" },
  };

  return {
    style: styleLabels[profile.dominantStyle],
    scores: profile.scores,
    totalSessions: profile.totalSessions,
    subjects: Object.values(profile.subjects),
    dominantStyle: profile.dominantStyle,
  };
}
