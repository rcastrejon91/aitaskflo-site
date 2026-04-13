/**
 * Skill 1: hero_gen
 * Generate face candidates from a vibe spec, let user pick one, save as hero.
 */

import { randomUUID } from "crypto";
import path from "path";
import fsp from "fs/promises";
import { falImageGenBatch } from "@/lib/lyra/fal-tools";
import { insertPersona } from "@/lib/lyra/db";
import { readVibeFile, savePendingRun, loadPendingRun, deletePendingRun } from "./helpers";

export interface HeroCandidate {
  url: string;
  seed: number;
  index: number;
}

export interface HeroGenResult {
  run_id: string;
  persona_name: string;
  vibe_id: string;
  candidates: HeroCandidate[];
}

export interface HeroConfirmResult {
  persona_id: string;
  hero_url: string;
  hero_seed: number;
  hero_prompt: string;
}

interface PendingHeroRun {
  persona_name: string;
  vibe_id: string;
  prompt: string;
  candidates: HeroCandidate[];
}

export async function heroGen(params: {
  persona_name: string;
  vibe_id: string;
  candidate_count?: number;
}): Promise<HeroGenResult> {
  const { persona_name, vibe_id, candidate_count = 20 } = params;

  const vibe = await readVibeFile(vibe_id);
  const prompt = `${vibe.physical_traits}, ${vibe.image_prompt_template}, photorealistic, 85mm portrait, natural skin texture, detailed eyes, high detail face`;

  const candidates = await falImageGenBatch({
    prompt,
    negativePrompt: vibe.negative_prompt,
    count: candidate_count,
    model: "quality",
  });

  const run_id = randomUUID();
  await savePendingRun(run_id, {
    persona_name,
    vibe_id,
    prompt,
    candidates,
  });

  return { run_id, persona_name, vibe_id, candidates };
}

export async function heroGenConfirm(params: {
  run_id: string;
  chosen_index: number;
}): Promise<HeroConfirmResult> {
  const { run_id, chosen_index } = params;

  const run = await loadPendingRun<PendingHeroRun>(run_id);
  if (!run) throw new Error(`Run ${run_id} not found`);

  const chosen = run.candidates.find((c: HeroCandidate) => c.index === chosen_index);
  if (!chosen) throw new Error(`Candidate index ${chosen_index} not found in run ${run_id}`);

  const persona_id = randomUUID();
  const now = new Date().toISOString();

  // Compute a simple face embedding using Claude vision
  const embedding = await computeFaceEmbedding(chosen.url);

  // Build welcome DM from vibe
  const vibe = await readVibeFile(run.vibe_id);
  const welcomeDm = vibe.welcome_dm ?? `hi! i'm an AI persona — fully disclosed. glad you're here.`;

  insertPersona({
    id: persona_id,
    name: run.persona_name,
    vibe_id: run.vibe_id,
    status: "bootstrapping",
    ai_disclosed: 1,
    hero_image_url: chosen.url,
    hero_seed: chosen.seed,
    hero_prompt: run.prompt,
    hero_embedding: embedding ? JSON.stringify(embedding) : null,
    lora_url: null,
    lora_trigger: null,
    training_images: null,
    similarity_avg: null,
    welcome_dm: welcomeDm,
    created_at: now,
    locked_at: null,
  });

  await deletePendingRun(run_id);

  return {
    persona_id,
    hero_url: chosen.url,
    hero_seed: chosen.seed,
    hero_prompt: run.prompt,
  };
}

// ── Face embedding via Claude vision ─────────────────────────────────────────
// Returns a pseudo-embedding: an array of descriptive feature scores
// Used for cosine similarity approximation between faces

export async function computeFaceEmbedding(imageUrl: string): Promise<number[] | null> {
  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "url", url: imageUrl },
          },
          {
            type: "text",
            text: `Analyze this face and return a JSON array of exactly 32 float values (0.0-1.0) representing facial features in this order: [face_width_ratio, jaw_width, chin_sharpness, cheekbone_prominence, eye_size, eye_spacing, eye_shape_almond, eyebrow_arch, nose_width, nose_length, lip_fullness, lip_width, skin_tone_lightness, skin_tone_warmth, hair_darkness, hair_length_ratio, forehead_height, face_symmetry, expression_intensity, eye_openness, brow_thickness, nose_bridge_height, philtrum_length, ear_visibility, neck_length, face_roundness, age_estimate_normalized, distinctive_features_count, makeup_intensity, hair_texture_curl, eye_color_darkness, overall_sharpness]. Return ONLY the JSON array, nothing else.`,
          },
        ],
      }],
    });

    const text = (msg.content[0] as { type: string; text: string }).text.trim();
    const arr = JSON.parse(text) as number[];
    if (!Array.isArray(arr) || arr.length !== 32) return null;
    return arr;
  } catch {
    return null;
  }
}

// ── Cosine similarity ─────────────────────────────────────────────────────────

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}



