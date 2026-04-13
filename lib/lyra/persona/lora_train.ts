/**
 * Skill 3: lora_train
 * Train a Flux LoRA on a set of hero-passing images to lock the face permanently.
 * After training, the persona status moves to "locked".
 */

import { falLoRATrain, falImageWithLoRA } from "@/lib/lyra/fal-tools";
import { getPersona, updatePersona } from "@/lib/lyra/db";
import { readVibeFile } from "./helpers";
import { faceConsistencyCheck } from "./face_consistency_check";

export interface LoRATrainResult {
  persona_id: string;
  lora_url: string;
  lora_trigger: string;
  training_image_count: number;
  locked_at: string;
}

export interface LoRATestResult {
  url: string;
  seed: number;
  similarity: number;
  passed: boolean;
}

/**
 * Train a LoRA for a persona using already-approved face images.
 * Expects at least 10 images for reliable results (20+ recommended).
 */
export async function loraTrain(params: {
  persona_id: string;
  training_image_urls: string[];
  steps?: number;
}): Promise<LoRATrainResult> {
  const { persona_id, training_image_urls, steps = 1000 } = params;

  const persona = getPersona(persona_id);
  if (!persona) throw new Error(`Persona ${persona_id} not found`);
  if (training_image_urls.length < 5) {
    throw new Error(`Need at least 5 training images, got ${training_image_urls.length}`);
  }

  const vibe = await readVibeFile(persona.vibe_id);
  const triggerWord = `${persona.name.toLowerCase().replace(/\s+/g, "_")}_v1`;

  // Build image+caption pairs
  const trainingImages = training_image_urls.map((url) => ({
    url,
    caption: `${triggerWord}, ${vibe.physical_traits}, photorealistic portrait`,
  }));

  const { loraUrl } = await falLoRATrain({
    trainingImages,
    triggerWord,
    steps,
  });

  const now = new Date().toISOString();

  updatePersona(persona_id, {
    lora_url: loraUrl,
    lora_trigger: triggerWord,
    training_images: JSON.stringify(training_image_urls),
    status: "locked",
    locked_at: now,
  });

  return {
    persona_id,
    lora_url: loraUrl,
    lora_trigger: triggerWord,
    training_image_count: training_image_urls.length,
    locked_at: now,
  };
}

/**
 * Generate an image using the persona's trained LoRA.
 * Only works after loraTrain() has completed.
 */
export async function loraGenerate(params: {
  persona_id: string;
  scene_prompt: string;
  lora_scale?: number;
  seed?: number;
  check_consistency?: boolean;
}): Promise<LoRATestResult> {
  const { persona_id, scene_prompt, lora_scale = 0.9, seed, check_consistency = true } = params;

  const persona = getPersona(persona_id);
  if (!persona) throw new Error(`Persona ${persona_id} not found`);
  if (!persona.lora_url || !persona.lora_trigger) {
    throw new Error(`Persona ${persona_id} has no trained LoRA — run loraTrain() first`);
  }

  const vibe = await readVibeFile(persona.vibe_id);
  const fullPrompt = `${persona.lora_trigger}, ${scene_prompt}, ${vibe.physical_traits}, photorealistic, 85mm portrait`;

  const result = await falImageWithLoRA({
    prompt: fullPrompt,
    loraUrl: persona.lora_url,
    loraScale: lora_scale,
    seed,
  });

  if (!check_consistency || !persona.hero_embedding) {
    return { url: result.url, seed: result.seed, similarity: 0, passed: true };
  }

  const check = await faceConsistencyCheck({
    persona_id,
    candidates: [{ url: result.url, seed: result.seed }],
    threshold: 0.85, // Tighter threshold post-LoRA
    updateAvg: true,
  });

  const cr = check.results[0];
  return {
    url: result.url,
    seed: result.seed,
    similarity: cr.similarity,
    passed: cr.passed,
  };
}
