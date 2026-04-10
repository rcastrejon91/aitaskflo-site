import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse, type NextRequest } from "next/server";

// ── Rate limiting ─────────────────────────────────────────────────────────────
// In-memory per-IP rate limiter (resets on server restart).
// For multi-instance deployments, swap backing store to Redis/KV.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const LIMITS: Record<string, { max: number; windowMs: number }> = {
  "/api/lyra/chat":    { max: 30, windowMs: 60_000 },  // 30 req/min
  "/api/wl":          { max: 60, windowMs: 60_000 },   // 60 req/min (white-label embeds)
  "/api/kb":          { max: 20, windowMs: 60_000 },   // 20 uploads/min
  "/api/lyra/social": { max: 60, windowMs: 60_000 },
  "/api/lyra/demo":   { max: 20, windowMs: 60_000 },
  "/api/lyra/learner":{ max: 60, windowMs: 60_000 },
};

function getRateLimit(pathname: string) {
  for (const [prefix, cfg] of Object.entries(LIMITS)) {
    if (pathname.startsWith(prefix)) return cfg;
  }
  return null;
}

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function checkRateLimit(req: NextRequest): NextResponse | null {
  const { pathname } = req.nextUrl;
  const limit = getRateLimit(pathname);
  if (!limit) return null;

  const ip = getIp(req);
  const key = `${ip}:${pathname.split("/").slice(0, 4).join("/")}`;
  const now = Date.now();

  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + limit.windowMs });
    return null;
  }

  entry.count++;
  if (entry.count > limit.max) {
    return new NextResponse(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(Math.ceil((entry.resetAt - now) / 1000)),
      },
    });
  }

  return null;
}

// ── Auth middleware ───────────────────────────────────────────────────────────
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  // Rate limit before auth checks
  const rateLimited = checkRateLimit(req);
  if (rateLimited) return rateLimited;

  // Allow internal test-runner requests that carry the LYRA_INTERNAL_KEY header.
  const internalKey = process.env.LYRA_INTERNAL_KEY;
  if (internalKey && req.headers.get("x-lyra-internal-key") === internalKey) {
    return NextResponse.next();
  }

  const adminKey = process.env.ADMIN_PASSWORD ?? process.env.ADMIN_KEY;
  if (adminKey) {
    const provided = req.headers.get("x-admin-key") ?? req.nextUrl.searchParams.get("key");
    if (provided === adminKey) return NextResponse.next();
  }

  // Public routes — no auth required
  const pathname = req.nextUrl.pathname;
  const publicPaths = ["/play", "/api/game/build"];
  if (publicPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (!req.auth) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  matcher: [
    "/lyra/:path*",
    "/api/lyra/:path*",
    "/api/wl/:path*",
    "/api/kb/:path*",
    "/api/game/:path*",
    "/play",
  ],
};
