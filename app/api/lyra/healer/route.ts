import { NextRequest, NextResponse } from "next/server";
import fsp from "fs/promises";
import { exec as _exec } from "child_process";
import { promisify } from "util";
import nodePath from "path";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const execAsync = promisify(_exec);
const APP_DIR = process.env.APP_DIR ?? "/home/aitaskflo";
const LOG_FILE = process.env.LOG_FILE ?? "/tmp/aitaskflo.log";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function readLog(lines = 200): Promise<string> {
  try {
    const content = await fsp.readFile(LOG_FILE, "utf-8");
    return content.split("\n").slice(-lines).join("\n");
  } catch {
    return "(log file not found)";
  }
}

async function readFile(rel: string): Promise<string> {
  try {
    const safe = nodePath.resolve(APP_DIR, rel);
    if (!safe.startsWith(APP_DIR)) throw new Error("path traversal");
    return await fsp.readFile(safe, "utf-8");
  } catch (e) {
    return `(error reading ${rel}: ${e})`;
  }
}

async function writeFile(rel: string, content: string): Promise<void> {
  const safe = nodePath.resolve(APP_DIR, rel);
  if (!safe.startsWith(APP_DIR)) throw new Error("path traversal");
  await fsp.mkdir(nodePath.dirname(safe), { recursive: true });
  await fsp.writeFile(safe, content, "utf-8");
}

async function runCmd(cmd: string, cwd = APP_DIR): Promise<{ stdout: string; stderr: string; ok: boolean }> {
  try {
    const { stdout, stderr } = await execAsync(cmd, { cwd, timeout: 90_000 });
    return { stdout, stderr, ok: true };
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; message?: string };
    return { stdout: err.stdout ?? "", stderr: (err.stderr ?? "") + "\n" + (err.message ?? ""), ok: false };
  }
}

// ── Error pattern library ────────────────────────────────────────────────────

interface KnownPattern {
  id: string;
  name: string;
  match: RegExp;
  severity: "critical" | "warning" | "info";
  description: string;
}

const PATTERNS: KnownPattern[] = [
  {
    id: "ssr_stack_overflow",
    name: "SSR Stack Overflow",
    match: /RangeError: Maximum call stack size exceeded/,
    severity: "critical",
    description: "A CJS package with circular deps is bundled into the SSR chunk. Add it to serverExternalPackages.",
  },
  {
    id: "module_not_found",
    name: "Module Not Found",
    match: /Cannot find module '([^']+)'/,
    severity: "critical",
    description: "A required module is missing. Check imports and package.json.",
  },
  {
    id: "eaddrinuse",
    name: "Port Already In Use",
    match: /EADDRINUSE/,
    severity: "critical",
    description: "Another process is using the port. Kill the old process before starting.",
  },
  {
    id: "oom_killed",
    name: "OOM Killed",
    match: /^Killed$/m,
    severity: "critical",
    description: "Process killed by OOM killer. Add swap or reduce memory usage.",
  },
  {
    id: "nft_trace",
    name: "NFT Whole-Project Trace",
    match: /Encountered unexpected file in NFT list/,
    severity: "warning",
    description: "process.cwd() or dynamic require at module level causing Turbopack to bundle the whole project.",
  },
  {
    id: "type_error",
    name: "TypeError at Runtime",
    match: /TypeError: ([^\n]+)/,
    severity: "critical",
    description: "A runtime type error. Check null guards and type assertions.",
  },
  {
    id: "failed_server_action",
    name: "Failed Server Action",
    match: /Failed to find Server Action/,
    severity: "warning",
    description: "Stale client referencing a server action from an older build. Hard reload clears this.",
  },
  {
    id: "api_key_missing",
    name: "Missing API Key",
    match: /ANTHROPIC_API_KEY|API key|authentication_error/i,
    severity: "warning",
    description: "An API key is missing or invalid. Check .env.local.",
  },
];

function detectPatterns(log: string): Array<KnownPattern & { excerpt: string }> {
  const found: Array<KnownPattern & { excerpt: string }> = [];
  for (const p of PATTERNS) {
    const m = log.match(p.match);
    if (m) {
      const idx = log.indexOf(m[0]);
      const excerpt = log.slice(Math.max(0, idx - 80), idx + 300).trim();
      found.push({ ...p, excerpt });
    }
  }
  return found;
}

// ── Diagnose with Claude ─────────────────────────────────────────────────────

