import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { listPipelineClients, upsertPipelineClient, type PipelineVertical, type PipelineStatus } from "@/lib/lyra/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ clients: listPipelineClients() });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const client = upsertPipelineClient({
    name:     body.name ?? "Unnamed",
    business: body.business ?? null,
    vertical: (body.vertical ?? "other") as PipelineVertical,
    status:   (body.status ?? "prospect") as PipelineStatus,
    email:    body.email ?? null,
    phone:    body.phone ?? null,
    notes:    body.notes ?? null,
    demo_url: body.demo_url ?? null,
    follow_up: body.follow_up ?? null,
  });
  return NextResponse.json({ client });
}
