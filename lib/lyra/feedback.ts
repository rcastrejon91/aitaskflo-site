/**
 * Response Feedback (Module C)
 *
 * Stores thumbs up/down on Lyra responses.
 * Extracts preference patterns and injects them into the memory context
 * so Lyra naturally adjusts to what the user likes.
 */

import { getDb } from "./db";

// ── Storage ───────────────────────────────────────────────────────────────────

export interface FeedbackRow {
  id: number;
  user_id: string;
  rating: 1 | -1;
  user_message: string;
  assistant_message: string;
  created_at: string;
}

export function recordFeedback(
  userId: string,
  rating: 1 | -1,
  userMessage: string,
  assistantMessage: string
): void {
  const db = getDb();
  if (!db) return;
  try {
    db.prepare(`
      INSERT INTO lyra_feedback (user_id, rating, user_message, assistant_message, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, rating, userMessage.slice(0, 500), assistantMessage.slice(0, 1000), new Date().toISOString());
  } catch { /* ignore */ }
}

export function getRecentFeedback(userId: string, limit = 50): FeedbackRow[] {
  const db = getDb();
  if (!db) return [];
  try {
    return db.prepare(
      "SELECT * FROM lyra_feedback WHERE user_id = ? ORDER BY created_at DESC LIMIT ?"
    ).all(userId, limit) as FeedbackRow[];
  } catch {
    return [];
  }
}

// ── Pattern extraction ────────────────────────────────────────────────────────

interface FeedbackStats {
  totalUp: number;
  totalDown: number;
  downPatterns: string[];
  upPatterns: string[];
}

function analyzePatterns(rows: FeedbackRow[]): FeedbackStats {
  const up = rows.filter((r) => r.rating === 1);
  const down = rows.filter((r) => r.rating === -1);

  // Simple heuristics: check response length patterns
  const upAvgLen = up.length ? up.reduce((s, r) => s + r.assistant_message.length, 0) / up.length : 0;
  const downAvgLen = down.length ? down.reduce((s, r) => s + r.assistant_message.length, 0) / down.length : 0;

  const downPatterns: string[] = [];
  const upPatterns: string[] = [];

  // Length preference signal
  if (down.length >= 3 && downAvgLen > 1200) downPatterns.push("very long responses");
  if (down.length >= 3 && downAvgLen < 200) downPatterns.push("very short responses");
  if (up.length >= 3 && upAvgLen > 800) upPatterns.push("detailed responses");
  if (up.length >= 3 && upAvgLen < 400) upPatterns.push("concise responses");

  // Bullet list detection
  const downBulletCount = down.filter((r) => (r.assistant_message.match(/^[\-\*•]/m) ?? []).length > 3).length;
  const upBulletCount = up.filter((r) => (r.assistant_message.match(/^[\-\*•]/m) ?? []).length > 3).length;
  if (downBulletCount > down.length * 0.6 && down.length >= 3) downPatterns.push("bullet-heavy responses");
  if (upBulletCount > up.length * 0.6 && up.length >= 5) upPatterns.push("structured lists");

  // Emoji detection
  const downEmojiCount = down.filter((r) => /\p{Emoji}/u.test(r.assistant_message)).length;
  if (downEmojiCount > down.length * 0.6 && down.length >= 3) downPatterns.push("emoji usage");

  return { totalUp: up.length, totalDown: down.length, downPatterns, upPatterns };
}

/**
 * Returns a system prompt injection based on the user's feedback history.
 * Returns "" if there's not enough data yet.
 */
export function buildFeedbackContext(userId: string): string {
  const rows = getRecentFeedback(userId, 60);
  if (rows.length < 5) return "";

  const stats = analyzePatterns(rows);
  const parts: string[] = [];

  if (stats.downPatterns.length > 0) {
    parts.push(`Avoid: ${stats.downPatterns.join(", ")} (user has downvoted these)`);
  }
  if (stats.upPatterns.length > 0) {
    parts.push(`Lean toward: ${stats.upPatterns.join(", ")} (user has upvoted these)`);
  }

  if (!parts.length) return "";

  return `\n\n[LEARNED PREFERENCES — apply naturally]\n${parts.join("\n")}`;
}
