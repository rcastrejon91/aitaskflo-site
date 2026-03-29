/**
 * lib/lyra/fal-tools.ts
 * fal.ai integrations — images, video, audio, editing
 */

import { fal } from "@fal-ai/client";

function init() {
  fal.config({ credentials: process.env.FAL_KEY });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cast<T>(v: unknown): T { return v as T; }

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
