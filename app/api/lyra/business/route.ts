import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAllProfiles, deleteProfile } from "@/lib/lyra/businessos";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  return NextResponse.json({ profiles: getAllProfiles(userId) });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id } = await req.json().catch(() => ({})) as { id: string };
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  deleteProfile(userId, id);
  return NextResponse.json({ success: true });
}
