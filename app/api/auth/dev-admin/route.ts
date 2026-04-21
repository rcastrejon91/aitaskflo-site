import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/lyra/db";

export const dynamic = "force-dynamic";

const DEV_ADMIN_ID = "admin-1";
const DEV_ADMIN_EMAIL = "admin@aitaskflo.local";
const DEV_ADMIN_NAME = "Local Admin";
const DEV_ADMIN_PASSWORD = "admin12345";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
  }

  const passwordHash = await bcrypt.hash(DEV_ADMIN_PASSWORD, 12);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO auth_users (id, email, name, password_hash, created_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      email = excluded.email,
      name = excluded.name,
      password_hash = excluded.password_hash
  `).run(DEV_ADMIN_ID, DEV_ADMIN_EMAIL, DEV_ADMIN_NAME, passwordHash, now);

  return NextResponse.json({
    email: DEV_ADMIN_EMAIL,
    password: DEV_ADMIN_PASSWORD,
  });
}
