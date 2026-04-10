import { NextRequest, NextResponse } from "next/server";

// In-memory rate limiter (per-IP, resets on server restart)
// For multi-instance deployments, swap backing store to Redis/KV.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const LIMITS: Record<string, { max: number; windowMs: number }> = {
  "/api/lyra/chat":    { max: 30,  windowMs: 60_000 },  // 30 req/min
  "/api/wl":          { max: 60,  windowMs: 60_000 },  // 60 req/min (white-label embeds)
  "/api/kb":          { max: 20,  windowMs: 60_000 },  // 20 uploads/min
  "/api/lyra/social": { max: 60,  windowMs: 60_000 },
  "/api/lyra/demo":   { max: 20,  windowMs: 60_000 },
  "/api/lyra/learner":{ max: 60,  windowMs: 60_000 },
};

function getLimit(pathname: string) {
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

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const limit = getLimit(pathname);
  if (!limit) return NextResponse.next();

  const ip = getIp(req);
  const key = `${ip}:${pathname.split("/").slice(0, 4).join("/")}`;
  const now = Date.now();

  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + limit.windowMs });
    return NextResponse.next();
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

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/lyra/:path*", "/api/wl/:path*", "/api/kb/:path*"],
};
