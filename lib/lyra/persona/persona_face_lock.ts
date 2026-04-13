/**
 * Persona Face-Lock Orchestrator
 * Ties all 4 skills together into a single pipeline with status tracking.
 *
 * Pipeline stages:
 *   bootstrapping → hero selected → pulid_expanding → lora_training → locked
 */

import { getPersona, updatePersona, listPersonas } from "@/lib/lyra/db";
import { heroGen, heroGenConfirm, type HeroGenResult, type HeroConfirmResult } from "./hero_gen";
import { pulidExpandBatch, type PuLIDExpandBatchResult } from "./pulid_expand";
import { loraTrain, loraGenerate, type LoRATrainResult, type LoRATestResult } from "./lora_train";
import { faceConsistencyCheck, type FaceConsistencyReport } from "./face_consistency_check";

export type PersonaStatus =
  | "bootstrapping"
  | "hero_selected"
  | "pulid_expanding"
  | "lora_training"
  | "locked";

// ── Stage 1: Generate hero candidates ────────────────────────────────────────

export async function stageHeroGen(params: {
  persona_name: string;
  vibe_id: string;
  candidate_count?: number;
}): Promise<HeroGenResult> {
  return heroGen(params);
}

// ── Stage 1b: Confirm hero selection ─────────────────────────────────────────

export async function stageHeroConfirm(params: {
  run_id: string;
  chosen_index: number;
}): Promise<HeroConfirmResult> {
  const result = await heroGenConfirm(params);
  updatePersona(result.persona_id, { status: "hero_selected" });
  return result;
}

// ── Stage 2: PuLID expansion pass ────────────────────────────────────────────
// Generate N images via PuLID, keep only those passing face consistency.
// Recommended: run 20–40 images, expect ~60% pass rate → ~12–24 training images.

export async function stagePuLIDExpand(params: {
  persona_id: string;
  scene_prompts: string[];   // Variety of scenes for diverse training data
  per_scene_count?: number;
  consistency_threshold?: number;
}): Promise<PuLIDExpandBatchResult[]> {
  const { persona_id, scene_prompts, per_scene_count = 4, consistency_threshold = 0.82 } = params;

  updatePersona(persona_id, { status: "pulid_expanding" });

  const batches = await Promise.all(
    scene_prompts.map((scene_prompt) =>
      pulidExpandBatch({ persona_id, scene_prompt, count: per_scene_count, consistency_threshold })
    )
  );

  return batches;
}

// ── Stage 3: LoRA training ────────────────────────────────────────────────────
// Pass all approved PuLID images into Flux LoRA training.

export async function stageLoRATrain(params: {
  persona_id: string;
  approved_image_urls: string[];
  steps?: number;
}): Promise<LoRATrainResult> {
  const { persona_id, approved_image_urls, steps = 1000 } = params;

  updatePersona(persona_id, { status: "lora_training" });

  return loraTrain({ persona_id, training_image_urls: approved_image_urls, steps });
}

// ── Stage 4: Post-lock generation ────────────────────────────────────────────
// Generate locked-face content images for posting.

export async function stageLockedGenerate(params: {
  persona_id: string;
  scene_prompt: string;
  lora_scale?: number;
  seed?: number;
}): Promise<LoRATestResult> {
  return loraGenerate(params);
}

// ── Full pipeline runner ──────────────────────────────────────────────────────
// Use this for automated runs where you want to go start → locked in one call.
// Requires pre-selected hero (run_id + chosen_index) and scene prompts.

export async function runFullPipeline(params: {
  persona_name: string;
  vibe_id: string;
  chosen_hero_index: number;
  scene_prompts: string[];
  candidate_count?: number;
  per_scene_count?: number;
  lora_steps?: number;
  consistency_threshold?: number;
}): Promise<{
  persona_id: string;
  hero_url: string;
  training_images_passed: number;
  lora_url: string;
  lora_trigger: string;
  locked_at: string;
}> {
  const {
    persona_name,
    vibe_id,
    chosen_hero_index,
    scene_prompts,
    candidate_count = 20,
    per_scene_count = 5,
    lora_steps = 1000,
    consistency_threshold = 0.82,
  } = params;

  // Stage 1: hero gen
  const heroResult = await stageHeroGen({ persona_name, vibe_id, candidate_count });

  // Stage 1b: confirm
  const confirmResult = await stageHeroConfirm({
    run_id: heroResult.run_id,
    chosen_index: chosen_hero_index,
  });

  // Stage 2: PuLID expand
  const batches = await stagePuLIDExpand({
    persona_id: confirmResult.persona_id,
    scene_prompts,
    per_scene_count,
    consistency_threshold,
  });

  // Collect all passed images across all batches
  const approvedUrls = batches.flatMap((b) => b.passed.map((img) => img.url));
  if (approvedUrls.length < 5) {
    throw new Error(
      `Only ${approvedUrls.length} images passed consistency check — need at least 5. Try looser threshold or more scenes.`
    );
  }

  // Stage 3: LoRA train
  const loraResult = await stageLoRATrain({
    persona_id: confirmResult.persona_id,
    approved_image_urls: approvedUrls,
    steps: lora_steps,
  });

  return {
    persona_id: confirmResult.persona_id,
    hero_url: confirmResult.hero_url,
    training_images_passed: approvedUrls.length,
    lora_url: loraResult.lora_url,
    lora_trigger: loraResult.lora_trigger,
    locked_at: loraResult.locked_at,
  };
}

// ── Status helpers ────────────────────────────────────────────────────────────

export function getPersonaStatus(persona_id: string) {
  const persona = getPersona(persona_id);
  if (!persona) return null;
  return {
    id: persona.id,
    name: persona.name,
    vibe_id: persona.vibe_id,
    status: persona.status as PersonaStatus,
    has_hero: !!persona.hero_image_url,
    has_lora: !!persona.lora_url,
    similarity_avg: persona.similarity_avg,
    locked_at: persona.locked_at,
    created_at: persona.created_at,
  };
}

export function getAllPersonas() {
  return listPersonas();
}