async function diagnose(log: string, patterns: ReturnType<typeof detectPatterns>): Promise<{
  summary: string;
  rootCause: string;
  fix: string;
  filesToRead: string[];
  patch?: { file: string; search: string; replace: string }[];
}> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const patternSummary = patterns.length
    ? patterns.map((p) => `[${p.severity.toUpperCase()}] ${p.name}: ${p.description}\nExcerpt: ${p.excerpt}`).join("\n\n")
    : "No known patterns matched.";

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: `You are a senior Next.js/TypeScript debugging AI. You analyze server logs and propose minimal, precise code fixes.
Always respond with valid JSON matching this exact schema:
{
  "summary": "one-sentence summary of all issues",
  "rootCause": "specific technical root cause",
  "fix": "clear explanation of the fix needed",
  "filesToRead": ["list of relative file paths to read for context before patching"],
  "patch": [
    { "file": "relative/path.ts", "search": "exact string to find", "replace": "replacement string" }
  ]
}
Keep patches minimal — only change what is necessary. Use empty array for patch if no code change is needed.`,
    messages: [{
      role: "user",
      content: `Analyze this Next.js server log and propose a fix.

## Known error patterns detected:
${patternSummary}

## Recent server log (last 200 lines):
\`\`\`
${log.slice(-6000)}
\`\`\`

Respond with JSON only.`,
    }],
  });

  const text = msg.content[0].type === "text" ? msg.content[0].text : "{}";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  try {
    return JSON.parse(jsonMatch?.[0] ?? "{}");
  } catch {
    return { summary: text.slice(0, 200), rootCause: "parse error", fix: text.slice(0, 400), filesToRead: [] };
  }
}

// ── Verify: try to build ─────────────────────────────────────────────────────

async function verifyBuild(): Promise<{ ok: boolean; output: string }> {
  const result = await runCmd("npm run build 2>&1", APP_DIR);
  return {
    ok: result.ok && !result.stdout.includes("Error:") && !result.stderr.includes("Error:"),
    output: (result.stdout + result.stderr).slice(-2000),
  };
}

// ── Healing history store (in-memory for this process) ───────────────────────

interface HealEvent {
  id: string;
  ts: string;
  patterns: string[];
  summary: string;
  rootCause: string;
  fix: string;
  patchApplied: boolean;
  buildOk: boolean | null;
  buildOutput: string;
  log: string;
}

const healHistory: HealEvent[] = [];

// ── Route ─────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const adminKey = process.env.ADMIN_PASSWORD ?? process.env.ADMIN_KEY;
  const provided  = req.headers.get("x-admin-key") ?? req.nextUrl.searchParams.get("key");
  if (adminKey && provided !== adminKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const action = req.nextUrl.searchParams.get("action") ?? "scan";

  if (action === "history") {
    return NextResponse.json({ history: healHistory.slice(-20) });
  }

  // ── Scan: detect issues, diagnose, optionally patch ────────────────────────
  const log = await readLog(200);
  const patterns = detectPatterns(log);

  if (action === "scan") {
    return NextResponse.json({
      patterns: patterns.map((p) => ({ id: p.id, name: p.name, severity: p.severity, excerpt: p.excerpt })),
      logTail: log.slice(-1500),
    });
  }

  if (action === "diagnose") {
    const diagnosis = await diagnose(log, patterns);

    // Read context files if requested
    const context: Record<string, string> = {};
    for (const f of (diagnosis.filesToRead ?? []).slice(0, 5)) {
      context[f] = await readFile(f);
    }

    return NextResponse.json({ patterns: patterns.map((p) => ({ id: p.id, name: p.name, severity: p.severity })), diagnosis, context });
  }

  if (action === "heal") {
    // Full healing cycle: diagnose → patch → build verify
    const diagnosis = await diagnose(log, patterns);
    const event: HealEvent = {
      id: Date.now().toString(36),
      ts: new Date().toISOString(),
      patterns: patterns.map((p) => p.id),
      summary: diagnosis.summary ?? "",
      rootCause: diagnosis.rootCause ?? "",
      fix: diagnosis.fix ?? "",
      patchApplied: false,
      buildOk: null,
      buildOutput: "",
      log: log.slice(-1000),
    };

    // Apply patches
    if (diagnosis.patch?.length) {
      for (const p of diagnosis.patch) {
        try {
          const current = await readFile(p.file);
          if (!current.includes(p.search)) {
            continue; // search string not found, skip
          }
          const patched = current.replace(p.search, p.replace);
          await writeFile(p.file, patched);
          event.patchApplied = true;
        } catch {
          // skip unwritable files
        }
      }

      if (event.patchApplied) {
        const build = await verifyBuild();
        event.buildOk = build.ok;
        event.buildOutput = build.output;

        if (!build.ok) {
          // Rollback all patches
          for (const p of diagnosis.patch) {
            try {
              const current = await readFile(p.file);
              const rolled = current.replace(p.replace, p.search);
              await writeFile(p.file, rolled);
            } catch { /* ignore */ }
          }
          event.patchApplied = false;
        }
      }
    }

    healHistory.push(event);
    return NextResponse.json(event);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
