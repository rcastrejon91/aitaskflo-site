import { NextRequest, NextResponse } from "next/server";

const PYTHON_URL = process.env.PYTHON_ORCHESTRATOR_URL ?? "http://localhost:5328";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${PYTHON_URL}/api/lyra`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return NextResponse.json({ error: "orchestrator error" }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "orchestrator offline" }, { status: 503 });
  }
}

export async function GET() {
  try {
    const res = await fetch(`${PYTHON_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ ok: false, error: "orchestrator offline" }, { status: 503 });
  }
}
