/**
 * GIF Generation
 *
 * Three modes:
 *   A. Programmatic — animated text, patterns, color cycles (instant, free)
 *   B. AI frames    — generate N images with fal.ai, stitch into GIF (~30s)
 *   C. Video loop   — fal.ai video → served as mp4 (GIF-like loop in browser)
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const GIFEncoder = require("gif-encoder-2") as new (w: number, h: number, alg: string, useOptimizer: boolean) => {
  setDelay(ms: number): void; setRepeat(n: number): void; start(): void; finish(): void;
  addFrame(pixels: Uint8ClampedArray): void;
  out: { getData(): Buffer };
};
import { PNG } from "pngjs";

// ── A. Programmatic GIFs ──────────────────────────────────────────────────────

export type ProgrammaticGifStyle =
  | "bounce"       // text bouncing up/down
  | "pulse"        // text pulsing in/out
  | "typewriter"   // text typing itself out
  | "rainbow"      // text cycling through colors
  | "glitch"       // random color noise behind text
  | "bars"         // animated color bar pattern (no text)
  | "spinner";     // loading spinner

interface TextGifOptions {
  style?: ProgrammaticGifStyle;
  text?: string;
  width?: number;
  height?: number;
  fps?: number;
  frames?: number;
  bgColor?: [number, number, number];
  fgColor?: [number, number, number];
}

/** Draw text pixel-art style into a flat RGBA pixel buffer. */
function drawText(
  pixels: Uint8Array,
  w: number,
  h: number,
  text: string,
  x: number,
  y: number,
  color: [number, number, number],
  scale = 2
): void {
  // 5x7 bitmap font for ASCII 32-90
  const FONT: Record<string, number[]> = {
    A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x00],
    B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x1e, 0x00],
    C: [0x0e, 0x11, 0x10, 0x10, 0x11, 0x0e, 0x00],
    D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x1e, 0x00],
    E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x1f, 0x00],
    F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x00],
    G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x0f, 0x00],
    H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x00],
    I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x0e, 0x00],
    J: [0x07, 0x02, 0x02, 0x02, 0x12, 0x0c, 0x00],
    K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x13, 0x00],
    L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x1f, 0x00],
    M: [0x11, 0x1b, 0x15, 0x11, 0x11, 0x11, 0x00],
    N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x00],
    O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x0e, 0x00],
    P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x00],
    Q: [0x0e, 0x11, 0x11, 0x15, 0x12, 0x0d, 0x00],
    R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x00],
    S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x1e, 0x00],
    T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x00],
    U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0e, 0x00],
    V: [0x11, 0x11, 0x11, 0x11, 0x0a, 0x04, 0x00],
    W: [0x11, 0x11, 0x15, 0x15, 0x1b, 0x11, 0x00],
    X: [0x11, 0x0a, 0x04, 0x04, 0x0a, 0x11, 0x00],
    Y: [0x11, 0x0a, 0x04, 0x04, 0x04, 0x04, 0x00],
    Z: [0x1f, 0x02, 0x04, 0x08, 0x10, 0x1f, 0x00],
    " ": [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
    "!": [0x04, 0x04, 0x04, 0x04, 0x00, 0x04, 0x00],
    "?": [0x0e, 0x11, 0x02, 0x04, 0x00, 0x04, 0x00],
    ".": [0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x00],
    ",": [0x00, 0x00, 0x00, 0x00, 0x04, 0x08, 0x00],
    "0": [0x0e, 0x11, 0x13, 0x15, 0x19, 0x0e, 0x00],
    "1": [0x04, 0x0c, 0x04, 0x04, 0x04, 0x0e, 0x00],
    "2": [0x0e, 0x11, 0x02, 0x04, 0x08, 0x1f, 0x00],
    "3": [0x1f, 0x02, 0x06, 0x02, 0x11, 0x0e, 0x00],
    "4": [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x00],
    "5": [0x1f, 0x10, 0x1e, 0x01, 0x11, 0x0e, 0x00],
    "6": [0x06, 0x08, 0x1e, 0x11, 0x11, 0x0e, 0x00],
    "7": [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x00],
    "8": [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x0e, 0x00],
    "9": [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x0c, 0x00],
  };

  const chars = text.toUpperCase().split("");
  let cx = x;
  for (const ch of chars) {
    const bitmap = FONT[ch] ?? FONT[" "];
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (bitmap[row] & (1 << (4 - col))) {
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              const px = cx + col * scale + sx;
              const py = y + row * scale + sy;
              if (px >= 0 && px < w && py >= 0 && py < h) {
                const idx = (py * w + px) * 4;
                pixels[idx] = color[0];
                pixels[idx + 1] = color[1];
                pixels[idx + 2] = color[2];
                pixels[idx + 3] = 255;
              }
            }
          }
        }
      }
    }
    cx += 6 * scale; // 5 cols + 1 spacing
  }
}

