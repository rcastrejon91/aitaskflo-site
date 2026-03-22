import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fsp from "fs/promises";
import path from "path";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  // Admin key gate
  const adminKey = process.env.ADMIN_PASSWORD ?? process.env.ADMIN_KEY;
  const provided  = req.headers.get("x-admin-key");
  if (adminKey && provided !== adminKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const buildScript = path.join(process.cwd(), "game", "build-web.sh");
  const godotBin    = process.env.GODOT_BIN ?? "godot";
  const outDir      = path.join(process.cwd(), "public", "game");

  try {
    // Ensure output dir exists
    await fsp.mkdir(outDir, { recursive: true });

    const { stdout, stderr } = await execAsync(
      `bash "${buildScript}"`,
      {
        env: { ...process.env, GODOT_BIN: godotBin },
        timeout: 120_000, // 2 min build timeout
      }
    );

    const log = (stdout + "\n" + stderr).trim();
    const built = await fsp.access(path.join(outDir, "index.html")).then(() => true).catch(() => false);

    return NextResponse.json({ ok: built, log });
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    const log = ((e.stdout ?? "") + "\n" + (e.stderr ?? "") + "\n" + (e.message ?? "")).trim();
    return NextResponse.json({ ok: false, log }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // Check whether a build already exists
  const adminKey = process.env.ADMIN_PASSWORD ?? process.env.ADMIN_KEY;
  const provided  = req.headers.get("x-admin-key") ?? req.nextUrl.searchParams.get("key");
  if (adminKey && provided !== adminKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const outDir = path.join(process.cwd(), "public", "game");
  const exists = await fsp.access(path.join(outDir, "index.html")).then(() => true).catch(() => false);
  let buildTime: string | null = null;

  if (exists) {
    const stat = await fsp.stat(path.join(outDir, "index.html")).catch(() => null);
    buildTime = stat?.mtime.toISOString() ?? null;
  }

  return NextResponse.json({ built: exists, buildTime });
}
