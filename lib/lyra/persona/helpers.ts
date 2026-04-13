/**
 * Shared helpers for persona skill files.
 */

import path from "path";
import fsp from "fs/promises";

const VIBES_DIR = path.join(process.cwd(), "vibes");
const PENDING_DIR = path.join(process.cwd(), "data", "pending_runs");

// ── Vibe file ─────────────────────────────────────────────────────────────────

export interface VibeFile {
  vibe_id: string;
  display_name: string;
  physical_traits: string;
  image_prompt_template: string;
  negative_prompt: string;
  outfit_pool: string[];
  lighting_pool: string[];
  voice_traits: {
    tone: string;
    emoji_use: string;
    message_length: string;
    do_not_say: string[];
  };
  welcome_dm?: string;
  elevenlabs_voice_id?: string | null;
}

export async function readVibeFile(vibe_id: string): Promise<VibeFile> {
  const filePath = path.join(VIBES_DIR, `${vibe_id}.json`);
  const raw = await fsp.readFile(filePath, "utf-8");
  return JSON.parse(raw) as VibeFile;
}

// ── Pending run storage ───────────────────────────────────────────────────────
// Runs are stored as JSON files in data/pending_runs/{run_id}.json
// They expire naturally since heroGenConfirm deletes them after use.

async function ensurePendingDir() {
  await fsp.mkdir(PENDING_DIR, { recursive: true });
}

export async function savePendingRun(run_id: string, data: unknown): Promise<void> {
  await ensurePendingDir();
  const filePath = path.join(PENDING_DIR, `${run_id}.json`);
  await fsp.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export async function loadPendingRun<T = Record<string, unknown>>(run_id: string): Promise<T | null> {
  await ensurePendingDir();
  const filePath = path.join(PENDING_DIR, `${run_id}.json`);
  try {
    const raw = await fsp.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function deletePendingRun(run_id: string): Promise<void> {
  const filePath = path.join(PENDING_DIR, `${run_id}.json`);
  try {
    await fsp.unlink(filePath);
  } catch {
    // Already gone — fine
  }
}

