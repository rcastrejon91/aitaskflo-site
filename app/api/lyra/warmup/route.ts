import { NextResponse } from "next/server";

const WARM_PROMPT = "a glowing red circle on black background";

const WARMUP_URLS = [
  // Pollinations — primary, free, no auth
  "https://image.pollinations.ai/prompt/a%20red%20circle?width=256&height=256&nologo=true",
  // HF fallback models
  "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell",
  "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
];

// Module-level flag so we only fire once per server instance
// and re-warm after 10 minutes in case models go cold again
let lastWarmup = 0;
const WARMUP_INTERVAL_MS = 10 * 60 * 1000;

export async function POST() {
  const now = Date.now();
  if (now - lastWarmup < WARMUP_INTERVAL_MS) {
    return NextResponse.json({ status: "already_warm" });
  }
  lastWarmup = now;

  const hfToken = process.env.HF_TOKEN;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (hfToken) headers["Authorization"] = `Bearer ${hfToken}`;
  const body = JSON.stringify({ inputs: WARM_PROMPT });

  // Pollinations — GET request
  fetch(WARMUP_URLS[0], { signal: AbortSignal.timeout(60_000) }).catch(() => {});

  // HF models — POST requests
  for (const url of WARMUP_URLS.slice(1)) {
    fetch(url, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(90_000),
    }).catch(() => {});
  }

  return NextResponse.json({ status: "warming" });
}
