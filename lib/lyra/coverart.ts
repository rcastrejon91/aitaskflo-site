/**
 * lib/lyra/coverart.ts
 *
 * Professional cover art generator.
 * Generates book covers, magazine covers, album art, product packaging.
 *
 * Pipeline:
 *  1. Build an optimized AI prompt for the genre + style
 *  2. Generate base image (fal.ai FLUX Dev or Grok Aurora)
 *  3. Composite title/text overlays using sharp
 *  4. Save to /public/downloads/covers/
 *  5. Return public URL ready for Gumroad or download
 */

import path from "path";
import fs from "fs/promises";

// ── Cover types + dimensions ───────────────────────────────────────────────────

export type CoverFormat =
  | "book_standard"    // 6×9" — paperback, KDP
  | "book_wide"        // 5.5×8.5" — trade paperback
  | "ebook"            // 1600×2560px — Kindle cover
  | "magazine"         // 8.5×11" — standard magazine
  | "square"           // 3000×3000px — album / social
  | "landscape"        // 1920×1080px — YouTube thumbnail / banner
  | "product"          // 800×800px — Gumroad / Etsy product image

export type CoverGenre =
  | "dark_fantasy"
  | "romance"
  | "dark_romance"
  | "thriller"
  | "horror"
  | "sci_fi"
  | "literary"
  | "fantasy"
  | "self_help"
  | "magazine_fashion"
  | "magazine_lifestyle"
  | "album_art"
  | "mystical"

export const FORMAT_SIZES: Record<CoverFormat, { w: number; h: number; label: string }> = {
  book_standard:  { w: 1800, h: 2700, label: "Book Cover (6×9\")" },
  book_wide:      { w: 1650, h: 2550, label: "Trade Paperback (5.5×8.5\")" },
  ebook:          { w: 1600, h: 2560, label: "eBook / Kindle" },
  magazine:       { w: 2550, h: 3300, label: "Magazine Cover" },
  square:         { w: 3000, h: 3000, label: "Square (Album/Product)" },
  landscape:      { w: 1920, h: 1080, label: "Landscape (Banner/Thumbnail)" },
  product:        { w: 1200, h: 1200, label: "Product Image" },
};

const GENRE_PROMPTS: Record<CoverGenre, string> = {
  dark_fantasy:      "dark fantasy digital art, dramatic lighting, mystical atmosphere, intricate magical details, deep purples and blacks, epic composition, professional book cover quality",
  romance:           "romantic digital art, soft warm lighting, beautiful couple or lone figure, pastel tones, elegant composition, dreamy atmosphere, professional romance novel cover",
  dark_romance:      "dark romance digital art, moody atmospheric lighting, sensual tension, rich jewel tones, mysterious elegant figure, thorns and flowers motif, professional cover quality",
  thriller:          "thriller cover art, stark high-contrast lighting, tension and danger atmosphere, muted cold palette with sharp accents, cinematic composition, professional thriller novel",
  horror:            "horror cover art, unsettling atmosphere, dark dramatic shadows, eerie red and black palette, psychological tension, professional horror novel cover quality",
  sci_fi:            "science fiction cover art, futuristic technology, cosmic scale, neon and chrome palette, cinematic sci-fi atmosphere, epic space or cyberpunk composition",
  literary:          "literary fiction cover art, conceptual abstract imagery, elegant minimalist or painterly style, sophisticated color palette, award-winning book cover quality",
  fantasy:           "epic fantasy cover art, grand magical landscapes, heroic figure, rich vibrant palette, detailed worldbuilding elements, professional fantasy novel cover",
  self_help:         "modern clean cover art, inspiring uplifting imagery, bold confident composition, clean minimalist design, professional non-fiction book cover",
  magazine_fashion:  "fashion magazine cover, high fashion editorial photography style, model or fashion illustration, bold color blocking, magazine layout composition, Vogue-quality aesthetic",
  magazine_lifestyle: "lifestyle magazine cover, aspirational imagery, clean modern editorial design, warm inviting atmosphere, professional magazine cover quality",
  album_art:         "music album cover art, bold graphic design, unique artistic vision, high impact visual, iconic imagery, professional album artwork quality",
  mystical:          "mystical spiritual artwork, sacred geometry, cosmic consciousness, deep purples and golds, ethereal atmosphere, tarot or oracle card quality",
};

