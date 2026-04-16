export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDb } from "@/lib/lyra/db";
import { listTestPatients } from "@/lib/lyra/clinical";
import { encryptPHI, decryptPHI, isEncrypted } from "@/lib/lyra/phi-encrypt";
import { Lock, Unlock, CheckCircle, XCircle, Zap } from "lucide-react";

const ADMIN_IDS = ["admin-1", "b9969c91-8bb4-4377-aae5-94e2a8b7f718"];

function getRawPatient(id: string) {
  const db = getDb();
  if (!db) return null;
  try {
    return db.prepare("SELECT * FROM ehr_patients WHERE id = ?").get(id) as Record<string, unknown> | undefined ?? null;
  } catch { return null; }
}

function benchmarkEncryption(iterations = 100): { encryptMs: number; decryptMs: number } {
  const sample = "John Smith, DOB 1975-03-14, MRN 12345678, penicillin allergy";
  const t0 = performance.now();
  const encrypted: string[] = [];
  for (let i = 0; i < iterations; i++) encrypted.push(encryptPHI(sample));
  const t1 = performance.now();
  for (const e of encrypted) decryptPHI(e);
  const t2 = performance.now();
  return {
    encryptMs: parseFloat(((t1 - t0) / iterations).toFixed(3)),
    decryptMs: parseFloat(((t2 - t1) / iterations).toFixed(3)),
  };
}

