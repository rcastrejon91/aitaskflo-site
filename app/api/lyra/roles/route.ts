import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { parseJobDescription } from "@/lib/lyra/role-builder";
import { saveRoleBot, updateRoleBot, getRoleBot, listRoleBots, deleteRoleBot } from "@/lib/lyra/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function getUserId(req: NextRequest): Promise<string | null> {
  void req;
  const session = await auth();
  return (session?.user as { id?: string })?.id ?? null;
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const bot = getRoleBot(id);
    if (!bot || bot.user_id !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ bot });
  }

  const bots = listRoleBots(userId);
  return NextResponse.json({ bots });
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const action = (body.action as string) ?? "";

  // ── Parse JD → generate config ───────────────────────────────────────────
  if (action === "parse") {
    const jd = (body.jd as string) ?? "";
    if (!jd.trim()) return NextResponse.json({ error: "Job description is required" }, { status: 400 });
    try {
      const parsed = await parseJobDescription(jd);
      return NextResponse.json({ parsed });
    } catch (e) {
      return NextResponse.json({ error: String(e) }, { status: 500 });
    }
  }

  // ── Save a new role bot ───────────────────────────────────────────────────
  if (action === "create") {
    const { name, company, roleTitle, jdRaw, systemPrompt, tools, knowledge, tone, domain, responsibilities } = body as Record<string, unknown>;
    if (!name || !systemPrompt) return NextResponse.json({ error: "name and systemPrompt required" }, { status: 400 });
    const bot = saveRoleBot({
      userId,
      name: name as string,
      company: company as string | undefined,
      roleTitle: roleTitle as string | undefined,
      jdRaw: jdRaw as string | undefined,
      systemPrompt: systemPrompt as string,
      tools: Array.isArray(tools) ? tools as string[] : [],
      knowledge: knowledge as string | undefined,
      tone: tone as string | undefined,
      domain: domain as string | undefined,
      responsibilities: Array.isArray(responsibilities) ? responsibilities as string[] : [],
    });
    return NextResponse.json({ bot });
  }

  // ── Update existing ───────────────────────────────────────────────────────
  if (action === "update") {
    const id = body.id as string;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const bot = getRoleBot(id);
    if (!bot || bot.user_id !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });
    updateRoleBot(id, userId, {
      name: body.name as string | undefined,
      company: body.company as string | undefined,
      systemPrompt: body.systemPrompt as string | undefined,
      tools: Array.isArray(body.tools) ? body.tools as string[] : undefined,
      knowledge: body.knowledge as string | undefined,
      tone: body.tone as string | undefined,
      domain: body.domain as string | undefined,
    });
    return NextResponse.json({ ok: true });
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  if (action === "delete") {
    const id = body.id as string;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    deleteRoleBot(id, userId);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
