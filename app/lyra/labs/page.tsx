import Link from "next/link";
import { FlaskConical, Stethoscope, Clock, ChevronRight } from "lucide-react";

export default function LabsHomePage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">

      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(217,119,6,0.15)", border: "1px solid rgba(217,119,6,0.3)" }}>
            <FlaskConical className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Lyra Labs</h1>
            <p className="text-amber-400/70 text-sm">Private Sandbox · Experimental Features</p>
          </div>
        </div>
        <p className="text-white/50 text-sm max-w-xl">
          This is an isolated testing environment for experimental Lyra features. All data here is synthetic. Nothing connects to production.
        </p>
      </div>

      {/* Experiment cards */}
      <div className="grid gap-4 sm:grid-cols-2">

        {/* Clinical Tools — Available */}
        <Link href="/lyra/labs/clinical"
          className="group p-5 rounded-2xl border transition-all hover:border-amber-500/40 hover:bg-amber-500/5"
          style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(217,119,6,0.2)" }}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: "rgba(217,119,6,0.12)" }}>
              🏥
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-emerald-300 bg-emerald-900/40 border border-emerald-500/20">
              ACTIVE
            </span>
          </div>
          <h3 className="text-white font-semibold mb-1">Clinical Tools</h3>
          <p className="text-white/40 text-xs mb-4 leading-relaxed">
            EHR patient records, SOAP note documentation, PubMed clinical research, medical book search. 50 synthetic patients pre-loaded.
          </p>
          <div className="flex items-center gap-1.5 text-xs text-amber-400/70 group-hover:text-amber-400 transition-colors">
            Open sandbox <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        {/* Placeholder — Coming Soon */}
        {[
          { icon: "🧬", title: "Drug Interaction Engine", desc: "AI-powered drug-drug interaction checker with clinical severity ratings." },
          { icon: "📊", title: "Clinical Decision Support", desc: "Evidence-based differential diagnosis and treatment recommendation engine." },
          { icon: "🔬", title: "Lab Interpreter", desc: "Automated interpretation of common lab panels with reference range analysis." },
        ].map(({ icon, title, desc }) => (
          <div key={title}
            className="p-5 rounded-2xl border opacity-50"
            style={{ background: "rgba(255,255,255,0.01)", borderColor: "rgba(255,255,255,0.05)" }}>
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: "rgba(255,255,255,0.04)" }}>
                {icon}
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-white/30 bg-white/5">
                <Clock className="w-2.5 h-2.5" /> COMING SOON
              </div>
            </div>
            <h3 className="text-white/60 font-semibold mb-1">{title}</h3>
            <p className="text-white/25 text-xs leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      {/* Info strip */}
      <div className="mt-10 p-4 rounded-xl border text-xs space-y-1" style={{ borderColor: "rgba(217,119,6,0.15)", background: "rgba(217,119,6,0.04)" }}>
        <p className="text-amber-400/70 font-semibold">About this environment</p>
        <p className="text-white/35">All patient data is synthetically generated and encrypted at rest. Zero real PHI. Full HIPAA audit logging is active so you can verify the compliance infrastructure works correctly.</p>
        <p className="text-white/25">Access: Admin only (your account). To add beta testers — invite code system coming soon.</p>
      </div>
    </div>
  );
}
