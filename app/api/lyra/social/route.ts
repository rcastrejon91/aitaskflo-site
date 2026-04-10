import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAllPosts, getPublicFeed, getQueuedPosts, flushQueue, queuePostFromLearning } from "@/lib/lyra/social";
import { getAllLearnings } from "@/lib/lyra/weblearner";

// GET /api/lyra/social — public feed (no auth required)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view") ?? "feed";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "30"), 100);

  if (view === "queue") {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ posts: getQueuedPosts() });
  }

  if (view === "all") {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ posts: getAllPosts() });
  }

  // Public feed — no auth needed
  return NextResponse.json({ posts: getPublicFeed(limit) });
}

// POST /api/lyra/social — trigger actions (auth required)
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const action = body.action as string;

  // Flush queue — post everything queued to X
  if (action === "flush") {
    const result = await flushQueue();
    return NextResponse.json({ success: true, ...result });
  }

  // Generate posts from recent learnings that don't have posts yet
  if (action === "generate") {
    const learnings = getAllLearnings();
    const generated: string[] = [];
    const errors: string[] = [];

    const recent = learnings
      .sort((a, b) => new Date(b.learnedAt).getTime() - new Date(a.learnedAt).getTime())
      .slice(0, 5);

    for (const entry of recent) {
      try {
        const post = await queuePostFromLearning(entry);
        if (post) generated.push(post.topic);
      } catch (e) {
        errors.push(String(e));
      }
    }

    return NextResponse.json({ success: true, generated, errors });
  }

  // Generate + flush in one shot
  if (action === "generate-and-post") {
    const learnings = getAllLearnings();
    const recent = learnings
      .sort((a, b) => new Date(b.learnedAt).getTime() - new Date(a.learnedAt).getTime())
      .slice(0, 3);

    for (const entry of recent) {
      await queuePostFromLearning(entry).catch(() => {});
    }

    const result = await flushQueue();
    return NextResponse.json({ success: true, ...result });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
