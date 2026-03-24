import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function pollinationsUrl(prompt: string): string {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 999999)}`;
}

async function generateWithClaude(prompt: string): Promise<string> {
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });
  return msg.content[0].type === "text" ? msg.content[0].text : "";
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

  const jsonMatch = outlineRaw.match(/\{[\s\S]*\}/);
  const outline = JSON.parse(jsonMatch?.[0] ?? "{}");

  notify("Generating cover…");
  const coverUrl = pollinationsUrl(outline.coverImagePrompt ?? `${concept} book cover, professional artwork`);

  const chapters: BookChapter[] = [];

  for (const ch of (outline.chapters ?? []).slice(0, chapterCount)) {
    notify(`Writing Chapter ${ch.number}: ${ch.title}…`);

    const content = await generateWithClaude(`You are a bestselling ${genre} author.

Book: "${outline.title}"
Chapter ${ch.number}: "${ch.title}"
Summary: ${ch.summary}
${chapters.length > 0 ? `Previous chapter ended: "${chapters[chapters.length - 1].content.slice(-200)}"` : ""}

Write this chapter in full. Vivid, immersive prose. At least 600 words. No chapter title header — just the story.`);

    notify(`Illustrating Chapter ${ch.number}…`);
    const imageUrl = pollinationsUrl(ch.imagePrompt ?? `${ch.title} scene, ${genre} illustration`);

    chapters.push({ number: ch.number, title: ch.title, content, imageUrl });
  }

  return {
    title: outline.title ?? concept,
    subtitle: outline.subtitle ?? "",
    author: outline.author ?? "Lyra",
    description: outline.description ?? "",
    coverUrl,
    genre,
    chapters,
    createdAt: new Date().toISOString(),
  };
}
