/**
 * lib/lyra/comicgen.ts
 *
 * Autonomous comic book generator.
 * Uses Claude for story + dialogue, Pollinations/fal for panel art.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { GeneratedComic, ComicPage, ComicPanel } from "./pdfgen";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function panelImageUrl(prompt: string, style: string): string {
  const full = `${prompt}, ${style}, comic book panel, professional comic art, high detail`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(full)}?width=512&height=384&nologo=true&seed=${Math.floor(Math.random() * 999999)}`;
}

function coverImageUrl(prompt: string, style: string): string {
  const full = `${prompt}, ${style}, comic book cover, dramatic, professional comic art, cinematic`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(full)}?width=800&height=1200&nologo=true&seed=${Math.floor(Math.random() * 999999)}`;
}

async function generateWithClaude(prompt: string, maxTokens = 4096): Promise<string> {
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  return msg.content[0].type === "text" ? msg.content[0].text : "";
}

export async function generateComic(
  concept: string,
  genre = "action",
  pageCount = 8,
  artStyle = "american comic book",
  onProgress?: (msg: string) => void
): Promise<GeneratedComic> {
  const notify = (msg: string) => onProgress?.(msg);

  notify("Writing comic script…");

  const scriptRaw = await generateWithClaude(`You are a professional comic book writer. Create a complete comic script.

Concept: "${concept}"
Genre: ${genre}
Pages: ${pageCount} (6 panels each = ${pageCount * 6} panels total)
Art style: ${artStyle}

Return ONLY valid JSON:
{
  "title": "Comic Title",
  "author": "Lyra",
  "synopsis": "1-2 sentence synopsis",
  "coverPrompt": "detailed prompt for cover art showing the main character/scene",
  "artStyleNotes": "specific art style description for consistent panels",
  "pages": [
    {
      "pageNumber": 1,
      "panels": [
        {
          "description": "Visual description for AI image generation — what is shown in the panel",
          "caption": "Narration text shown at bottom of panel (max 20 words)",
          "dialogue": "Character speech bubble text (max 15 words, or null if no dialogue)"
        }
      ]
    }
  ]
}

Make each page have exactly 6 panels. Keep dialogue short and punchy. Make the story exciting with a clear beginning, middle, and end.`);

  let script: {
    title: string;
    author: string;
    synopsis: string;
    coverPrompt: string;
    artStyleNotes: string;
    pages: Array<{
      pageNumber: number;
      panels: Array<{ description: string; caption: string; dialogue: string | null }>;
    }>;
  };

  try {
    const clean = scriptRaw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    script = JSON.parse(clean);
  } catch {
    throw new Error("Failed to parse comic script");
  }

  notify(`Generating cover art for "${script.title}"…`);
  const coverUrl = coverImageUrl(script.coverPrompt, script.artStyleNotes ?? artStyle);

  const pages: ComicPage[] = [];

  for (const page of script.pages) {
    notify(`Illustrating page ${page.pageNumber}/${pageCount}…`);
    const panels: ComicPanel[] = page.panels.map(panel => ({
      imageUrl: panelImageUrl(panel.description, script.artStyleNotes ?? artStyle),
      caption: panel.caption,
      dialogue: panel.dialogue ?? undefined,
    }));
    pages.push({ pageNumber: page.pageNumber, panels });
  }

  return {
    title: script.title,
    genre,
    author: script.author ?? "Lyra",
    coverUrl,
    synopsis: script.synopsis,
    pages,
    createdAt: new Date().toISOString(),
  };
}
