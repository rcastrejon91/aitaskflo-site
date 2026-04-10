/**
 * /api/kb — Knowledge base management API
 * POST: upload a document
 * GET:  list documents for a slug
 * DELETE: remove a document
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { ingestDocument, listDocuments, deleteDocument, getKbStats, clearKnowledgeBase } from "@/lib/lyra/knowledge-base";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = [
  "text/plain",
  "text/csv",
  "text/markdown",
  "text/html",
  "application/json",
];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const slug = formData.get("slug") as string;
  const file = formData.get("file") as File | null;

  if (!slug || !file) return NextResponse.json({ error: "Missing slug or file" }, { status: 400 });
  if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });

  // Allow text/* types + json
  const fileType = file.type || "text/plain";
  if (!ALLOWED_TYPES.some(t => fileType.startsWith(t.split("/")[0]) || fileType === t)) {
    // Still try to process as text
  }

  let content: string;
  try {
    content = await file.text();
  } catch {
    return NextResponse.json({ error: "Could not read file" }, { status: 400 });
  }

  if (!content.trim()) return NextResponse.json({ error: "File is empty" }, { status: 400 });

  const doc = await ingestDocument(slug, file.name, fileType, content);
  return NextResponse.json({ success: true, doc });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  const [docs, stats] = await Promise.all([listDocuments(slug), getKbStats(slug)]);
  return NextResponse.json({ docs, stats });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug, docId, clearAll } = await req.json() as { slug: string; docId?: string; clearAll?: boolean };
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  if (clearAll) {
    await clearKnowledgeBase(slug);
    return NextResponse.json({ success: true, cleared: true });
  }

  if (!docId) return NextResponse.json({ error: "Missing docId" }, { status: 400 });
  const deleted = await deleteDocument(slug, docId);
  return NextResponse.json({ success: deleted });
}
