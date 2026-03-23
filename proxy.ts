import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  // Allow internal test-runner requests that carry the LYRA_INTERNAL_KEY header.
  // This key is never exposed to the browser — only server-to-server calls use it.
  const internalKey = process.env.LYRA_INTERNAL_KEY;
  if (internalKey && req.headers.get("x-lyra-internal-key") === internalKey) {
    return NextResponse.next();
  }

  const adminKey = process.env.ADMIN_PASSWORD ?? process.env.ADMIN_KEY;
  if (adminKey) {
    const provided = req.headers.get("x-admin-key") ?? req.nextUrl.searchParams.get("key");
    if (provided === adminKey) return NextResponse.next();
  }

  if (!req.auth) {
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/lyra/:path*", "/api/lyra/:path*", "/play", "/api/game/:path*"],
};
