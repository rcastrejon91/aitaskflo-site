import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateContent, getAllDocs, deleteDoc, type GWFormat } from "@/lib/lyra/ghostwriter";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  return NextResponse.json({ docs: getAllDocs(userId) });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const body = await req.json().catch(() => ({}));
  const { format, topic, tone, context } = body as {
    format: GWFormat;
    topic: string;
    tone: string;
    context?: string;
  };

  if (!format || !topic || !tone) {
    return NextResponse.json({ error: "format, topic, and tone are required" }, { status: 400 });
  }

  try {
    const doc = await generateContent({ format, topic, tone, context, userId });
    return NextResponse.json({ doc });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const body = await req.json().catch(() => ({}));
  const { docId } = body as { docId: string };
  if (!docId) return NextResponse.json({ error: "docId required" }, { status: 400 });

  deleteDoc(userId, docId);
  return NextResponse.json({ success: true });
}
