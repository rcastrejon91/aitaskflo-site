import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function pollinationsUrl(prompt: string): string {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 999999)}`;
}

async function generateWithClaude(prompt: string): Promise<string> {
  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });
    return msg.content[0].type === "text" ? msg.content[0].text : "";
  } catch (e) {
    console.error("[bookgen] Claude API error:", e instanceof Error ? e.message : String(e));
    throw e;
  }
}

export interface BookChapter {
  number: number;
  title: string;
  content: string;
  imageUrl: string;
}

export interface GeneratedBook {
  title: string;
  subtitle: string;
  author: string;
  description: string;
  coverUrl: string;
  genre: string;
  chapters: BookChapter[];
  createdAt: string;
}

export async function generateBook(
  concept: string,
  genre = "fiction",
  chapterCount = 5,
  onProgress?: (msg: string) => void
): Promise<GeneratedBook> {
  const notify = (msg: string) => onProgress?.(msg);

  notify("Crafting outline…");

  const outlineRaw = await generateWithClaude(`You are a bestselling author. Create a detailed outline for a ${genre} book.

Concept: "${concept}"
Chapters: ${chapterCount}

Return ONLY valid JSON, no markdown:
{
  "title": "Final Book Title",
  "subtitle": "optional subtitle or empty string",
  "author": "Lyra",
  "description": "2-3 sentence book description",
  "coverImagePrompt": "detailed image prompt for book cover art",
  "chapters": [
    {
      "number": 1,
      "title": "Chapter Title",
      "summary": "2-3 sentence chapter summary",
      "imagePrompt": "detailed image prompt for chapter illustration"
    }
  ]
}`);

  const cleaned = outlineRaw.replace(/```json\n?/g, "").replace(/```\n?/g, "");
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  let outline: Record<string, unknown> = {};
  try { outline = JSON.parse(jsonMatch?.[0] ?? "{}"); } catch { outline = {}; }

  // If JSON parse failed or chapters missing, build a minimal fallback outline
  if (!Array.isArray(outline.chapters) || (outline.chapters as unknown[]).length === 0) {
    outline = {
      title: concept,
      subtitle: "",
      author: "Lyra",
      description: `A ${genre} story about ${concept}.`,
      coverImagePrompt: `${concept}, ${genre} book cover, dramatic professional artwork`,
      chapters: Array.from({ length: chapterCount }, (_, i) => ({
        number: i + 1,
        title: `Chapter ${i + 1}`,
        summary: `Events of chapter ${i + 1} in the story of ${concept}.`,
        imagePrompt: `${concept} chapter ${i + 1} scene, ${genre} illustration`,
      })),
    };
  }

  notify("Generating cover…");
  const coverUrl = pollinationsUrl((outline.coverImagePrompt as string | undefined) ?? `${concept} book cover, professional artwork`);

  const chapters: BookChapter[] = [];

  type ChapterOutline = { number: number; title: string; summary: string; imagePrompt?: string };
  const chapterOutlines = (outline.chapters as ChapterOutline[] | undefined) ?? [];
  for (const ch of chapterOutlines.slice(0, chapterCount)) {
    notify(`Writing Chapter ${ch.number}: ${ch.title}…`);

    const content = await generateWithClaude(`You are a bestselling ${genre} author.

Book: "${outline.title}"
Chapter ${ch.number}: "${ch.title}"
Summary: ${ch.summary}
${chapters.length > 0 ? `Previous chapter ended: "${chapters[chapters.length - 1].content.slice(-200)}"` : ""}

Write this chapter in full. Vivid, immersive prose. 300-400 words. No chapter title header — just the story.`);

    notify(`Illustrating Chapter ${ch.number}…`);
    const imageUrl = pollinationsUrl(ch.imagePrompt ?? `${ch.title} scene, ${genre} illustration`);

    chapters.push({ number: ch.number, title: ch.title, content, imageUrl });
  }

  const o = outline as Record<string, string>;
  return {
    title: o.title ?? concept,
    subtitle: o.subtitle ?? "",
    author: o.author ?? "Lyra",
    description: o.description ?? "",
    coverUrl,
    genre,
    chapters,
    createdAt: new Date().toISOString(),
  };
}
