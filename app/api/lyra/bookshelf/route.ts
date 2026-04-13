import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { saveBook, listBooks, deleteBook } from "@/lib/lyra/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const type = req.nextUrl.searchParams.get("type") ?? undefined;
  const books = listBooks(userId, type);

  // Parse content JSON for each book so the client gets full objects
  const parsed = books.map((b) => {
    let content: unknown = [];
    try { content = JSON.parse(b.content); } catch { /* keep empty */ }
    return { ...b, content };
  });

  return NextResponse.json({ books: parsed });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.title || !body?.content) {
    return NextResponse.json({ error: "title and content required" }, { status: 400 });
  }

  const id = saveBook({
    userId,
    type: body.type ?? "book",
    title: body.title,
    subtitle: body.subtitle,
    author: body.author,
    genre: body.genre,
    description: body.description,
    coverUrl: body.coverUrl,
    content: body.content,
    pdfPath: body.pdfPath,
    wordCount: body.wordCount,
  });

  return NextResponse.json({ id });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const ok = deleteBook(id, userId);
  return NextResponse.json({ ok });
}
