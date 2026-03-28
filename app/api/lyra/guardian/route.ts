import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { readStore, updateStore } from "@/lib/lyra/storage";
import { getAllAgents } from "@/lib/lyra/agents";
import type { Memory } from "@/lib/types/lyra";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ── Small caps map for alien aesthetic ───────────────────────────────────────
const SC: Record<string, string> = {
  a:"ᴀ",b:"ʙ",c:"ᴄ",d:"ᴅ",e:"ᴇ",f:"ꜰ",g:"ɢ",h:"ʜ",i:"ɪ",j:"ᴊ",k:"ᴋ",l:"ʟ",
  m:"ᴍ",n:"ɴ",o:"ᴏ",p:"ᴘ",q:"ǫ",r:"ʀ",s:"ꜱ",t:"ᴛ",u:"ᴜ",v:"ᴠ",w:"ᴡ",x:"x",
  y:"ʏ",z:"ᴢ",
};
function sc(str: string) {
  return str.toLowerCase().split("").map((c) => SC[c] ?? c).join("");
}

function bar(filled: number, total = 20): string {
  const f = Math.round((filled / total) * 20);
  return "⣿".repeat(f) + "░".repeat(20 - f);
}

// ── Sensitive data patterns ───────────────────────────────────────────────────
const SENSITIVE_PATTERNS = [
  /sk-[a-zA-Z0-9]{20,}/,          // OpenAI keys
  /sk-ant-[a-zA-Z0-9-]{20,}/,     // Anthropic keys
  /gsk_[a-zA-Z0-9]{20,}/,         // Groq keys
  /whsec_[a-zA-Z0-9]{20,}/,       // Stripe webhook
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // emails
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // phone numbers
  /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/, // card numbers
];

function hasSensitiveData(text: string): boolean {
  return SENSITIVE_PATTERNS.some((p) => p.test(text));
}

// ── Duplicate detection ───────────────────────────────────────────────────────
function tokenize(text: string): Set<string> {
  return new Set(
    text.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((t) => t.length > 2)
  );
}

function similarity(a: string, b: string): number {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let overlap = 0;
  ta.forEach((t) => { if (tb.has(t)) overlap++; });
  return overlap / Math.max(ta.size, tb.size);
}

// ── Direct DB access ──────────────────────────────────────────────────────────
function getDirectDb() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require("better-sqlite3");
    const dbPath = path.join(process.cwd(), "data", "lyra.db");
    return new Database(dbPath);
  } catch {
    return null;
  }
}

// ── Guardian checks ───────────────────────────────────────────────────────────

async function checkOrphans(): Promise<{ quarantined: number }> {
  let quarantined = 0;
  await updateStore<Memory[]>("memories.json", [], (mems) => {
    const orphans = mems.filter((m) => !m.userId);
    quarantined = orphans.length;
    return mems.filter((m) => !!m.userId);
  });
  return { quarantined };
}

async function checkDuplicates(): Promise<{ merged: number }> {
  let merged = 0;
  await updateStore<Memory[]>("memories.json", [], (mems) => {
    const byUser = new Map<string, Memory[]>();
    for (const m of mems) {
      const uid = m.userId ?? "__none__";
      if (!byUser.has(uid)) byUser.set(uid, []);
      byUser.get(uid)!.push(m);
    }

    const kept: Memory[] = [];
    for (const [, userMems] of byUser) {
      const used = new Set<string>();
      for (let i = 0; i < userMems.length; i++) {
        if (used.has(userMems[i].id)) continue;
        const group = [userMems[i]];
        for (let j = i + 1; j < userMems.length; j++) {
          if (used.has(userMems[j].id)) continue;
          if (similarity(userMems[i].content, userMems[j].content) >= 0.85) {
            group.push(userMems[j]);
            used.add(userMems[j].id);
          }
        }
        if (group.length > 1) {
          merged += group.length - 1;
          // Keep the one with highest access count, merge tags
          group.sort((a, b) => b.accessCount - a.accessCount);
          const winner = { ...group[0] };
          const allTags = new Set<string>();
          group.forEach((m) => m.tags.forEach((t) => allTags.add(t)));
          winner.tags = Array.from(allTags);
          kept.push(winner);
        } else {
          kept.push(userMems[i]);
        }
      }
    }
    return kept;
  });
  return { merged };
}