// ── Prompt builder ─────────────────────────────────────────────────────────────

export function buildCoverPrompt(opts: {
  title?: string;
  genre: CoverGenre;
  subject?: string;      // main visual subject (e.g. "a lone witch in a frozen forest")
  mood?: string;         // extra mood/style notes
  noText?: boolean;      // skip text-safe zone instruction
}): string {
  const genreBase = GENRE_PROMPTS[opts.genre];
  const subject = opts.subject ? `Subject: ${opts.subject}. ` : "";
  const mood = opts.mood ? `Mood/style: ${opts.mood}. ` : "";
  const textSafe = opts.noText ? "" : "Leave clear text-safe zones at top and bottom for title and author text. ";
  return `${subject}${genreBase}. ${mood}${textSafe}Ultra high resolution, no watermarks, no text in image, professional commercial quality, stunning visual impact.`;
}

// ── Text overlay compositor ────────────────────────────────────────────────────

export interface TextOverlay {
  title: string;
  subtitle?: string;
  author?: string;
  tagline?: string;
}

async function compositeText(
  imageBuf: Buffer,
  overlay: TextOverlay,
  format: CoverFormat
): Promise<Buffer> {
  try {
    const sharp = (await import("sharp")).default;
    const { w, h } = FORMAT_SIZES[format];

    // Resize image to exact cover dimensions first
    const base = await sharp(imageBuf).resize(w, h, { fit: "cover", position: "center" }).toBuffer();
    const meta = await sharp(base).metadata();
    const iw = meta.width ?? w;
    const ih = meta.height ?? h;

    // Build SVG text overlay
    const titleSize = Math.round(iw * 0.08);
    const subtitleSize = Math.round(iw * 0.04);
    const authorSize = Math.round(iw * 0.035);
    const taglineSize = Math.round(iw * 0.03);
    const pad = Math.round(iw * 0.06);

    const escXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    const titleY = Math.round(ih * 0.12);
    const bottomY = ih - pad;

    const svgLines: string[] = [
      `<svg width="${iw}" height="${ih}" xmlns="http://www.w3.org/2000/svg">`,
      // Top gradient bar for title legibility
      `<defs>`,
      `  <linearGradient id="topGrad" x1="0" y1="0" x2="0" y2="1">`,
      `    <stop offset="0%" stop-color="rgba(0,0,0,0.75)"/>`,
      `    <stop offset="100%" stop-color="rgba(0,0,0,0)"/>`,
      `  </linearGradient>`,
      `  <linearGradient id="botGrad" x1="0" y1="0" x2="0" y2="1">`,
      `    <stop offset="0%" stop-color="rgba(0,0,0,0)"/>`,
      `    <stop offset="100%" stop-color="rgba(0,0,0,0.8)"/>`,
      `  </linearGradient>`,
      `</defs>`,
      `<rect width="${iw}" height="${Math.round(ih * 0.28)}" fill="url(#topGrad)"/>`,
      `<rect y="${Math.round(ih * 0.72)}" width="${iw}" height="${Math.round(ih * 0.28)}" fill="url(#botGrad)"/>`,
      // Title
      `<text x="${iw / 2}" y="${titleY}" text-anchor="middle" font-family="Georgia, serif" font-size="${titleSize}" font-weight="bold" fill="white" letter-spacing="2" style="text-shadow: 0 2px 8px rgba(0,0,0,0.9);">${escXml(overlay.title)}</text>`,
    ];

    // Subtitle below title
    if (overlay.subtitle) {
      svgLines.push(`<text x="${iw / 2}" y="${titleY + titleSize + subtitleSize + 8}" text-anchor="middle" font-family="Georgia, serif" font-size="${subtitleSize}" fill="rgba(255,255,255,0.8)" font-style="italic">${escXml(overlay.subtitle)}</text>`);
    }

    // Author name at bottom
    if (overlay.author) {
      svgLines.push(`<text x="${iw / 2}" y="${bottomY}" text-anchor="middle" font-family="Georgia, serif" font-size="${authorSize}" fill="rgba(255,255,255,0.85)" letter-spacing="3">${escXml(overlay.author.toUpperCase())}</text>`);
    }

    // Tagline above author
    if (overlay.tagline) {
      const tagY = overlay.author ? bottomY - authorSize - 14 : bottomY;
      svgLines.push(`<text x="${iw / 2}" y="${tagY}" text-anchor="middle" font-family="Georgia, serif" font-size="${taglineSize}" fill="rgba(255,255,255,0.6)" font-style="italic">${escXml(overlay.tagline)}</text>`);
    }

    svgLines.push("</svg>");

    const svg = Buffer.from(svgLines.join("\n"));

    return await sharp(base)
      .composite([{ input: svg, top: 0, left: 0 }])
      .jpeg({ quality: 95 })
      .toBuffer();

  } catch {
    // sharp failed — return original image unchanged
    return imageBuf;
  }
}

