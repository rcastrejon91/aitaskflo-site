/**
 * /api/lyra/pdf
 *
 * Generates and streams a KDP-ready PDF for a book or comic.
 * POST { type: "book", data: GeneratedBook } → PDF download
 * POST { type: "comic", data: GeneratedComic } → PDF download
 */

import { NextRequest, NextResponse } from "next/server";
import { generateBookPdf, generateComicPdf } from "@/lib/lyra/pdfgen";
import type { GeneratedBook } from "@/lib/lyra/bookgen";
import type { GeneratedComic } from "@/lib/lyra/pdfgen";

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    type: "book" | "comic";
    data: GeneratedBook | GeneratedComic;
  };

  try {
    let pdfBuffer: Buffer;
    let filename: string;

    if (body.type === "book") {
      const book = body.data as GeneratedBook;
      pdfBuffer = await generateBookPdf(book);
      filename = `${book.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-lyra.pdf`;
    } else {
      const comic = body.data as GeneratedComic;
      pdfBuffer = await generateComicPdf(comic);
      filename = `${comic.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-comic-lyra.pdf`;
    }

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
