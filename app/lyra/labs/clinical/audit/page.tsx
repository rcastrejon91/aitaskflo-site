export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDb } from "@/lib/lyra/db";
import { Shield, Clock, User, Database } from "lucide-react";

const ADMIN_IDS = ["admin-1", "b9969c91-8bb4-4377-aae5-94e2a8b7f718"];

interface AuditEntry {
  id: string; user_id: string; action: string; record_type: string;
  record_id: string | null; detail: string | null; ip: string | null; ts: string;
}

function getLog(userId: string, limit = 200): AuditEntry[] {
  const db = getDb();
  if (!db) return [];
  try {
    return db.prepare(
      "SELECT * FROM ehr_audit_log WHERE user_id = ? ORDER BY ts DESC LIMIT ?"
    ).all(userId, limit) as AuditEntry[];
  } catch { return []; }
}

const ACTION_COLORS: Record<string, string> = {
  create: "text-emerald-400 bg-emerald-900/30 border-emerald-500/20",
  read:   "text-blue-400 bg-blue-900/30 border-blue-500/20",
  update: "text-amber-400 bg-amber-900/30 border-amber-500/20",
  delete: "text-red-400 bg-red-900/30 border-red-500/20",
  search: "text-violet-400 bg-violet-900/30 border-violet-500/20",
  list:   "text-white/40 bg-white/5 border-white/10",
  export: "text-orange-400 bg-orange-900/30 border-orange-500/20",
};

export default async function AuditLogPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId || !ADMIN_IDS.includes(userId)) redirect("/lyra/labs");

  const log = getLog(userId, 200);

  const counts = log.reduce((acc, e) => {
    acc[e.action] = (acc[e.action] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">

      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(217,119,6,0.12)", border: "1px solid rgba(217,119,6,0.25)" }}>
          <Shield className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">PHI Audit Log</h1>
          <p className="text-white/35 text-xs">HIPAA § 164.312(b) · Every PHI access event logged</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="p-4 rounded-xl border text-center" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(217,119,6,0.15)" }}>
          <p className="text-2xl font-bold text-amber-300">{log.length}</p>
          <p className="text-xs text-white/35 mt-1">Total Events</p>
        </div>
        {Object.entries(counts).slice(0, 3).map(([action, count]) => (
          <div key={action} className="p-4 rounded-xl border text-center" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
            <p className="text-2xl font-bold text-white/70">{count}</p>
            <p className="text-xs text-white/35 mt-1 capitalize">{action}</p>
          </div>
        ))}
      </div>

      {/* Log table */}
      {log.length === 0 ? (
        <div className="p-8 rounded-2xl border text-center" style={{ borderColor: "rgba(217,119,6,0.15)", background: "rgba(217,119,6,0.04)" }}>
          <Shield className="w-8 h-8 text-amber-400/30 mx-auto mb-3" />
          <p className="text-white/40 text-sm">No audit events yet</p>
          <p className="text-white/25 text-xs mt-1">Create a patient or SOAP note in the Clinical Tools sandbox to generate events</p>
        </div>
      ) : (
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "rgba(217,119,6,0.15)" }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "rgba(217,119,6,0.08)", borderBottom: "1px solid rgba(217,119,6,0.15)" }}>
                {["Timestamp", "Action", "Type", "Record ID", "Detail", "IP"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-white/40 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {log.map((e, i) => (
                <tr key={e.id} style={{ background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <td className="px-4 py-2.5 text-white/40 font-mono whitespace-nowrap">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 shrink-0" />
                      {new Date(e.ts).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${ACTION_COLORS[e.action] ?? "text-white/40"}`}>
                      {e.action}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-1 text-white/50">
                      <Database className="w-3 h-3 shrink-0" />
                      {e.record_type}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-white/30 text-[10px]">{e.record_id?.slice(0, 12) ?? "—"}…</td>
                  <td className="px-4 py-2.5 text-white/35 max-w-xs truncate">{e.detail ?? "—"}</td>
                  <td className="px-4 py-2.5 text-white/25 font-mono">{e.ip ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-white/20">
        Showing last 200 events. Logs are append-only and tamper-evident.
      </p>
    </div>
  );
}