function fillBackground(pixels: Uint8Array, w: number, h: number, color: [number, number, number]): void {
  for (let i = 0; i < w * h * 4; i += 4) {
    pixels[i] = color[0];
    pixels[i + 1] = color[1];
    pixels[i + 2] = color[2];
    pixels[i + 3] = 255;
  }
}

function hsl2rgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

export function createProgrammaticGif(opts: TextGifOptions = {}): Buffer {
  const {
    style = "bounce",
    text = "LYRA",
    width = 240,
    height = 80,
    fps = 15,
    frames = 30,
    bgColor = [10, 10, 20],
    fgColor = [180, 100, 255],
  } = opts;

  const encoder = new GIFEncoder(width, height, "neuquant", true);
  encoder.setDelay(Math.round(1000 / fps));
  encoder.setRepeat(0);
  encoder.start();

  const pixels = new Uint8Array(width * height * 4);
  const charWidth = text.length * 12 + (text.length - 1) * 4;
  const textX = Math.max(0, Math.floor((width - charWidth) / 2));
  const baseY = Math.floor((height - 14) / 2);

  for (let f = 0; f < frames; f++) {
    const t = f / frames;

    fillBackground(pixels, width, height, bgColor);

    if (style === "bounce") {
      const offsetY = Math.round(Math.sin(t * Math.PI * 2) * (height * 0.15));
      drawText(pixels, width, height, text, textX, baseY + offsetY, fgColor);

    } else if (style === "pulse") {
      const scale = Math.round(1 + Math.sin(t * Math.PI * 2) * 0.5 + 0.5);
      const s = Math.max(1, Math.min(3, scale));
      const cw = text.length * 6 * s;
      const cx = Math.floor((width - cw) / 2);
      const cy = Math.floor((height - 7 * s) / 2);
      drawText(pixels, width, height, text, cx, cy, fgColor, s);

    } else if (style === "typewriter") {
      const visibleChars = Math.ceil(t * text.length);
      drawText(pixels, width, height, text.slice(0, visibleChars), textX, baseY, fgColor);
      // Blinking cursor
      if (f % 8 < 4) {
        const cursorX = textX + visibleChars * 12;
        for (let cy = baseY; cy < baseY + 14; cy++) {
          for (let cx = cursorX; cx < cursorX + 2; cx++) {
            if (cx < width && cy < height) {
              const idx = (cy * width + cx) * 4;
              pixels[idx] = fgColor[0]; pixels[idx + 1] = fgColor[1]; pixels[idx + 2] = fgColor[2]; pixels[idx + 3] = 255;
            }
          }
        }
      }

    } else if (style === "rainbow") {
      const hue = (t * 360) % 360;
      const color = hsl2rgb(hue, 90, 65);
      drawText(pixels, width, height, text, textX, baseY, color);

    } else if (style === "glitch") {
      // Random colored noise strips
      for (let y = 0; y < height; y++) {
        if (Math.random() < 0.05) {
          const glitchColor: [number, number, number] = [Math.random() * 255, Math.random() * 100, Math.random() * 255];
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            pixels[idx] = glitchColor[0]; pixels[idx + 1] = glitchColor[1]; pixels[idx + 2] = glitchColor[2]; pixels[idx + 3] = 255;
          }
        }
      }
      drawText(pixels, width, height, text, textX, baseY, fgColor);

    } else if (style === "bars") {
      const barCount = 8;
      const barW = Math.floor(width / barCount);
      for (let b = 0; b < barCount; b++) {
        const hue = ((b / barCount) * 360 + t * 360) % 360;
        const color = hsl2rgb(hue, 90, 55);
        const barH = Math.floor((Math.sin((b / barCount + t) * Math.PI * 2) * 0.5 + 0.5) * height);
        for (let y = height - barH; y < height; y++) {
          for (let x = b * barW; x < (b + 1) * barW; x++) {
            const idx = (y * width + x) * 4;
            pixels[idx] = color[0]; pixels[idx + 1] = color[1]; pixels[idx + 2] = color[2]; pixels[idx + 3] = 255;
          }
        }
      }

    } else if (style === "spinner") {
      const cx = width / 2, cy = height / 2;
      const r = Math.min(width, height) * 0.35;
      const dotCount = 8;
      for (let d = 0; d < dotCount; d++) {
        const angle = (d / dotCount + t) * Math.PI * 2;
        const alpha = d / dotCount;
        const dx = Math.round(cx + Math.cos(angle) * r);
        const dy = Math.round(cy + Math.sin(angle) * r);
        const dotR = 4;
        const c: [number, number, number] = [Math.round(fgColor[0] * alpha), Math.round(fgColor[1] * alpha), Math.round(fgColor[2] * alpha)];
        for (let py = dy - dotR; py <= dy + dotR; py++) {
          for (let px = dx - dotR; px <= dx + dotR; px++) {
            if ((px - dx) ** 2 + (py - dy) ** 2 <= dotR ** 2 && px >= 0 && px < width && py >= 0 && py < height) {
              const idx = (py * width + px) * 4;
              pixels[idx] = c[0]; pixels[idx + 1] = c[1]; pixels[idx + 2] = c[2]; pixels[idx + 3] = 255;
            }
          }
        }
      }
    }

    encoder.addFrame(pixels as unknown as Uint8ClampedArray);
  }

  encoder.finish();
  return encoder.out.getData();
}

