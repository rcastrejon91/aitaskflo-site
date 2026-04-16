"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, UserPlus, RefreshCw, RotateCcw, ChevronRight, FlaskConical, Stethoscope, BookOpen, FileText } from "lucide-react";

interface Patient {
  id: string; name: string; dob?: string; sex?: string; mrn?: string;
  allergies: string[]; notes: string; is_test_data: boolean;
}
interface Encounter {
  id: string; date: string; chief_complaint?: string;
  soap_subjective?: string; soap_objective?: string;
  soap_assessment?: string; soap_plan?: string;
  medications: string[]; icd_codes: string[];
  vitals: Record<string, unknown>;
}
interface PubMedArticle { pmid: string; title: string; authors: string; journal: string; year: string; abstract: string; url: string; }

type Tab = "patients" | "soap" | "research" | "books";

export default function ClinicalLabsPage() {
  const [patients, setPatients]         = useState<Patient[]>([]);
  const [selected, setSelected]         = useState<Patient | null>(null);
  const [encounters, setEncounters]     = useState<Encounter[]>([]);
  const [tab, setTab]                   = useState<Tab>("patients");
  const [loading, setLoading]           = useState(false);
  const [seeding, setSeeding]           = useState(false);
  const [searchQ, setSearchQ]           = useState("");

  // SOAP form
  const [soap, setSoap] = useState({ chief_complaint: "", subjective: "", objective: "", assessment: "", plan: "", medications: "", icd_codes: "" });
  const [soapSaved, setSoapSaved]       = useState(false);
  const [soapSaving, setSoapSaving]     = useState(false);

  // Research
  const [researchQ, setResearchQ]       = useState("");
  const [researchResults, setResearchResults] = useState<PubMedArticle[]>([]);
  const [researchLoading, setResearchLoading] = useState(false);
  const [bookQ, setBookQ]               = useState("");
  const [bookResults, setBookResults]   = useState<Array<{ title: string; authors: string; year: string; source: string; url: string }>>([]);
  const [bookLoading, setBookLoading]   = useState(false);

  const loadPatients = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/labs/clinical?action=list");
    const data = await res.json() as { patients: Patient[] };
    setPatients(data.patients ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadPatients(); }, [loadPatients]);

  async function loadEncounters(patientId: string) {
    const res = await fetch(`/api/labs/clinical?action=encounters&patient_id=${patientId}`);
    const data = await res.json() as { encounters: Encounter[] };
    setEncounters(data.encounters ?? []);
  }

  async function selectPatient(p: Patient) {
    setSelected(p);
    setSoapSaved(false);
    setSoap({ chief_complaint: "", subjective: "", objective: "", assessment: "", plan: "", medications: "", icd_codes: "" });
    await loadEncounters(p.id);
    setTab("patients");
  }

  async function seed() {
    setSeeding(true);
    await fetch("/api/labs/clinical", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "seed" }) });
    await loadPatients();
    setSeeding(false);
  }

  async function reset() {
    if (!confirm("Clear all synthetic test data?")) return;
    setSeeding(true);
    await fetch("/api/labs/clinical", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reset" }) });
    setPatients([]); setSelected(null); setEncounters([]);
    setSeeding(false);
  }

  async function generateOne() {
    setLoading(true);
    const res = await fetch("/api/labs/clinical", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "generate" }) });
    const data = await res.json() as { patient: Patient };
    await loadPatients();
    if (data.patient) selectPatient(data.patient);
    setLoading(false);
  }

  async function saveSOAP() {
    if (!selected) return;
    setSoapSaving(true);
    await fetch("/api/labs/clinical", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save_encounter",
        patient_id: selected.id,
        chief_complaint: soap.chief_complaint,
        subjective: soap.subjective,
        objective: soap.objective,
        assessment: soap.assessment,
        plan: soap.plan,
        medications: soap.medications.split(",").map((s) => s.trim()).filter(Boolean),
        icd_codes: soap.icd_codes.split(",").map((s) => s.trim()).filter(Boolean),
      }),
    });
    await loadEncounters(selected.id);
    setSoapSaved(true);
    setSoapSaving(false);
  }

  async function searchPubMed() {
    if (!researchQ.trim()) return;
    setResearchLoading(true);
    const res = await fetch(`/api/lyra/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: `clinical_research: ${researchQ}`, _tool: "clinical_research", query: researchQ }),
    });
    // Fall back to direct PubMed NCBI endpoint
    try {
      const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(researchQ)}&retmax=5&retmode=json&sort=relevance`;
      const sr = await fetch(url);
      const sd = await sr.json() as { esearchresult: { idlist: string[] } };
      const ids = sd.esearchresult?.idlist ?? [];
      if (ids.length > 0) {
        const sumUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(",")}&retmode=json`;
        const sr2 = await fetch(sumUrl);
        const sd2 = await sr2.json() as { result: Record<string, { title: string; authors: Array<{ name: string }>; source: string; pubdate: string }> };
        const articles = ids.map((id) => {
          const s = sd2.result?.[id];
          return s ? { pmid: id, title: s.title ?? "", authors: (s.authors ?? []).slice(0, 2).map((a) => a.name).join(", "), journal: s.source ?? "", year: (s.pubdate ?? "").slice(0, 4), abstract: "", url: `https://pubmed.ncbi.nlm.nih.gov/${id}/` } : null;
        }).filter(Boolean) as PubMedArticle[];
        setResearchResults(articles);
      } else {
        setResearchResults([]);
      }
    } catch { setResearchResults([]); }
    void res;
    setResearchLoading(false);
  }

  async function searchBooks() {
    if (!bookQ.trim()) return;
    setBookLoading(true);
    try {
      const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(bookQ + " medicine")}&fields=title,author_name,first_publish_year,key&limit=5`;
      const res = await fetch(url);
      const data = await res.json() as { docs: Array<{ title?: string; author_name?: string[]; first_publish_year?: number; key?: string }> };
      setBookResults((data.docs ?? []).slice(0, 5).map((d) => ({
        title: d.title ?? "",
        authors: (d.author_name ?? []).slice(0, 2).join(", "),
        year: String(d.first_publish_year ?? ""),
        source: "Open Library",
        url: `https://openlibrary.org${d.key ?? ""}`,
      })));
    } catch { setBookResults([]); }
    setBookLoading(false);
  }

  const filtered = patients.filter((p) => p.name.toLowerCase().includes(searchQ.toLowerCase()) || (p.mrn ?? "").toLowerCase().includes(searchQ.toLowerCase()));

  return (
    <div className="flex h-[calc(100vh-88px)]" style={{ color: "white" }}>

      {/* ── Sidebar: Patient list ─────────────────────────────────────────── */}
      <aside className="w-72 shrink-0 flex flex-col border-r overflow-hidden" style={{ borderColor: "rgba(217,119,6,0.15)", background: "rgba(255,255,255,0.01)" }}>
        <div className="p-4 border-b space-y-3" style={{ borderColor: "rgba(217,119,6,0.12)" }}>
          <p className="text-xs font-semibold text-amber-400/80 flex items-center gap-1.5"><Stethoscope className="w-3.5 h-3.5" /> Synthetic Patients</p>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" />
            <input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search name or MRN…"
              className="w-full pl-8 pr-3 py-2 rounded-lg text-xs outline-none text-white placeholder-white/25"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
            />
          </div>

          <div className="flex gap-2">
            {patients.length === 0 ? (
              <button onClick={seed} disabled={seeding} className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40" style={{ background: "rgba(217,119,6,0.2)", color: "#fcd34d", border: "1px solid rgba(217,119,6,0.3)" }}>
                {seeding ? "Seeding…" : "🌱 Seed 50 Patients"}
              </button>
            ) : (
              <>
                <button onClick={generateOne} disabled={loading} className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 flex items-center justify-center gap-1" style={{ background: "rgba(217,119,6,0.15)", color: "#fcd34d", border: "1px solid rgba(217,119,6,0.25)" }}>
                  <UserPlus className="w-3 h-3" /> New
                </button>
                <button onClick={loadPatients} disabled={loading} className="py-1.5 px-2.5 rounded-lg text-xs transition-colors disabled:opacity-40" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <RefreshCw className={`w-3 h-3 text-white/40 ${loading ? "animate-spin" : ""}`} />
                </button>
                <button onClick={reset} disabled={seeding} className="py-1.5 px-2.5 rounded-lg text-xs transition-colors disabled:opacity-40" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }} title="Reset test data">
                  <RotateCcw className="w-3 h-3 text-red-400/60" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Patient list */}
        <div className="flex-1 overflow-y-auto">
          {loading && patients.length === 0 ? (
            <div className="p-4 text-center text-xs text-white/25">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-white/25">
              {patients.length === 0 ? "No patients — click Seed to generate test data" : "No matches"}
            </div>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => selectPatient(p)}
                className="w-full text-left px-4 py-3 border-b transition-colors hover:bg-amber-500/5 flex items-center justify-between"
                style={{
                  borderColor: "rgba(255,255,255,0.04)",
                  background: selected?.id === p.id ? "rgba(217,119,6,0.1)" : undefined,
                }}
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white/80 truncate">{p.name}</p>
                  <p className="text-[10px] text-white/35 truncate">{p.mrn} · {p.dob} · {p.sex}</p>
                  {p.allergies.length > 0 && (
                    <p className="text-[10px] text-red-400/60 truncate">⚠ {p.allergies.join(", ")}</p>
                  )}
                </div>
                {selected?.id === p.id && <ChevronRight className="w-3.5 h-3.5 text-amber-400/60 shrink-0" />}
              </button>
            ))
          )}
        </div>

        <div className="p-3 text-center text-[10px]" style={{ color: "rgba(217,119,6,0.4)", borderTop: "1px solid rgba(217,119,6,0.1)" }}>
          {patients.length} synthetic patients
        </div>
      </aside>

      {/* ── Main panel ───────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Tab bar */}
        <div className="flex border-b px-4" style={{ borderColor: "rgba(217,119,6,0.15)" }}>
          {([
            { key: "patients", label: "📋 Patient", icon: null },
            { key: "soap", label: "✍️ SOAP Note", icon: null },
            { key: "research", label: "🔬 PubMed", icon: null },
            { key: "books", label: "📚 Med Books", icon: null },
          ] as { key: Tab; label: string; icon: null }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="px-4 py-3 text-xs font-semibold border-b-2 transition-colors"
              style={{
                borderColor: tab === key ? "#d97706" : "transparent",
                color: tab === key ? "#fcd34d" : "rgba(255,255,255,0.35)",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">

          {/* ── Patient tab ─────────────────────────────────────────────── */}
          {tab === "patients" && (
            selected ? (
              <div className="max-w-2xl space-y-6">
                {/* Patient card */}
                <div className="p-5 rounded-2xl border" style={{ background: "rgba(217,119,6,0.04)", borderColor: "rgba(217,119,6,0.2)" }}>
                  <div className="flex items-start justify-between mb-3">
                    <h2 className="text-lg font-bold text-white">{selected.name}</h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(217,119,6,0.15)", color: "#fcd34d", border: "1px solid rgba(217,119,6,0.3)" }}>SYNTHETIC</span>
                  </div>
                  <div className="grid grid-cols-2 gap-y-2 text-xs">
                    {[
                      ["MRN", selected.mrn],
                      ["DOB", selected.dob],
                      ["Sex", selected.sex],
                      ["Allergies", selected.allergies.length ? selected.allergies.join(", ") : "NKDA"],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <span className="text-white/30">{k}: </span>
                        <span className={`text-white/70 ${k === "Allergies" && selected.allergies.length ? "text-red-300" : ""}`}>{v || "—"}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Encounter history */}
                <div>
                  <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Encounter History ({encounters.length})</h3>
                  {encounters.length === 0 ? (
                    <p className="text-xs text-white/25">No encounters yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {encounters.map((e) => (
                        <div key={e.id} className="p-4 rounded-xl border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-white/80">{e.date} — {e.chief_complaint ?? "No chief complaint"}</p>
                            {e.icd_codes?.length > 0 && (
                              <span className="text-[10px] text-blue-300/60 font-mono">{e.icd_codes.join(", ")}</span>
                            )}
                          </div>
                          {e.soap_assessment && <p className="text-xs text-white/50 mb-1"><span className="text-white/25">A:</span> {e.soap_assessment.slice(0, 150)}…</p>}
                          {e.soap_plan && <p className="text-xs text-white/50"><span className="text-white/25">P:</span> {e.soap_plan.slice(0, 150)}…</p>}
                          {e.medications?.length > 0 && <p className="text-[10px] text-emerald-300/50 mt-1">{e.medications.slice(0, 3).join(" · ")}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <Stethoscope className="w-12 h-12 text-amber-400/20" />
                <p className="text-white/30 text-sm">Select a patient from the left panel</p>
                <p className="text-white/20 text-xs">or generate a new synthetic patient</p>
              </div>
            )
          )}

          {/* ── SOAP Note tab ────────────────────────────────────────────── */}
          {tab === "soap" && (
            <div className="max-w-2xl">
              {!selected ? (
                <p className="text-white/30 text-sm">Select a patient first</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-white/70">SOAP Note — <span className="text-amber-300">{selected.name}</span></h3>
                    {soapSaved && <span className="text-xs text-emerald-400">✓ Saved</span>}
                  </div>

                  {[
                    { key: "chief_complaint", label: "Chief Complaint", rows: 1 },
                    { key: "subjective", label: "S — Subjective (HPI)", rows: 4 },
                    { key: "objective", label: "O — Objective (Exam / Vitals)", rows: 4 },
                    { key: "assessment", label: "A — Assessment (Diagnosis)", rows: 3 },
                    { key: "plan", label: "P — Plan", rows: 4 },
                    { key: "medications", label: "Medications (comma-separated)", rows: 2 },
                    { key: "icd_codes", label: "ICD-10 Codes (comma-separated)", rows: 1 },
                  ].map(({ key, label, rows }) => (
                    <div key={key}>
                      <label className="block text-xs text-white/40 mb-1">{label}</label>
                      <textarea
                        rows={rows}
                        value={soap[key as keyof typeof soap]}
                        onChange={(e) => setSoap((s) => ({ ...s, [key]: e.target.value }))}
                        className="w-full rounded-xl px-3 py-2 text-xs text-white resize-none outline-none"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                      />
                    </div>
                  ))}

                  <button
                    onClick={saveSOAP}
                    disabled={soapSaving || !soap.chief_complaint}
                    className="px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-40 flex items-center gap-2"
                    style={{ background: "#92400e", color: "#fcd34d", border: "1px solid rgba(217,119,6,0.4)" }}
                  >
                    <FileText className="w-4 h-4" />
                    {soapSaving ? "Saving…" : "Save Encounter"}
                  </button>

                  <div className="p-3 rounded-xl text-[10px] text-amber-400/40" style={{ background: "rgba(217,119,6,0.06)", border: "1px solid rgba(217,119,6,0.12)" }}>
                    🧪 This saves encrypted test data to the Labs database. Validates PHI encryption + audit logging.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── PubMed Research tab ──────────────────────────────────────── */}
          {tab === "research" && (
            <div className="max-w-2xl space-y-4">
              <h3 className="text-sm font-semibold text-white/70 flex items-center gap-2"><FlaskConical className="w-4 h-4 text-amber-400" /> PubMed Clinical Research</h3>
              <div className="flex gap-2">
                <input
                  value={researchQ}
                  onChange={(e) => setResearchQ(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchPubMed()}
                  placeholder="e.g. metformin type 2 diabetes HbA1c RCT"
                  className="flex-1 px-3 py-2 rounded-xl text-sm text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
                <button onClick={searchPubMed} disabled={researchLoading} className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40" style={{ background: "#92400e", color: "#fcd34d" }}>
                  {researchLoading ? "…" : "Search"}
                </button>
              </div>

              {researchResults.length > 0 && (
                <div className="space-y-3">
                  {researchResults.map((a) => (
                    <div key={a.pmid} className="p-4 rounded-xl border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
                      <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue-300 hover:text-blue-200 leading-snug block mb-1">{a.title}</a>
                      <p className="text-xs text-white/40">{a.authors} · {a.journal} ({a.year})</p>
                      {a.abstract && <p className="text-xs text-white/35 mt-2 leading-relaxed">{a.abstract.slice(0, 250)}…</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Medical Books tab ────────────────────────────────────────── */}
          {tab === "books" && (
            <div className="max-w-2xl space-y-4">
              <h3 className="text-sm font-semibold text-white/70 flex items-center gap-2"><BookOpen className="w-4 h-4 text-amber-400" /> Medical Book Search</h3>
              <div className="flex gap-2">
                <input
                  value={bookQ}
                  onChange={(e) => setBookQ(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchBooks()}
                  placeholder="e.g. Harrison principles internal medicine sepsis"
                  className="flex-1 px-3 py-2 rounded-xl text-sm text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
                <button onClick={searchBooks} disabled={bookLoading} className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40" style={{ background: "#92400e", color: "#fcd34d" }}>
                  {bookLoading ? "…" : "Search"}
                </button>
              </div>

              {bookResults.length > 0 && (
                <div className="space-y-3">
                  {bookResults.map((b, i) => (
                    <div key={i} className="p-4 rounded-xl border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
                      <a href={b.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue-300 hover:text-blue-200 block mb-1">{b.title}</a>
                      <p className="text-xs text-white/40">{b.authors} ({b.year}) · {b.source}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
