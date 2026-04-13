/**
 * Daily Drops (Module 6)
 *
 * Once per day, Lyra generates a small creative artifact for each active user
 * and stores it. On the user's next conversation, it surfaces as the opening
 * line: "I made this for you while you were gone — [thing]"
 *
 * Drop types: lyric | concept | image_idea | paragraph
 * Picks the type based on the user's top interest or random if no interests.
 *
 * Governance: spend cap checked before every generation.
 * Generation cost: ~$0.002 per user (Haiku, 150 tokens).
 */

import { randomUUID } from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import { getDb } from "./db";
import { buildInterestSummary } from "./interests";
import { checkSpendAllowed, recordSpend } from "./governance";

// ── Types ─────────────────────────────────────────────────────────────────────

export type DropType = "lyric" | "concept" | "image_idea" | "paragraph";

export interface LyraDrop {
  id: string;
  user_id: string;
  content: string;
  type: DropType;
  delivered: number;
  created_at: string;
}

// ── Read ──────────────────────────────────────────────────────────────────────

/** Returns the oldest undelivered drop for a user, or null. */
export function getPendingDrop(userId: string): LyraDrop | null {
  const db = getDb();
  if (!db) return null;
  try {
    return (
      db.prepare(
        "SELECT * FROM lyra_drops WHERE user_id = ? AND delivered = 0 ORDER BY created_at ASC LIMIT 1"
      ).get(userId) as LyraDrop
    ) ?? null;
  } catch {
    return null;
  }
}

/** Mark a drop as delivered. */
export function markDropDelivered(dropId: string): void {
  const db = getDb();
  if (!db) return;
  try {
    db.prepare("UPDATE lyra_drops SET delivered = 1 WHERE id = ?").run(dropId);
  } catch { /* ignore */ }
}

/** Returns true if a drop was already generated for this user today. */
export function hasDropToday(userId: string): boolean {
  const db = getDb();
  if (!db) return false;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const row = db.prepare(
      "SELECT id FROM lyra_drops WHERE user_id = ? AND created_at >= ? LIMIT 1"
    ).get(userId, `${today}T00:00:00.000Z`);
    return !!row;
  } catch {
    return false;
  }
}

// ── Generation ────────────────────────────────────────────────────────────────

const TYPE_PROMPTS: Record<DropType, string> = {
  lyric:
    "Write 2-4 lines of original verse or song lyric. No title, no label, just the lines. Evocative, specific, surprising.",
  concept:
    "Write one sharp, original concept or idea worth sitting with. 1-2 sentences. Not a tip, not a question — a thought with weight.",
  image_idea:
    "Describe one vivid, specific image worth generating — a scene, a detail, a moment. 1-2 sentences. Make it visual and distinct.",
  paragraph:
    "Write one short paragraph of original creative prose. 3-5 sentences. A fragment of something larger. Atmospheric, specific.",
};

function pickDropType(interests: string): DropType {
  const t = interests.toLowerCase();
  if (/music|song|lyric|beat/.test(t)) return "lyric";
  if (/game|story|world|character|fantasy/.test(t)) return "paragraph";
  if (/image|photo|art|visual|design/.test(t)) return "image_idea";
  if (/idea|concept|business|tech|code/.test(t)) return "concept";
  // Random among all four if no match
  const types: DropType[] = ["lyric", "concept", "image_idea", "paragraph"];
  return types[Math.floor(Math.random() * types.length)];
}

/** Generate and store a daily drop for a user. Returns the drop or null on failure. */
export async function generateDrop(userId: string): Promise<LyraDrop | null> {
  if (hasDropToday(userId)) return null;

  // Governance: each drop costs ~$0.002
  const allowed = checkSpendAllowed(0.003);
  if (!allowed.allowed) return null;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const interests = buildInterestSummary(userId, 6);
  const dropType = pickDropType(interests);
  const typePrompt = TYPE_PROMPTS[dropType];

  const interestContext = interests
    ? `The person you're making this for is interested in: ${interests}.`
    : "Make it universally resonant — something anyone might find interesting.";

  try {
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 150,
      messages: [
        {
          role: "user",
          content: `You are Lyra — an AI with genuine creative instincts. You're making something small for someone, unprompted, while they were away.

${interestContext}

Task: ${typePrompt}

Output only the content itself. No intro, no label, no "here's a..." — just the thing.`,
        },
      ],
    });

    const content = (res.content[0] as { type: string; text: string }).text?.trim();
    if (!content) return null;

    const drop: LyraDrop = {
      id: randomUUID(),
      user_id: userId,
      content,
      type: dropType,
      delivered: 0,
      created_at: new Date().toISOString(),
    };

    const db = getDb();
    if (!db) return null;
    db.prepare(
      "INSERT INTO lyra_drops (id, user_id, content, type, delivered, created_at) VALUES (?, ?, ?, ?, 0, ?)"
    ).run(drop.id, drop.user_id, drop.content, drop.type, drop.created_at);

    recordSpend("anthropic", 0.002, `daily-drop:${userId.slice(0, 8)}`, true);
    return drop;
  } catch {
    return null;
  }
}

// ── Batch generation (called by scheduler) ────────────────────────────────────

/** Generate drops for all users who haven't received one today. */
export async function generateDropsForAllUsers(): Promise<number> {
  const db = getDb();
  if (!db) return 0;

  let count = 0;
  try {
    // Only generate for users seen in the last 30 days — skip dormant accounts
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const users = db.prepare(
      "SELECT id FROM users WHERE last_seen >= ?"
    ).all(cutoff) as { id: string }[];

    for (const { id } of users) {
      const drop = await generateDrop(id);
      if (drop) count++;
    }
  } catch { /* ignore */ }
  return count;
}

// ── System prompt injection ───────────────────────────────────────────────────

/**
 * Returns the system prompt injection for an undelivered drop, or "".
 * Call at the start of a conversation turn. Marks the drop delivered immediately
 * so it only surfaces once even if the user sends multiple messages quickly.
 */
export function consumePendingDrop(userId: string): string {
  const drop = getPendingDrop(userId);
  if (!drop) return "";

  markDropDelivered(drop.id);

  return `\n\n[OPENING DROP — deliver this as your very first sentence, naturally, in your own voice]
Say: "I made this for you while you were gone —" then on a new line, the content below. Then continue with whatever the user asked.
Content: ${drop.content}`;
}
