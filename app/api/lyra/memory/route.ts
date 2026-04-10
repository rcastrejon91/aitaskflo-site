/**
 * /api/lyra/memory
 * GET  — fetch user's full memory tree (ideations, executions, skills)
 * DELETE — delete a specific memory entry { type, id }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getRecentIdeations, getRecentExecutions, deleteIdeation, deleteExecution } from "@/lib/lyra/dualMemory";
import { listActiveSkills, deleteSkill } from "@/lib/lyra/skills";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;

  const [ideations, executions, skills] = await Promise.all([
    Promise.resolve(getRecentIdeations(userId, 50)),
    Promise.resolve(getRecentExecutions(userId, 50)),
    Promise.resolve(listActiveSkills()),
  ]);

  return NextResponse.json({ ideations, executions, skills });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type, id } = await req.json().catch(() => ({})) as { type?: string; id?: string };
  if (!type || !id) return NextResponse.json({ error: "Missing type or id" }, { status: 400 });

  switch (type) {
    case "ideation":   deleteIdeation(id); break;
    case "execution":  deleteExecution(id); break;
    case "skill":      deleteSkill(id); break;
    default: return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
