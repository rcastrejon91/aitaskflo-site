import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Proxies external audio URLs (fal.ai CDN) so the browser can play them inline.
 * Usage: /api/lyra/audio-proxy?url=<encoded-url>
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  // Only allow fal.ai CDN URLs to prevent open proxy abuse
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new NextResponse("Invalid URL", { status: 400 });
  }

  const allowedHosts = ["fal.media", "v3.fal.media", "storage.googleapis.com", "cdn.fal.ai"];
  const isAllowed = allowedHosts.some(
    (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`)
  );
  if (!isAllowed) {
    return new NextResponse("URL not allowed", { status: 403 });
  }

  try {
    const upstream = await fetch(url, {
      headers: { "User-Agent": "aitaskflo/1.0" },
    });

    if (!upstream.ok) {
      return new NextResponse("Upstream fetch failed", { status: upstream.status });
    }

    const contentType = upstream.headers.get("content-type") ?? "audio/mpeg";
    const body = await upstream.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": "inline",
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    return new NextResponse(`Proxy error: ${err instanceof Error ? err.message : String(err)}`, {
      status: 502,
    });
  }
}
