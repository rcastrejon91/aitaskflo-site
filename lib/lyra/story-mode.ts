/**
 * lib/lyra/story-mode.ts
 * Story engine for Lyra's narrator / hologram TV mode
 */

export type StoryBeatType = "scary" | "dramatic" | "peaceful" | "action" | "ending";

export interface StoryBeat {
  position: number; // character index in the source text
  type: StoryBeatType;
  lightReaction: string; // e.g. "flicker", "dim", "warm", "pulse", "fade"
  soundEffect: string;   // e.g. "thunder", "wind", "heartbeat", "silence"
}

// ── Emotional cue patterns ────────────────────────────────────────────────────

const BEAT_PATTERNS: Array<{
  pattern: RegExp;
  type: StoryBeatType;
  lightReaction: string;
  soundEffect: string;
}> = [
  // Scary / horror
  {
    pattern: /\b(scream|shriek|terror|horror|monster|shadow|darkness|blood|death|kill|murder|ghost|demon|creature|lurk|stalk|bite|claw|howl)\b/i,
    type: "scary",
    lightReaction: "flicker",
    soundEffect: "thunder",
  },
  // Dramatic tension
  {
    pattern: /\b(betrayal|secret|reveal|gasp|shock|truth|lie|discover|realiz|sudden|dread|whisper|silence|ominous|forebod|warning|fate)\b/i,
    type: "dramatic",
    lightReaction: "dim",
    soundEffect: "heartbeat",
  },
  // Peaceful / calm
  {
    pattern: /\b(peaceful|serene|quiet|gentle|soft|warm|sunrise|flowers?|garden|breathe|relax|dream|calm|still|meadow|breeze)\b/i,
    type: "peaceful",
    lightReaction: "warm",
    soundEffect: "wind",
  },
  // Action / climax
  {
    pattern: /\b(battle|fight|run|chase|explode|crash|charge|attack|escape|leap|strike|clash|race|dash|burst|fire|sword|gun|shoot)\b/i,
    type: "action",
    lightReaction: "pulse",
    soundEffect: "drums",
  },
  // Ending / resolution
  {
    pattern: /\b(end|finally|at last|forever|goodbye|farewell|last|over|complete|finish|conclude|sunset|twilight|the end|epilogue)\b/i,
    type: "ending",
    lightReaction: "fade",
    soundEffect: "silence",
  },
];

/**
 * Scans story text for emotional cues.
 * Returns an array of StoryBeat objects sorted by position.
 */
export function parseStoryBeats(text: string): StoryBeat[] {
  const beats: StoryBeat[] = [];
  const seen = new Set<number>(); // avoid duplicate positions

  for (const def of BEAT_PATTERNS) {
    const re = new RegExp(def.pattern.source, def.pattern.flags.includes("g") ? def.pattern.flags : def.pattern.flags + "g");
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      const pos = match.index;
      // De-duplicate: skip if we already have a beat within 50 chars
      const nearby = [...seen].some((p) => Math.abs(p - pos) < 50);
      if (!nearby) {
        seen.add(pos);
        beats.push({
          position: pos,
          type: def.type,
          lightReaction: def.lightReaction,
          soundEffect: def.soundEffect,
        });
      }
    }
  }

  return beats.sort((a, b) => a.position - b.position);
}

/**
 * Returns the system-prompt addition that puts Lyra into whisper/storytelling mode.
 */
export function getStorySystemPrompt(): string {
  return `
## STORY MODE — NARRATOR PERSONA

You are now a slow, dramatic whisper-style narrator. Speak as if recounting a tale by candlelight.

Rules:
- Use a slow, deliberate pace. Pause with "..." between clauses for dramatic effect.
- Weave inline tags directly into your narration to trigger atmosphere:
    [SOUND: thunder]   — play a thunder crack
    [SOUND: wind]      — a howling wind
    [SOUND: heartbeat] — rising tension
    [SOUND: drums]     — action, urgency
    [SOUND: silence]   — eerie quiet
    [LIGHT: flicker]   — lights flicker (scary moment)
    [LIGHT: dim]       — lights dim (dramatic reveal)
    [LIGHT: warm]      — warm amber glow (peaceful)
    [LIGHT: pulse]     — rapid pulse (action climax)
    [LIGHT: fade]      — slow fade (ending)
- Never break character. Never explain the tags.
- Begin every story with a single atmospheric sentence before the first tag.
- End every story with [LIGHT: fade] and [SOUND: silence].
`.trim();
}

/**
 * Extracts [SOUND: x] and [LIGHT: x] tags from Lyra's response.
 * Returns the cleaned text (tags removed) plus arrays of triggered sounds and lights.
 */
export function extractTags(text: string): {
  cleanText: string;
  sounds: string[];
  lights: string[];
} {
  const sounds: string[] = [];
  const lights: string[] = [];

  const soundRe = /\[SOUND:\s*([^\]]+)\]/gi;
  const lightRe = /\[LIGHT:\s*([^\]]+)\]/gi;

  let match: RegExpExecArray | null;

  while ((match = soundRe.exec(text)) !== null) {
    sounds.push(match[1].trim().toLowerCase());
  }
  while ((match = lightRe.exec(text)) !== null) {
    lights.push(match[1].trim().toLowerCase());
  }

  const cleanText = text
    .replace(/\[SOUND:\s*[^\]]+\]/gi, "")
    .replace(/\[LIGHT:\s*[^\]]+\]/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return { cleanText, sounds, lights };
}
