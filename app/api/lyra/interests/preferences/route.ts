import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/lib/lyra/db";

/** GET /api/lyra/interests/preferences — current user's manual preferences */
export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const db = getDb();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  try {
    const row = db
      .prepare("SELECT manual_interests, tone_preference, avoid_topics FROM users WHERE id = ?")
      .get(userId) as { manual_interests: string | null; tone_preference: string | null; avoid_topics: string | null } | undefined;

    return NextResponse.json({
      manual_interests: row?.manual_interests ? (JSON.parse(row.manual_interests) as string[]) : [],
      tone_preference: row?.tone_preference ?? "",
      avoid_topics: row?.avoid_topics ?? "",
    });
  } catch {
    return NextResponse.json({ error: "Failed to read preferences" }, { status: 500 });
  }
}

/** PATCH /api/lyra/interests/preferences — update one or more preference fields */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const db = getDb();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  let body: {
    manual_interests?: string[];
    tone_preference?: string;
    avoid_topics?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (body.manual_interests !== undefined) {
      // Sanitize: max 30 tags, each max 40 chars, alphanumeric + spaces + hyphens
      const clean = body.manual_interests
        .map((t) => t.trim().toLowerCase().replace(/[^a-z0-9 \-]/g, "").slice(0, 40))
        .filter(Boolean)
        .slice(0, 30);
      fields.push("manual_interests = ?");
      values.push(JSON.stringify(clean));
    }

    if (body.tone_preference !== undefined) {
      fields.push("tone_preference = ?");
      values.push(body.tone_preference.trim().slice(0, 200) || null);
    }

    if (body.avoid_topics !== undefined) {
      fields.push("avoid_topics = ?");
      values.push(body.avoid_topics.trim().slice(0, 200) || null);
    }

    if (fields.length === 0) {
      return NextResponse.json({ ok: true });
    }

    values.push(userId);
    db.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).run(...values);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 });
  }
}
