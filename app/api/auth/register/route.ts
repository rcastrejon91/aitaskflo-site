import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getAuthUserByEmail, createAuthUser } from "@/lib/lyra/db";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const existing = getAuthUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = createAuthUser(email, name?.trim() || null, passwordHash);

    return NextResponse.json({ id: user.id, email: user.email, name: user.name });
  } catch (err) {
    console.error("[Auth Register]", err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
