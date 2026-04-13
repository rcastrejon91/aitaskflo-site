import { NextRequest, NextResponse } from "next/server";
import { createProgrammaticGif, createAiGif } from "@/lib/lyra/gifgen";
import type { ProgrammaticGifStyle } from "@/lib/lyra/gifgen";

/**
 * POST /api/lyra/gif
 *
 * mode: "programmatic" — instant animated text/pattern GIF
 * mode: "frames"       — stitch pre-generated image URLs into a GIF
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    mode?: "programmatic" | "frames";
    // programmatic options
    style?: ProgrammaticGifStyle;
    text?: string;
    width?: number;
    height?: number;
    fps?: number;
    frames?: number;
    bgColor?: [number, number, number];
    fgColor?: [number, number, number];
    // frames options
    frameUrls?: string[];
  };

  const mode = body.mode ?? "programmatic";

  let gifBuffer: Buffer;

  if (mode === "frames") {
    if (!body.frameUrls?.length) {
      return NextResponse.json({ error: "frameUrls required for frames mode" }, { status: 400 });
    }
    gifBuffer = await createAiGif({
      frameUrls: body.frameUrls,
      width: body.width ?? 480,
      height: body.height ?? 480,
      fps: body.fps ?? 4,
    });
  } else {
    gifBuffer = createProgrammaticGif({
      style: body.style,
      text: body.text,
      width: body.width,
      height: body.height,
      fps: body.fps,
      frames: body.frames,
      bgColor: body.bgColor,
      fgColor: body.fgColor,
    });
  }

  return new NextResponse(new Uint8Array(gifBuffer), {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

/** GET /api/lyra/gif?style=rainbow&text=LYRA — quick programmatic GIF */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const style = (searchParams.get("style") ?? "rainbow") as ProgrammaticGifStyle;
  const text = searchParams.get("text") ?? "LYRA";
  const width = parseInt(searchParams.get("w") ?? "320", 10);
  const height = parseInt(searchParams.get("h") ?? "80", 10);

  const buf = createProgrammaticGif({ style, text, width, height });

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
