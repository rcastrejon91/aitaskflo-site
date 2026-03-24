import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";

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

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { title, concept, genre = "fiction", chapters = 5, style = "vivid and engaging" } = await req.json();
  if (!title && !concept) return NextResponse.json({ error: "title or concept required" }, { status: 400 });

  const bookTitle = title ?? concept;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
        } catch { /* stream closed */ }
      };

      try {
        // ── Step 1: Generate outline ──────────────────────────────────────
        send({ type: "status", message: "Crafting your book outline…" });

        const outlineRaw = await generateWithClaude(`You are a bestselling author. Create a detailed outline for a ${genre} book.

Title: "${bookTitle}"
${concept ? `Concept: ${concept}` : ""}
Chapters: ${chapters}
Writing style: ${style}

Return ONLY valid JSON, no markdown:
{
  "title": "Final Book Title",
  "subtitle": "optional subtitle",
  "author": "Lyra",
  "description": "2-3 sentence book description",
  "coverImagePrompt": "detailed image generation prompt for the book cover",
  "chapters": [
    {
      "number": 1,
      "title": "Chapter Title",
      "summary": "2-3 sentence chapter summary",
      "imagePrompt": "detailed image generation prompt for this chapter illustration"
    }
  ]
}`);

        const jsonMatch = outlineRaw.match(/\{[\s\S]*\}/);
        const outline = JSON.parse(jsonMatch?.[0] ?? "{}");

        send({ type: "outline", outline });

        // ── Step 2: Generate cover image ──────────────────────────────────
        send({ type: "status", message: "Generating book cover…" });
        const coverUrl = pollinationsUrl(outline.coverImagePrompt ?? `${bookTitle} book cover, professional, artistic`);
        send({ type: "cover", url: coverUrl });

        // ── Step 3: Write each chapter ────────────────────────────────────
        const writtenChapters: Array<{ number: number; title: string; content: string; imageUrl: string }> = [];

        for (const ch of outline.chapters ?? []) {
          send({ type: "status", message: `Writing Chapter ${ch.number}: ${ch.title}…` });

          const content = await generateWithClaude(`You are a bestselling ${genre} author writing in a ${style} style.

Book: "${outline.title}"
Chapter ${ch.number}: "${ch.title}"
Chapter summary: ${ch.summary}
${writtenChapters.length > 0 ? `Previous chapter ended: ${writtenChapters[writtenChapters.length - 1].content.slice(-200)}` : ""}

Write this full chapter. Be vivid, engaging, and immersive. At least 600 words. No chapter title header needed — just the prose.`);

          send({ type: "status", message: `Illustrating Chapter ${ch.number}…` });
          const imageUrl = pollinationsUrl(ch.imagePrompt ?? `${ch.title} scene illustration, ${genre}, artistic`);

          writtenChapters.push({
            number: ch.number,
            title: ch.title,
            content,
            imageUrl,
          });

          send({ type: "chapter", chapter: { number: ch.number, title: ch.title, content, imageUrl } });
        }

        // ── Step 4: Done ──────────────────────────────────────────────────
        send({
          type: "complete",
          book: {
            title: outline.title,
            subtitle: outline.subtitle ?? "",
            author: outline.author ?? "Lyra",
            description: outline.description ?? "",
            coverUrl,
            chapters: writtenChapters,
            genre,
            createdAt: new Date().toISOString(),
          },
        });

      } catch (err) {
        send({ type: "error", message: err instanceof Error ? err.message : "Book generation failed" });
      } finally {
        try { controller.close(); } catch { /* already closed */ }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
    },
  });
}