// ── B. AI frames → GIF ────────────────────────────────────────────────────────

/** Download an image URL and return its raw PNG buffer. */
async function fetchImageBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Decode a PNG buffer to raw RGBA pixels at a target size. */
async function pngToRgba(buf: Buffer, targetW: number, targetH: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const png = new PNG({ filterType: 4 });
    png.parse(buf, (err: Error | null, data: PNG) => {
      if (err) return reject(err);
      // Simple center-crop / scale — just use top-left region for now
      const pixels = new Uint8Array(targetW * targetH * 4);
      const srcW = data.width, srcH = data.height;
      for (let y = 0; y < targetH; y++) {
        for (let x = 0; x < targetW; x++) {
          const sx = Math.floor((x / targetW) * srcW);
          const sy = Math.floor((y / targetH) * srcH);
          const srcIdx = (sy * srcW + sx) * 4;
          const dstIdx = (y * targetW + x) * 4;
          pixels[dstIdx] = data.data[srcIdx];
          pixels[dstIdx + 1] = data.data[srcIdx + 1];
          pixels[dstIdx + 2] = data.data[srcIdx + 2];
          pixels[dstIdx + 3] = 255;
        }
      }
      resolve(pixels);
    });
  });
}

export interface AiGifOptions {
  frameUrls: string[];  // pre-generated image URLs
  width?: number;
  height?: number;
  fps?: number;
}

export async function createAiGif(opts: AiGifOptions): Promise<Buffer> {
  const { frameUrls, width = 480, height = 480, fps = 4 } = opts;

  const encoder = new GIFEncoder(width, height, "neuquant", true);
  encoder.setDelay(Math.round(1000 / fps));
  encoder.setRepeat(0);
  encoder.start();

  for (const url of frameUrls) {
    const buf = await fetchImageBuffer(url);
    const pixels = await pngToRgba(buf, width, height);
    encoder.addFrame(pixels as unknown as Uint8ClampedArray);
  }

  encoder.finish();
  return encoder.out.getData();
}
