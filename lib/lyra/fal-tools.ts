/**
 * lib/lyra/fal-tools.ts
 * fal.ai integrations — images, video, audio, editing
 */

import { fal } from "@fal-ai/client";

function init() {
  fal.config({ credentials: process.env.FAL_KEY });
}

// fal.run can return { data: T, requestId } or T directly depending on SDK version
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function unwrap<T>(raw: unknown): T {
  const r = raw as any;
  return (r?.data !== undefined ? r.data : r) as T;
}

// ── Image generation (FLUX) ───────────────────────────────────────────────────

export async function falImageGen(prompt: string, model: "fast" | "quality" | "pro" = "fast"): Promise<string> {
  init();
  const modelId =
    model === "pro"     ? "fal-ai/flux-pro"   :
    model === "quality" ? "fal-ai/flux/dev"    :
                          "fal-ai/flux/schnell";
  const raw = await fal.run(modelId, {
    input: {
      prompt,
      image_size: "landscape_4_3",
      num_inference_steps: model === "fast" ? 4 : 28,
      num_images: 1,
      enable_safety_checker: true,
    },
  });
  const result = unwrap<{ images: Array<{ url: string }> }>(raw);
  const url = result.images?.[0]?.url;
  if (!url) throw new Error("No image returned from fal.ai");
  return url;
}

// ── Image editing (transform) ─────────────────────────────────────────────────

export async function falImageEdit(imageUrl: string, prompt: string): Promise<string> {
  init();
  const raw = await fal.run("fal-ai/flux/dev/image-to-image", {
    input: {
      image_url: imageUrl,
      prompt,
      strength: 0.85,
      num_inference_steps: 28,
      num_images: 1,
    },
  });
  const result = unwrap<{ images: Array<{ url: string }> }>(raw);
  const url = result.images?.[0]?.url;
  if (!url) throw new Error("No image returned");
  return url;
}

// ── Background removal ────────────────────────────────────────────────────────

export async function falRemoveBg(imageUrl: string): Promise<string> {
  init();
  const raw = await fal.run("fal-ai/birefnet", {
    input: { image_url: imageUrl },
  });
  const result = unwrap<{ image: { url: string } }>(raw);
  const url = result.image?.url;
  if (!url) throw new Error("No image returned");
  return url;
}

// ── Upscale image ─────────────────────────────────────────────────────────────

export async function falUpscale(imageUrl: string, scale = 4): Promise<string> {
  init();
  const raw = await fal.run("fal-ai/aura-sr", {
    input: { image_url: imageUrl, upscaling_factor: String(scale) as "4" },
  });
  const result = unwrap<{ image: { url: string } }>(raw);
  const url = result.image?.url;
  if (!url) throw new Error("No image returned");
  return url;
}

// ── Text to video ─────────────────────────────────────────────────────────────

export async function falTextToVideo(prompt: string, duration = 5): Promise<string> {
  init();
  const dur = duration >= 8 ? "10" : "5";
  const raw = await fal.run("fal-ai/kling-video/v1.6/standard/text-to-video", {
    input: {
      prompt,
      duration: dur as "5" | "10",
      aspect_ratio: "16:9",
    },
  });
  const result = unwrap<{ video: { url: string } }>(raw);
  const url = result.video?.url;
  if (!url) throw new Error("No video returned");
  return url;
}

// ── Image to video ────────────────────────────────────────────────────────────

export async function falImageToVideo(imageUrl: string, prompt: string): Promise<string> {
  init();
  const raw = await fal.run("fal-ai/kling-video/v1.6/standard/image-to-video", {
    input: {
      image_url: imageUrl,
      prompt,
      duration: "5" as "5" | "10",
    },
  });
  const result = unwrap<{ video: { url: string } }>(raw);
  const url = result.video?.url;
  if (!url) throw new Error("No video returned");
  return url;
}

// ── Text to speech ────────────────────────────────────────────────────────────

type KokoroVoice = "af_heart" | "af_alloy" | "af_bella" | "af_jessica" | "af_nova" | "af_sarah" | "af_sky" | "am_adam" | "am_echo" | "am_eric" | "am_liam" | "am_michael";
const KOKORO_VOICES: KokoroVoice[] = ["af_jessica", "af_nova", "af_sarah", "am_adam", "am_echo", "am_liam", "am_michael"];

export async function falTTS(text: string, voiceHint = "aria"): Promise<string> {
  init();
  // Map simple names to kokoro voice IDs
  const voiceMap: Record<string, KokoroVoice> = {
    aria: "af_nova", jessica: "af_jessica", sarah: "af_sarah",
    michael: "am_michael", liam: "am_liam", adam: "am_adam", echo: "am_echo",
  };
  const voice: KokoroVoice = voiceMap[voiceHint.toLowerCase()] ?? KOKORO_VOICES[0];
  const raw = await fal.run("fal-ai/kokoro", {
    input: { prompt: text, voice, speed: 1.0 },
  });
  const result = unwrap<{ audio: { url: string } }>(raw);
  const url = result.audio?.url;
  if (!url) throw new Error("No audio returned");
  return url;
}

// ── Music generation ──────────────────────────────────────────────────────────

