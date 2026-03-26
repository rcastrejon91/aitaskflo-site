import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getAuthUserByUsernameOrEmail, updateAuthUserPassword } from "@/lib/lyra/db";

export const dynamic = "force-dynamic";

// Resets the admin account password using the current ADMIN_PASSWORD env var.
// Call: POST /api/auth/reset-admin
// Body: { "password": "<ADMIN_PASSWORD from env>" }
// Protected by ADMIN_PASSWORD — cannot be called without matching it.

export async function POST(req: NextRequest) {
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminUsername || !adminPassword) {
    return NextResponse.json(
      { error: "ADMIN_USERNAME and ADMIN_PASSWORD env vars must be set" },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => ({}));
  if (body.password !== adminPassword) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const existing = getAuthUserByUsernameOrEmail(adminUsername);
  if (!existing) {
    return NextResponse.json(
      { error: "Admin account not found. Call /api/auth/seed-admin first." },
      { status: 404 }
    );
  }

  const newPasswordHash = await bcrypt.hash(adminPassword, 12);
  const updated = updateAuthUserPassword(existing.id, newPasswordHash);

  if (!updated) {
    return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
  }

  return NextResponse.json({
    message: "Admin password reset successfully",
    id: existing.id,
    username: adminUsername,
  });
}
