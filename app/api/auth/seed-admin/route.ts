import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getAuthUserByUsernameOrEmail, createAuthUser } from "@/lib/lyra/db";

export const dynamic = "force-dynamic";

// One-time endpoint to seed the admin account from env vars.
// Set in .env.local:
//   ADMIN_USERNAME=adminricky
//   ADMIN_PASSWORD=lyra13witch
// Then call: POST /api/auth/seed-admin
// Protected by ADMIN_PASSWORD — cannot be called without it.

export async function POST(req: NextRequest) {
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminUsername || !adminPassword) {
    return NextResponse.json(
      { error: "ADMIN_USERNAME and ADMIN_PASSWORD env vars must be set" },
      { status: 500 }
    );
  }

  // Require the password to be provided in the request as a basic guard
  const body = await req.json().catch(() => ({}));
  if (body.password !== adminPassword) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const existing = getAuthUserByUsernameOrEmail(adminUsername);
  if (existing) {
    return NextResponse.json({ message: "Admin account already exists", id: existing.id });
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const user = createAuthUser(`${adminUsername}@aitaskflo.local`, adminUsername, passwordHash);

  return NextResponse.json({ message: "Admin account created", id: user.id, username: adminUsername });
}
