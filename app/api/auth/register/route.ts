import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getAuthUserByEmail, createAuthUser } from "@/lib/lyra/db";

// Simple in-memory rate limiter: max 5 registrations per IP per hour
const attempts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return false;
  }
  if (entry.count >= 5) return true;
  entry.count++;
  return false;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many registration attempts. Try again later." }, { status: 429 });
  }

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
