/**
 * app/api/lyra/story/route.ts
 * Story streaming endpoint — Lyra reads or generates stories in narrator mode.
 *
 * POST { text?: string, genre?: string, userId: string }
 *   text  → Lyra reads the provided text in story mode
 *   genre → Lyra generates a short story of that genre
 */

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { getStorySystemPrompt, extractTags, parseStoryBeats } from "@/lib/lyra/story-mode";
import { elevenLabsTTS } from "@/lib/lyra/fal-tools";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, genre, userId } = body as {
      text?: string;
      genre?: string;
      userId?: string;
    };

    if (!text && !genre) {
      return new Response(
        JSON.stringify({ error: "Provide either text or genre." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const userPrompt = text
      ? `Read the following story aloud in your narrator voice, adding [SOUND:] and [LIGHT:] tags at emotionally appropriate moments:\n\n${text}`
      : `Generate a short, atmospheric ${genre ?? "mystery"} story (400–600 words). Weave [SOUND:] and [LIGHT:] tags throughout at emotionally appropriate moments.`;

    const baseSystem = `You are Lyra, an AI companion. ${getStorySystemPrompt()}`;

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        let fullText = "";

        try {
          const stream = client.messages.stream({
            model: "claude-sonnet-4-6",
            max_tokens: 2048,
            system: baseSystem,
            messages: [{ role: "user", content: userPrompt }],
          });

          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const chunk = event.delta.text;
              fullText += chunk;
              controller.enqueue(encoder.encode(chunk));
            }
          }

          // After streaming full text, extract tags and beats
          const { cleanText, sounds, lights } = extractTags(fullText);
          const beats = parseStoryBeats(cleanText);

          // Emit a metadata JSON block for the client
          const meta = JSON.stringify({
            tool: "story_mode",
            sounds,
            lights,
            beats: beats.map((b) => ({ type: b.type, light: b.lightReaction, sound: b.soundEffect })),
            userId: userId ?? null,
          });
          controller.enqueue(encoder.encode(`\n${meta}`));

          // Generate TTS audio of the clean text (ElevenLabs "echo" voice)
          if (process.env.ELEVENLABS_API_KEY && cleanText.length > 0) {
            try {
              controller.enqueue(encoder.encode("\n\n🔊 Rendering narrator voice…\n"));
              const audioDataUrl = await elevenLabsTTS(cleanText.slice(0, 4000), "echo");
              const audioCard = JSON.stringify({
                tool: "fal_audio",
                url: audioDataUrl,
                type: "story",
                voice: "echo",
                preview: cleanText.slice(0, 80),
              });
              controller.enqueue(encoder.encode(`\n${audioCard}`));
            } catch (ttsErr) {
              // TTS failure is non-fatal — text already streamed
              const errMsg = ttsErr instanceof Error ? ttsErr.message : String(ttsErr);
              controller.enqueue(encoder.encode(`\n⚠️ TTS unavailable: ${errMsg.slice(0, 100)}`));
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          try {
            controller.enqueue(encoder.encode(`\n⚠️ Story error: ${msg}`));
          } catch { /* stream already closed */ }
        } finally {
          try { controller.close(); } catch { /* already closed */ }
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
