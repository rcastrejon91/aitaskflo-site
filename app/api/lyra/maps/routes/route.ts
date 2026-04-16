import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/lyra/db";
import { auth } from "@/auth";

// ── Ensure table exists ────────────────────────────────────────────────────────

function ensureSavedRoutesTable() {
  const db = getDb();
  if (!db) return false;
  db.exec(`
    CREATE TABLE IF NOT EXISTS saved_routes (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      name       TEXT NOT NULL,
      waypoints  TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_saved_routes_user_id ON saved_routes (user_id);
  `);
  return true;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface LatLng {
  lat: number;
  lng: number;
}

interface SavedRoute {
  id: string;
  user_id: string;
  name: string;
  waypoints: LatLng[];
  created_at: string;
}

interface SavedRouteRow {
  id: string;
  user_id: string;
  name: string;
  waypoints: string;
  created_at: string;
}

// ── GET: list saved routes for user ──────────────────────────────────────────

export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string } | undefined)?.id ?? "anonymous";

    if (!ensureSavedRoutesTable()) {
      return NextResponse.json({ routes: [] });
    }

    const db = getDb()!;
    const rows = db
      .prepare("SELECT * FROM saved_routes WHERE user_id = ? ORDER BY created_at DESC")
      .all(userId) as SavedRouteRow[];

    const routes: SavedRoute[] = rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      waypoints: JSON.parse(row.waypoints) as LatLng[],
      created_at: row.created_at,
    }));

    return NextResponse.json({ routes });
  } catch (err) {
    console.error("[maps/routes GET]", err);
    return NextResponse.json({ error: "Failed to fetch routes" }, { status: 500 });
  }
}

// ── POST: save a named route ──────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const sessionUserId = (session?.user as { id?: string } | undefined)?.id;

    const body = (await req.json()) as { name?: string; waypoints?: LatLng[]; userId?: string };
    const { name, waypoints, userId: bodyUserId } = body;

    const userId = sessionUserId ?? bodyUserId ?? "anonymous";

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    if (!Array.isArray(waypoints) || waypoints.length < 2) {
      return NextResponse.json({ error: "waypoints must be an array of at least 2 LatLng points" }, { status: 400 });
    }

    const validWaypoints = waypoints.every(
      wp => typeof wp === "object" && wp !== null && typeof wp.lat === "number" && typeof wp.lng === "number"
    );
    if (!validWaypoints) {
      return NextResponse.json({ error: "Each waypoint must have lat and lng numbers" }, { status: 400 });
    }

    if (!ensureSavedRoutesTable()) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    }

    const db = getDb()!;
    const id = crypto.randomUUID();
    const created_at = new Date().toISOString();

    db.prepare(
      "INSERT INTO saved_routes (id, user_id, name, waypoints, created_at) VALUES (?, ?, ?, ?, ?)"
    ).run(id, userId, name.trim(), JSON.stringify(waypoints), created_at);

    return NextResponse.json({
      success: true,
      route: { id, user_id: userId, name: name.trim(), waypoints, created_at },
    });
  } catch (err) {
    console.error("[maps/routes POST]", err);
    return NextResponse.json({ error: "Failed to save route" }, { status: 500 });
  }
}
