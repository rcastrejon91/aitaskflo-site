import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getBook } from "@/lib/lyra/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const book = getBook(id);
  if (!book || book.user_id !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let content: unknown = [];
  try { content = JSON.parse(book.content); } catch { /* keep empty */ }

  return NextResponse.json({ book: { ...book, content } });
}