// ── Main generator ─────────────────────────────────────────────────────────────

export interface CoverResult {
  url: string;         // public URL
  filename: string;
  format: CoverFormat;
  genre: CoverGenre;
  withText: boolean;
  rawImageUrl: string; // original AI image before text overlay
}

export async function generateCover(opts: {
  title?: string;
  subtitle?: string;
  author?: string;
  tagline?: string;
  genre: CoverGenre;
  format?: CoverFormat;
  subject?: string;
  mood?: string;
  model?: "fal" | "grok";
  addText?: boolean;      // composite title/author text onto image
}): Promise<CoverResult> {
  const format = opts.format ?? "book_standard";
  const addText = opts.addText ?? !!(opts.title);
  const model = opts.model ?? "fal";  // "fal" = FLUX Schnell (fast, ~3s), "grok" = Aurora

  // 1. Build prompt
  const prompt = buildCoverPrompt({
    title: opts.title,
    genre: opts.genre,
    subject: opts.subject,
    mood: opts.mood,
    noText: !addText,
  });

  // 2. Generate base image — use fast model to stay within Cloudflare timeout
  let rawImageUrl: string;
  if (model === "grok" && process.env.XAI_API_KEY) {
    const { xaiImageGenSingle } = await import("./xai-tools");
    rawImageUrl = await xaiImageGenSingle(prompt);
  } else {
    const { falImageGen } = await import("./fal-tools");
    // "fast" = FLUX Schnell (~3s). Use "quality" only if explicitly requested.
    rawImageUrl = await falImageGen(prompt, model === "fal" ? "fast" : "quality");
  }

  // 3. Return the raw URL immediately — stream it to the user fast.
  //    Then do the heavy download + sharp composite + save in the background.
  const slug = (opts.title ?? "cover").replace(/[^a-z0-9]/gi, "-").toLowerCase().slice(0, 40);
  const filename = `${slug}-${format}-${Date.now()}.jpg`;
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const savedUrl = `${base}/downloads/covers/${filename}`;

  // Background: download, composite text, resize, save
  setImmediate(async () => {
    try {
      const imgRes = await fetch(rawImageUrl);
      const imgBuf = Buffer.from(await imgRes.arrayBuffer()) as Buffer;

      let finalBuf: Buffer = imgBuf;
      if (addText && opts.title) {
        finalBuf = await compositeText(imgBuf, {
          title: opts.title,
          subtitle: opts.subtitle,
          author: opts.author,
          tagline: opts.tagline,
        }, format);
      } else {
        try {
          const sharp = (await import("sharp")).default;
          const { w, h } = FORMAT_SIZES[format];
          finalBuf = await sharp(imgBuf).resize(w, h, { fit: "cover", position: "center" }).jpeg({ quality: 95 }).toBuffer() as Buffer;
        } catch { /* keep original */ }
      }

      const dir = path.join(process.cwd(), "public", "downloads", "covers");
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, filename), finalBuf);
    } catch { /* background processing failed — raw URL still works */ }
  });

  return {
    url: rawImageUrl,   // return immediately — fal.ai CDN URL works right away
    filename,
    format,
    genre: opts.genre,
    withText: addText,
    rawImageUrl,
  };
}
