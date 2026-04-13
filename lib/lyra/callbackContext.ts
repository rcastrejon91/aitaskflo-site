/**
 * Reflection Callback Context (Module 5b)
 *
 * Two injection points:
 *
 * 1. Opening callback (system prompt): ~15% chance on first message of a new
 *    conversation. Surfaces the most recent callbackOpportunity from reflections
 *    as a natural opening thread. Model uses it or ignores it — never announced.
 *
 * 2. Mid-conversation callback (system prompt): when the current message
 *    shares topic tags with past reflections, inject a brief "past thread"
 *    note so Lyra can weave in relevant context without it feeling forced.
 */

import { getLatestCallback, findRelatedReflectionsSemantic } from "./reflections";

// ── Opening callback ──────────────────────────────────────────────────────────

// Deterministic roll: userId + date → consistent per day per user
// so the callback window feels intentional rather than random per message
function rollOpeningCallback(userId: string): boolean {
  const date = new Date().toISOString().slice(0, 10);
  const str = `callback:${userId}:${date}`;
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 100 < 15; // ~15%
}

/**
 * Returns an opening callback injection string, or "" if none applies.
 * Call this when history.length === 0 (first turn of a new conversation).
 */
export function buildOpeningCallback(userId: string, agentId: string): string {
  if (!rollOpeningCallback(userId)) return "";

  const callback = getLatestCallback(agentId);
  if (!callback) return "";

  return `\n\n[OPTIONAL THREAD — use naturally or ignore entirely, never announce it]
A recent conversation left this thread open: "${callback}"
If it fits naturally in the first response, weave it in. If not, skip it completely.`;
}

// ── Mid-conversation callback ─────────────────────────────────────────────────

/**
 * Returns a mid-conversation context note if the current message connects
 * to past reflection topics. Returns "" if no relevant threads found.
 */
export async function buildMidConversationCallback(
  agentId: string,
  message: string,
  historyLength: number
): Promise<string> {
  // Only fire mid-conversation (not on first message �� that's handled above)
  if (historyLength < 2) return "";

  const related = await findRelatedReflectionsSemantic(agentId, message, 2);
  if (!related.length) return "";

  const threads = related
    .filter((r) => r.callbackOpportunity || r.conversationSummary)
    .map((r) => r.callbackOpportunity ?? r.conversationSummary)
    .slice(0, 2);

  if (!threads.length) return "";

  return `\n\n[PAST CONTEXT — connect only if genuinely relevant, never force it]
Related threads from previous conversations:
${threads.map((t) => `• ${t}`).join("\n")}`;
}