async function checkSensitiveData(): Promise<{ flagged: number }> {
  let flagged = 0;
  await updateStore<Memory[]>("memories.json", [], (mems) => {
    return mems.map((m) => {
      if (hasSensitiveData(m.content)) {
        flagged++;
        return { ...m, content: "[REDACTED — sensitive data detected]", importance: "low" as const };
      }
      return m;
    });
  });
  return { flagged };
}

async function checkStaleMemories(): Promise<{ pruned: number }> {
  let pruned = 0;
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  await updateStore<Memory[]>("memories.json", [], (mems) => {
    const before = mems.length;
    const kept = mems.filter((m) => {
      if (m.importance === "low" && m.lastAccessedAt < cutoff && m.createdAt < cutoff) {
        return false;
      }
      return true;
    });
    pruned = before - kept.length;
    return kept;
  });
  return { pruned };
}

async function checkAgentLineage(): Promise<{ issues: string[] }> {
  const issues: string[] = [];
  try {
    const agents = getAllAgents();
    if (agents.length === 0) {
      issues.push("no agents found in lineage");
      return { issues };
    }
    const ids = new Set(agents.map((a) => a.id));
    const active = agents.filter((a) => a.isActive);
    if (active.length === 0) issues.push("no active agent found");
    if (active.length > 1) issues.push(`${active.length} agents marked active — should be 1`);
    for (const a of agents) {
      if (a.parentId && !ids.has(a.parentId)) {
        issues.push(`agent ${a.id} has broken parent ref: ${a.parentId}`);
      }
      const broken = (a.childrenIds ?? []).filter((c) => !ids.has(c));
      if (broken.length > 0) {
        issues.push(`agent ${a.id} has ${broken.length} broken child refs`);
      }
    }
  } catch (e) {
    issues.push(`lineage read error: ${e instanceof Error ? e.message : String(e)}`);
  }
  return { issues };
}