export async function falMusicGen(prompt: string, duration = 15): Promise<string> {
  init();
  const raw = await fal.run("fal-ai/stable-audio", {
    input: { prompt, seconds_total: duration, steps: 100 },
  });
  const result = unwrap<{ audio_file: { url: string } }>(raw);
  const url = result.audio_file?.url;
  if (!url) throw new Error("No audio returned");
  return url;
}

// ── Face swap ─────────────────────────────────────────────────────────────────

export async function falFaceSwap(sourceUrl: string, targetUrl: string): Promise<string> {
  init();
  const raw = await fal.run("fal-ai/face-swap", {
    input: { base_image_url: targetUrl, swap_image_url: sourceUrl },
  });
  const result = unwrap<{ image: { url: string } }>(raw);
  const url = result.image?.url;
  if (!url) throw new Error("No image returned");
  return url;
}

// ── PuLID — identity-consistent image generation ──────────────────────────────

export async function falPuLID(params: {
  prompt: string;
  referenceImageUrl: string;
  negativePrompt?: string;
  seed?: number;
  numInferenceSteps?: number;
  guidanceScale?: number;
}): Promise<{ url: string; seed: number }> {
  init();
  const raw = await fal.run("fal-ai/flux-pulid", {
    input: {
      prompt: params.prompt,
      reference_image_url: params.referenceImageUrl,
      negative_prompt: params.negativePrompt ?? "cartoon, anime, deformed, extra fingers, plastic skin, oversaturated, blurry",
      num_inference_steps: params.numInferenceSteps ?? 28,
      guidance_scale: params.guidanceScale ?? 3.5,
      ...(params.seed !== undefined ? { seed: params.seed } : {}),
    },
  });
  const result = unwrap<{ images: Array<{ url: string }>; seed?: number }>(raw);
  const url = result.images?.[0]?.url;
  if (!url) throw new Error("PuLID returned no image");
  return { url, seed: result.seed ?? 0 };
}

// ── Flux batch generation (multiple seeds) ────────────────────────────────────

export async function falImageGenBatch(params: {
  prompt: string;
  negativePrompt?: string;
  count: number;
  model?: "fast" | "quality" | "pro";
}): Promise<Array<{ url: string; seed: number; index: number }>> {
  init();
  const modelId =
    params.model === "pro"     ? "fal-ai/flux-pro"  :
    params.model === "quality" ? "fal-ai/flux/dev"   :
                                 "fal-ai/flux/schnell";

  const results: Array<{ url: string; seed: number; index: number }> = [];

  // Run in parallel batches of 5
  const batchSize = 5;
  for (let i = 0; i < params.count; i += batchSize) {
    const batch = Array.from({ length: Math.min(batchSize, params.count - i) }, (_, j) => i + j);
    const settled = await Promise.allSettled(
      batch.map(async (index) => {
        const seed = Math.floor(Math.random() * 999999999);
        const raw = await fal.run(modelId, {
          input: {
            prompt: params.prompt,
            negative_prompt: params.negativePrompt,
            image_size: "portrait_4_3",
            num_inference_steps: 28,
            num_images: 1,
            seed,
            enable_safety_checker: false,
          },
        });
        const result = unwrap<{ images: Array<{ url: string }> }>(raw);
        const url = result.images?.[0]?.url;
        if (!url) throw new Error("No image");
        return { url, seed, index };
      })
    );
    for (const s of settled) {
      if (s.status === "fulfilled") results.push(s.value);
    }
  }

  return results;
}

// ── Flux LoRA training ────────────────────────────────────────────────────────

export async function falLoRATrain(params: {
  trainingImages: Array<{ url: string; caption: string }>;
  triggerWord: string;
  steps?: number;
}): Promise<{ loraUrl: string; trainingLog: string }> {
  init();
  const raw = await fal.run("fal-ai/flux-lora-fast-training", {
    input: {
      images_data_url: params.trainingImages.map(i => i.url).join(","),
      trigger_word: params.triggerWord,
      steps: params.steps ?? 1500,
    },
  });
  const result = unwrap<{ diffusers_lora_file?: { url: string }; config_file?: { url: string } }>(raw);
  const loraUrl = result.diffusers_lora_file?.url;
  if (!loraUrl) throw new Error("LoRA training returned no weights URL");
  return { loraUrl, trainingLog: JSON.stringify(result) };
}

// ── Flux with LoRA ────────────────────────────────────────────────────────────

export async function falImageWithLoRA(params: {
  prompt: string;
  loraUrl: string;
  loraScale?: number;
  seed?: number;
}): Promise<{ url: string; seed: number }> {
  init();
  const seed = params.seed ?? Math.floor(Math.random() * 999999999);
  const raw = await fal.run("fal-ai/flux-lora", {
    input: {
      prompt: params.prompt,
      loras: [{ path: params.loraUrl, scale: params.loraScale ?? 0.9 }],
      image_size: "portrait_4_3",
      num_inference_steps: 28,
      seed,
      enable_safety_checker: false,
    },
  });
  const result = unwrap<{ images: Array<{ url: string }> }>(raw);
  const url = result.images?.[0]?.url;
  if (!url) throw new Error("No image from LoRA generation");
  return { url, seed };
}

