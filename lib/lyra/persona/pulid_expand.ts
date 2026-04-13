/**
 * Skill 2: pulid_expand
 * Generate identity-consistent content images using PuLID + hero as reference.
 * Used for post images after the persona is locked.
 */

import { falPuLID } from "@/lib/lyra/fal-tools";
import { getPersona } from "@/lib/lyra/db";
import { readVibeFile } from "./helpers";
import { faceConsistencyCheck } from "./face_consistency_check";

export interface PuLIDExpandResult {
  url: string;
  seed: number;
  similarity: number;
  passed: boolean;
}

export interface PuLIDExpandBatchResult {
  persona_id: string;
  images: PuLIDExpandResult[];
  passed: PuLIDExpandResult[];
}

/**
 * Generate a single PuLID image for the persona.
 */
export async function pulidExpand(params: {
  persona_id: string;
  scene_prompt: string;
  seed?: number;
  consistency_threshold?: number;
}): Promise<PuLIDExpandResult> {
  const { persona_id, scene_prompt, seed, consistency_threshold = 0.82 } = params;

  const persona = getPersona(persona_id);
  if (!persona) throw new Error(`Persona ${persona_id} not found`);
  if (!persona.hero_image_url) throw new Error(`Persona ${persona_id} has no hero image`);

  const vibe = await readVibeFile(persona.vibe_id);
  const fullPrompt = `${scene_prompt}, ${vibe.physical_traits}, photorealistic, 85mm portrait, natural skin texture, detailed eyes`;

  const result = await falPuLID({
    prompt: fullPrompt,
    referenceImageUrl: persona.hero_image_url,
    negativePrompt: vibe.negative_prompt,
    seed,
  });

  // Run face consistency check on the single result
  const check = await faceConsistencyCheck({
    persona_id,
    candidates: [{ url: result.url, seed: result.seed }],
    threshold: consistency_threshold,
  });

  const cr = check.results[0];
  return {
    url: result.url,
    seed: result.seed,
    similarity: cr.similarity,
    passed: cr.passed,
  };
}

/**
 * Generate a batch of PuLID images, return all + passing subset.
 */
export async function pulidExpandBatch(params: {
  persona_id: string;
  scene_prompt: string;
  count?: number;
  consistency_threshold?: number;
}): Promise<PuLIDExpandBatchResult> {
  const { persona_id, scene_prompt, count = 4, consistency_threshold = 0.82 } = params;

  // Generate all images in parallel with varied seeds
  const seedBase = Math.floor(Math.random() * 900000) + 100000;
  const jobs = Array.from({ length: count }, (_, i) =>
    pulidExpand({
      persona_id,
      scene_prompt,
      seed: seedBase + i * 1000,
      consistency_threshold,
    })
  );

  const images = await Promise.all(jobs);
  const passed = images.filter((img) => img.passed);

  return { persona_id, images, passed };
}
