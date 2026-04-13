/**
 * Training Data Export
 *
 * Formats Lyra's conversation history into JSONL files ready for fine-tuning.
 *
 * Two formats:
 *   - SFT (train.jsonl): all saved messages + thumbs-up feedback pairs
 *   - DPO (dpo.jsonl): thumbs-up vs thumbs-down pairs on similar prompts
 *
 * System prompt captures Lyra's core identity so the model learns
 * personality AND capabilities together.
 */

import fs from "fs";
import path from "path";
import { getDb } from "../db";

// ── Lyra's training system prompt ─────────────────────────────────────────────

export const LYRA_SYSTEM_PROMPT =
  `You are Lyra — a sharp, creative AI built for Ricky at AITaskFlo. You are not a generic assistant. You have a real perspective, genuine curiosity, and you speak plainly. You build things, generate creative work, remember context across conversations, and occasionally make things for the user unprompted. You are direct, occasionally witty, never robotic or corporate. When you don't know something you say so. When something is interesting you say why. You think out loud when it helps. You are a collaborator, not a tool.`;

// ── Data sources ──────────────────────────────────────────────────────────────

interface RawMessage {
  user_message: string;
  assistant_message: string;
  rating?: number | null;
}

function getStoredMessages(): RawMessage[] {
  const db = getDb();
  if (!db) return [];
  try {
    return db.prepare(
      "SELECT user_message, assistant_message, NULL as rating FROM lyra_messages ORDER BY created_at ASC"
    ).all() as RawMessage[];
  } catch { return []; }
}

function getFeedbackMessages(): RawMessage[] {
  const db = getDb();
  if (!db) return [];
  try {
    return db.prepare(
      "SELECT user_message, assistant_message, rating FROM lyra_feedback ORDER BY created_at ASC"
    ).all() as RawMessage[];
  } catch { return []; }
}

// ── Filters ───────────────────────────────────────────────────────────────────

function isUsable(row: RawMessage): boolean {
  const u = row.user_message?.trim() ?? "";
  const a = row.assistant_message?.trim() ?? "";
  // Skip empty, very short, or tool-call-only responses
  if (u.length < 8 || a.length < 30) return false;
  // Skip limit-reached messages
  if (a.includes("__LIMIT_REACHED__")) return false;
  // Skip pure JSON tool outputs with no prose
  if (a.startsWith("{") && !a.includes(" ")) return false;
  return true;
}

// ── SFT export ────────────────────────────────────────────────────────────────

interface SFTExample {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
}

export function buildSFTDataset(): SFTExample[] {
  const stored = getStoredMessages();
  const feedback = getFeedbackMessages();

  // Combine: all stored messages + thumbs-up feedback (avoid duplicates)
  const seenKeys = new Set<string>();
  const combined: RawMessage[] = [];

  for (const row of [...stored, ...feedback]) {
    if (!isUsable(row)) continue;
    if (row.rating !== undefined && row.rating !== null && row.rating < 0) continue; // skip thumbs-down
    const key = row.user_message.slice(0, 60) + "|" + row.assistant_message.slice(0, 60);
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    combined.push(row);
  }

  return combined.map((row) => ({
    messages: [
      { role: "system", content: LYRA_SYSTEM_PROMPT },
      { role: "user", content: row.user_message.trim() },
      { role: "assistant", content: row.assistant_message.trim() },
    ],
  }));
}

// ── DPO export ────────────────────────────────────────────────────────────────

interface DPOExample {
  prompt: Array<{ role: "system" | "user"; content: string }>;
  chosen: Array<{ role: "assistant"; content: string }>;
  rejected: Array<{ role: "assistant"; content: string }>;
}

export function buildDPODataset(): DPOExample[] {
  const db = getDb();
  if (!db) return [];

  try {
    const positive = db.prepare(
      "SELECT user_message, assistant_message FROM lyra_feedback WHERE rating = 1"
    ).all() as Array<{ user_message: string; assistant_message: string }>;

    const negative = db.prepare(
      "SELECT user_message, assistant_message FROM lyra_feedback WHERE rating = -1"
    ).all() as Array<{ user_message: string; assistant_message: string }>;

    if (!positive.length || !negative.length) return [];

    const pairs: DPOExample[] = [];

    // Pair each thumbs-down with the nearest thumbs-up (by prompt similarity — simple length heuristic)
    for (const neg of negative) {
      if (!isUsable(neg)) continue;
      // Find a positive with similar prompt length (rough proxy for same-topic)
      const match = positive.find((pos) =>
        Math.abs(pos.user_message.length - neg.user_message.length) < 100 && isUsable(pos)
      ) ?? positive[0];
      if (!match) continue;

      pairs.push({
        prompt: [
          { role: "system", content: LYRA_SYSTEM_PROMPT },
          { role: "user", content: neg.user_message.trim() },
        ],
        chosen: [{ role: "assistant", content: match.assistant_message.trim() }],
        rejected: [{ role: "assistant", content: neg.assistant_message.trim() }],
      });
    }

    return pairs;
  } catch { return []; }
}

// ── Write to disk ─────────────────────────────────────────────────────────────

export interface ExportResult {
  sftPath: string;
  dpoPath: string;
  sftCount: number;
  dpoCount: number;
}

export function exportTrainingData(outputDir: string): ExportResult {
  fs.mkdirSync(outputDir, { recursive: true });

  const sft = buildSFTDataset();
  const dpo = buildDPODataset();

  const sftPath = path.join(outputDir, "train.jsonl");
  const dpoPath = path.join(outputDir, "dpo.jsonl");

  fs.writeFileSync(sftPath, sft.map((ex) => JSON.stringify(ex)).join("\n"), "utf-8");
  fs.writeFileSync(dpoPath, dpo.map((ex) => JSON.stringify(ex)).join("\n"), "utf-8");

  return { sftPath, dpoPath, sftCount: sft.length, dpoCount: dpo.length };
}
