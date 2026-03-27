/**
 * /api/admin/whitelabel
 * CRUD for white-label configs. Admin-key protected.
 */
import { NextRequest, NextResponse } from "next/server";
import { listWhiteLabels, upsertWhiteLabel, deleteWhiteLabel, getWhiteLabel } from "@/lib/lyra/whitelabel";
import { buildEmbedScript, getWlChatEndpoint } from "@/lib/lyra/whitelabel";

function isAuthorized(req: NextRequest): boolean {
  const adminKey = process.env.ADMIN_PASSWORD ?? process.env.ADMIN_KEY;
  if (!adminKey) return true;
  const provided = req.headers.get("x-admin-key") ?? req.nextUrl.searchParams.get("key");
  return provided === adminKey;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const slug = req.nextUrl.searchParams.get("slug");
  if (slug) {
    const config = await getWhiteLabel(slug);
    if (!config) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const baseUrl = process.env.NEXTAUTH_URL ?? "https://aitaskflo.com";
    return NextResponse.json({
      config,
      embedScript: buildEmbedScript(config, baseUrl),
      chatEndpoint: getWlChatEndpoint(slug, baseUrl),
    });
  }

  const all = await listWhiteLabels();
  return NextResponse.json({ configs: all, count: all.length });
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.slug || !body.agencyName) {
    return NextResponse.json({ error: "slug and agencyName are required" }, { status: 400 });
  }

  const config = await upsertWhiteLabel({
    slug: body.slug,
    agencyName: body.agencyName,
    agentName: body.agentName ?? "Aria",
    tagline: body.tagline ?? "",
    primaryColor: body.primaryColor ?? "#7c3aed",
    logoUrl: body.logoUrl,
    systemPromptAddendum: body.systemPromptAddendum ?? "",
    allowedTools: body.allowedTools ?? [],
    planId: body.planId ?? "agency_starter",
    contactEmail: body.contactEmail ?? "",
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://aitaskflo.com";
  return NextResponse.json({
    config,
    embedScript: buildEmbedScript(config, baseUrl),
    chatEndpoint: getWlChatEndpoint(config.slug, baseUrl),
  });
}

export async function DELETE(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  const deleted = await deleteWhiteLabel(slug);
  return NextResponse.json({ deleted });
}
