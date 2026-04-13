/**
 * lib/lyra/xai-tools.ts
 * xAI (Grok) integrations — image generation via Aurora model
 * API is OpenAI-compatible: https://api.x.ai/v1
 */

const XAI_BASE = "https://api.x.ai/v1";

function getKey(): string {
  const k = process.env.XAI_API_KEY;
  if (!k) throw new Error("XAI_API_KEY not set — add it to .env.local");
  return k;
}

export interface XaiImage {
  url: string;
  revised_prompt?: string;
}

/**
 * Generate an image with Grok's Aurora model.
 * Returns a CDN URL to the generated image.
 */
export async function xaiImageGen(
  prompt: string,
  options: {
    n?: number;           // number of images (1–10, default 1)
    responseFormat?: "url" | "b64_json";
  } = {}
): Promise<XaiImage[]> {
  const key = getKey();
  const body = {
    model: "grok-2-image-1212",
    prompt,
    n: options.n ?? 1,
    response_format: options.responseFormat ?? "url",
  };

  const r = await fetch(`${XAI_BASE}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const err = await r.text();
    throw new Error(`xAI image gen failed (${r.status}): ${err}`);
  }

  const data = await r.json() as { data: Array<{ url?: string; b64_json?: string; revised_prompt?: string }> };
  return (data.data ?? []).map(d => ({
    url: d.url ?? `data:image/png;base64,${d.b64_json ?? ""}`,
    revised_prompt: d.revised_prompt,
  }));
}

/**
 * Generate a single image and return just the URL — drop-in compatible with falImageGen.
 */
export async function xaiImageGenSingle(prompt: string): Promise<string> {
  const images = await xaiImageGen(prompt, { n: 1 });
  const url = images[0]?.url;
  if (!url) throw new Error("xAI returned no image");
  return url;
}

/**
 * Generate multiple images in one call (up to 10).
 */
export async function xaiImageGenBatch(prompt: string, count: number): Promise<string[]> {
  const images = await xaiImageGen(prompt, { n: Math.min(count, 10) });
  return images.map(i => i.url).filter(Boolean);
}
