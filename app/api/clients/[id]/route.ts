import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { upsertPipelineClient, deletePipelineClient, type PipelineVertical, type PipelineStatus } from "@/lib/lyra/db";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = parseInt(params.id, 10);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const body = await req.json();
  const client = upsertPipelineClient({
    id,
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

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = parseInt(params.id, 10);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  deletePipelineClient(id);
  return NextResponse.json({ ok: true });
}