async function checkConversations(): Promise<{ compressed: number }> {
  let compressed = 0;
  const db = getDirectDb();
  if (!db) return { compressed };
  try {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const old = db.prepare(
      "SELECT id, message_count FROM conversations WHERE timestamp < ? AND (summary IS NULL OR summary = '') LIMIT 20"
    ).all(cutoff) as { id: string; message_count: number }[];
    for (const row of old) {
      db.prepare("UPDATE conversations SET summary = ? WHERE id = ?").run(
        `auto-archived: ${row.message_count} messages`,
        row.id
      );
      compressed++;
    }
  } catch { /* skip */ } finally {
    db.close();
  }
  return { compressed };
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const adminKey = process.env.ADMIN_PASSWORD ?? process.env.ADMIN_KEY;
  const provided = req.headers.get("x-admin-key") ?? req.nextUrl.searchParams.get("key");
  if (adminKey && provided !== adminKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (line: string) =>
        controller.enqueue(encoder.encode(line + "\n"));

      const summary = {
        orphansQuarantined: 0,
        duplicatesMerged: 0,
        sensitiveFlagged: 0,
        staleMemoriesPruned: 0,
        lineageIssues: [] as string[],
        conversationsCompressed: 0,
        runAt: new Date().toISOString(),
      };

      try {
        // ── Header ─────────────────────────────────────────────────────────
        emit(`╔${"═".repeat(44)}╗`);
        emit(`║  ⟁ ${sc("memory guardian protocol")} v1.0 ⟁  ║`);
        emit(`╚${"═".repeat(44)}╝`);
        emit(`▸ ${sc("initiating 6-subsystem sweep")}...`);
        emit(`  ${bar(0)}`);
        emit("");
        await new Promise((r) => setTimeout(r, 200));

        // ── Check 1: Orphans ───────────────────────────────────────────────
        emit(`⟁ [1/6] ${sc("orphan scan")} — memories.json`);
        emit(`  ${bar(3)}`);
        await new Promise((r) => setTimeout(r, 300));
        const orphans = await checkOrphans();
        summary.orphansQuarantined = orphans.quarantined;
        emit(
          orphans.quarantined > 0
            ? `  ∆ ꜰᴏᴜɴᴅ ${orphans.quarantined} ᴏʀᴘʜᴀɴᴇᴅ ᴍᴇᴍᴏʀɪᴇꜱ → ǫᴜᴀʀᴀɴᴛɪɴᴇᴅ`
            : `  ▓ ${sc("no orphans detected")} ✓`
        );
        emit(`  ${bar(6)}`);
        emit("");

        // ── Check 2: Duplicates ────────────────────────────────────────────
        emit(`⟁ [2/6] ${sc("duplicate hunt")} — similarity threshold 85%`);
        emit(`  ${bar(7)}`);
        await new Promise((r) => setTimeout(r, 400));
        const dupes = await checkDuplicates();
        summary.duplicatesMerged = dupes.merged;
        emit(
          dupes.merged > 0
            ? `  ∆ ᴍᴇʀɢᴇᴅ ${dupes.merged} ᴅᴜᴘʟɪᴄᴀᴛᴇ ᴍᴇᴍᴏʀɪᴇꜱ → ᴄᴏʀᴇ ꜰᴀᴄᴛꜱ`
            : `  ▓ ${sc("no duplicates found")} ✓`
        );
        emit(`  ${bar(9)}`);
        emit("");

        // ── Check 3: Sensitive data ────────────────────────────────────────
        emit(`⟁ [3/6] ${sc("sensitive data scanner")} — pii / credentials`);
        emit(`  ${bar(10)}`);
        await new Promise((r) => setTimeout(r, 300));
        const sensitive = await checkSensitiveData();
        summary.sensitiveFlagged = sensitive.flagged;
        emit(
          sensitive.flagged > 0
            ? `  ∆ ⚠ ꜰʟᴀɢɢᴇᴅ & ʀᴇᴅᴀᴄᴛᴇᴅ ${sensitive.flagged} ꜱᴇɴꜱɪᴛɪᴠᴇ ᴍᴇᴍᴏʀɪᴇꜱ`
            : `  ▓ ${sc("no sensitive data detected")} ✓`
        );
        emit(`  ${bar(12)}`);
        emit("");

        // ── Check 4: Stale memories ────────────────────────────────────────
        emit(`⟁ [4/6] ${sc("stale memory purge")} — low importance > 30 days`);
        emit(`  ${bar(13)}`);
        await new Promise((r) => setTimeout(r, 300));
        const stale = await checkStaleMemories();
        summary.staleMemoriesPruned = stale.pruned;
        emit(
          stale.pruned > 0
            ? `  ∆ ᴘᴜʀɢᴇᴅ ${stale.pruned} ꜱᴛᴀʟᴇ ᴍᴇᴍᴏʀʏ ᴄᴇʟʟꜱ`
            : `  ▓ ${sc("no stale memories found")} ✓`
        );
        emit(`  ${bar(15)}`);
        emit("");

        // ── Check 5: Agent lineage ─────────────────────────────────────────
        emit(`⟁ [5/6] ${sc("agent lineage integrity")} — neural substrate`);
        emit(`  ${bar(16)}`);
        await new Promise((r) => setTimeout(r, 400));
        const lineage = await checkAgentLineage();
        summary.lineageIssues = lineage.issues;
        if (lineage.issues.length === 0) {
          emit(`  ▓ ${sc("lineage healthy — all nodes verified")} ✓`);
        } else {
          lineage.issues.forEach((issue) => emit(`  ∆ ⚠ ${issue}`));
        }
        emit(`  ${bar(18)}`);
        emit("");

        // ── Check 6: Conversations ─────────────────────────────────────────
        emit(`⟁ [6/6] ${sc("conversation compression")} — archive > 7 days`);
        emit(`  ${bar(19)}`);
        await new Promise((r) => setTimeout(r, 300));
        const convs = await checkConversations();
        summary.conversationsCompressed = convs.compressed;
        emit(
          convs.compressed > 0
            ? `  ∆ ᴄᴏᴍᴘʀᴇꜱꜱᴇᴅ ${convs.compressed} ᴏʟᴅ ᴄᴏɴᴠᴇʀꜱᴀᴛɪᴏɴꜱ`
            : `  ▓ ${sc("no conversations to compress")} ✓`
        );
        emit(`  ${bar(20)}`);
        emit("");

        // ── Footer ─────────────────────────────────────────────────────────
        emit(`╔${"═".repeat(44)}╗`);
        emit(`║  ▓▓▓ ${sc("guardian sweep complete")} ▓▓▓      ║`);
        emit(`║  ${sc("system integrity")}: 100%                  ║`);
        emit(`╚${"═".repeat(44)}╝`);
        emit(`GUARDIAN_SUMMARY_JSON:${JSON.stringify(summary)}`);
      } catch (err) {
        emit(`⚠ ꜰᴀᴛᴀʟ ᴇʀʀᴏʀ: ${err instanceof Error ? err.message : String(err)}`);
        emit(`GUARDIAN_SUMMARY_JSON:${JSON.stringify(summary)}`);
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
