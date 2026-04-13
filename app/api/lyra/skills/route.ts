import { NextRequest, NextResponse } from "next/server";
import { listSkills, approveSkill, disableSkill, deleteSkill, getSkillLog } from "@/lib/lyra/db";

const SKILLS_ENABLED = process.env.SKILLS_ENABLED !== "false";

export async function GET() {
  try {
    const all = listSkills();
    const log = getSkillLog(undefined, 50);
    return NextResponse.json({ skills: all, log, skillsEnabled: SKILLS_ENABLED });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action, name } = await req.json() as { action: string; name: string };
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

    if (action === "approve") {
      approveSkill(name);
      return NextResponse.json({ ok: true });
    }
    if (action === "disable") {
      disableSkill(name);
      return NextResponse.json({ ok: true });
    }
    if (action === "delete") {
      deleteSkill(name);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