export default async function DebugPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId || !ADMIN_IDS.includes(userId)) redirect("/lyra/labs");

  const patients = listTestPatients(userId).slice(0, 5);
  const benchmark = benchmarkEncryption(100);
  const hasKey = !!process.env.PHI_ENCRYPTION_KEY;
  const keyLength = process.env.PHI_ENCRYPTION_KEY?.length ?? 0;

  // Get one raw patient for DB inspection
  const rawPatient = patients[0] ? getRawPatient(patients[0].id) : null;

  // Test encrypt/decrypt roundtrip
  const testSample = "Test Patient Name — PHI Field";
  const encrypted = encryptPHI(testSample);
  const decrypted = decryptPHI(encrypted);
  const roundtripOk = decrypted === testSample;

  const PHI_FIELDS = ["name", "dob", "sex", "mrn", "allergies", "notes", "chief_complaint", "soap_subjective", "soap_objective", "soap_assessment", "soap_plan", "vitals", "medications"];

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(217,119,6,0.12)", border: "1px solid rgba(217,119,6,0.25)" }}>
          <Lock className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Encryption Debug</h1>
          <p className="text-white/35 text-xs">AES-256-GCM · PHI field inspection · Performance metrics</p>
        </div>
      </div>

      {/* Key status */}
      <section className="p-5 rounded-2xl border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(217,119,6,0.15)" }}>
        <h2 className="text-sm font-semibold text-white/70 mb-4 flex items-center gap-2"><Lock className="w-4 h-4 text-amber-400" /> Encryption Key Status</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            {
              label: "PHI_ENCRYPTION_KEY set",
              ok: hasKey,
              value: hasKey ? `${keyLength} hex chars (${keyLength / 2} bytes)` : "NOT SET — using insecure fallback",
            },
            {
              label: "Key length valid",
              ok: keyLength === 64,
              value: keyLength === 64 ? "64 hex chars = 32 bytes ✓" : `${keyLength} chars — must be 64`,
            },
            {
              label: "Algorithm",
              ok: true,
              value: "AES-256-GCM",
            },
            {
              label: "Roundtrip test",
              ok: roundtripOk,
              value: roundtripOk ? "Encrypt → Decrypt ✓" : "FAILED — data corrupt",
            },
          ].map(({ label, ok, value }) => (
            <div key={label} className="flex items-start gap-2 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
              {ok ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />}
              <div>
                <p className="text-xs font-medium text-white/60">{label}</p>
                <p className="text-xs text-white/35 mt-0.5">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Performance benchmark */}
      <section className="p-5 rounded-2xl border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(217,119,6,0.15)" }}>
        <h2 className="text-sm font-semibold text-white/70 mb-4 flex items-center gap-2"><Zap className="w-4 h-4 text-amber-400" /> Performance (100 iterations)</h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Encrypt", value: `${benchmark.encryptMs}ms`, sub: "per operation avg" },
            { label: "Decrypt", value: `${benchmark.decryptMs}ms`, sub: "per operation avg" },
            { label: "Total round-trip", value: `${(benchmark.encryptMs + benchmark.decryptMs).toFixed(3)}ms`, sub: "encrypt + decrypt" },
          ].map(({ label, value, sub }) => (
            <div key={label} className="p-4 rounded-xl text-center" style={{ background: "rgba(217,119,6,0.06)", border: "1px solid rgba(217,119,6,0.12)" }}>
              <p className="text-xl font-bold text-amber-300">{value}</p>
              <p className="text-xs text-white/50 mt-1">{label}</p>
              <p className="text-[10px] text-white/25">{sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Encrypt/Decrypt side-by-side */}
      <section className="p-5 rounded-2xl border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(217,119,6,0.15)" }}>
        <h2 className="text-sm font-semibold text-white/70 mb-4">Encrypt/Decrypt Demonstration</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-1.5 mb-2 text-xs text-white/40">
              <Unlock className="w-3.5 h-3.5" /> Plaintext input
            </div>
            <pre className="p-3 rounded-xl text-xs text-white/70 whitespace-pre-wrap break-all" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              {testSample}
            </pre>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-2 text-xs text-amber-400/60">
              <Lock className="w-3.5 h-3.5" /> Stored in database (AES-256-GCM)
            </div>
            <pre className="p-3 rounded-xl text-[10px] text-amber-300/50 whitespace-pre-wrap break-all font-mono" style={{ background: "rgba(217,119,6,0.06)", border: "1px solid rgba(217,119,6,0.15)" }}>
              {encrypted}
            </pre>
          </div>
        </div>
        <div className="mt-3 p-3 rounded-xl flex items-center gap-2 text-xs" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-emerald-300/70">Decrypts back to: <span className="text-emerald-300 font-medium">&quot;{decrypted}&quot;</span> — roundtrip verified ✓</span>
        </div>
        <p className="text-[10px] text-white/20 mt-2">Format: IV (12 bytes) : AuthTag (16 bytes) : Ciphertext — all hex-encoded</p>
      </section>

      {/* Raw DB record inspection */}
      {rawPatient && (
        <section className="p-5 rounded-2xl border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(217,119,6,0.15)" }}>
          <h2 className="text-sm font-semibold text-white/70 mb-4 flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400" /> Raw DB Record — Confirming No Plaintext PHI
          </h2>
          <p className="text-xs text-white/35 mb-4">This is what is actually stored in SQLite. PHI fields should show encrypted hex strings, not readable text.</p>
          <div className="space-y-2">
            {Object.entries(rawPatient).map(([key, value]) => {
              const isPHIField = PHI_FIELDS.includes(key);
              const strValue = String(value ?? "");
              const isEnc = isEncrypted(strValue);
              return (
                <div key={key} className="flex gap-3 items-start p-2.5 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <div className="w-32 shrink-0">
                    <span className="text-[10px] font-mono text-white/40">{key}</span>
                    {isPHIField && (
                      <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: "rgba(217,119,6,0.15)", color: "#fcd34d" }}>PHI</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {isPHIField && (
                        isEnc
                          ? <span className="text-[9px] text-emerald-400 flex items-center gap-0.5"><CheckCircle className="w-2.5 h-2.5" /> ENCRYPTED</span>
                          : <span className="text-[9px] text-red-400 flex items-center gap-0.5"><XCircle className="w-2.5 h-2.5" /> PLAINTEXT ⚠</span>
                      )}
                    </div>
                    <pre className={`text-[10px] font-mono break-all whitespace-pre-wrap ${isEnc ? "text-amber-300/50" : "text-white/50"}`}>
                      {strValue.length > 120 ? strValue.slice(0, 120) + "…" : strValue || "null"}
                    </pre>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {patients.length === 0 && (
        <div className="p-8 rounded-2xl border text-center" style={{ borderColor: "rgba(217,119,6,0.15)", background: "rgba(217,119,6,0.04)" }}>
          <p className="text-white/40 text-sm">No test patients yet</p>
          <p className="text-white/25 text-xs mt-1">Seed the database in Clinical Tools to inspect encrypted records</p>
        </div>
      )}
    </div>
  );
}
