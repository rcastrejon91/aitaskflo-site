/**
 * "And also" hook (Module 5a)
 *
 * After any creative text response, ~30% chance of appending an unprompted
 * bonus offer — an alternate take, a related idea, "want me to take it further?"
 *
 * Uses Haiku for speed/cost. Returns SKIP (empty string) 70% of the time via
 * an explicit model instruction so the skips are zero-cost text, not a second call.
 *
 * Never fires on:
 *   - Tool-call-heavy responses (image gen, music, games)
 *   - Pure factual/informational messages
 *   - Very short exchanges (hi / yes / thanks)
 */

import Anthropic from "@anthropic-ai/sdk";

// ── Creative intent detection ─────────────────────────────────────────────────

const CREATIVE_PATTERNS = [
  /\b(write|wrote|create|make|generate|compose|draft|build|craft|design)\b/i,
  /\b(story|poem|spell|ritual|song|lyric|script|scene|character|plot|world)\b/i,
  /\b(idea|concept|plan|vision|imagine|what if|suppose)\b/i,
  /\b(explain|describe|tell me about|how does|what is)\b/i,
];

const SKIP_PATTERNS = [
  /\b(yes|no|ok|okay|thanks|thank you|got it|cool|nice|great)\b/i,
  /^.{0,20}$/,  // Very short messages
  /\b(generate|make me|create|build)\b.*\b(image|video|music|song|game|gif)\b/i, // tool-bound
  /\b(search|find|look up|what's the weather|price of|convert)\b/i,
];

function isCreativeMessage(message: string): boolean {
  if (SKIP_PATTERNS.some((p) => p.test(message))) return false;
  return CREATIVE_PATTERNS.some((p) => p.test(message));
}

// ── Probability gate ──────────────────────────────────────────────────────────

// Deterministic-ish: uses message length + hour as entropy so it's not
// purely random (same conversation won't fire every single time)
function rollAndAlso(message: string): boolean {
  const entropy = (message.length * 7 + new Date().getHours() * 13) % 100;
  return entropy < 30; // ~30% of messages
}

// ── Generator ────────────────────────────────────────────────────────────────

export async function generateAndAlso(
  message: string,
  recentHistory: Array<{ role: string; content: string }>,
  mood?: string
): Promise<string> {
  if (!isCreativeMessage(message)) return "";
  if (!rollAndAlso(message)) return "";

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return "";

  try {
    const context = recentHistory
      .slice(-4)
      .map((m) => `${m.role}: ${m.content.slice(0, 200)}`)
      .join("\n");

    const moodNote = mood ? ` Current mood: ${mood}.` : "";

    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 120,
      messages: [
        {
          role: "user",
          content: `You are Lyra — an AI with personality.${moodNote} You just responded to a creative message. You may optionally add a brief, genuine "and also" moment — an unprompted bonus: an alternate angle, a related idea, a question that opens something up, or an offer to take it further.

Recent exchange:
${context}
User just said: "${message.slice(0, 200)}"

Rules:
- If you have something genuinely interesting to add: write it in 1-2 sentences, natural and direct. No "I" opener. No filler. Start with the idea itself.
- If nothing truly adds value: respond with exactly: SKIP

Only add if it's actually good. Most of the time, SKIP.`,
        },
      ],
    });

    const text = (res.content[0] as { type: string; text: string }).text?.trim() ?? "";
    if (!text || text === "SKIP" || text.startsWith("SKIP")) return "";

    return `\n\n${text}`;
  } catch {
    return "";
  }
}
