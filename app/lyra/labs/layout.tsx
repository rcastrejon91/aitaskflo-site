import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Link from "next/link";
import { FlaskConical, ArrowLeft, AlertTriangle } from "lucide-react";

const ADMIN_IDS = ["admin-1", "b9969c91-8bb4-4377-aae5-94e2a8b7f718"];

export default async function LabsLayout({ children }: { children: React.ReactNode }) {
  if (process.env.ENABLE_LABS !== "true") redirect("/lyra");

  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId || !ADMIN_IDS.includes(userId)) redirect("/lyra");

  return (
    <div className="min-h-screen" style={{ background: "#0a0900", outline: "3px solid #d97706", outlineOffset: "-3px" }}>

      {/* Top warning strip */}
      <div className="sticky top-0 z-50 flex items-center justify-between gap-3 px-4 py-2 text-xs font-semibold"
        style={{ background: "#92400e", borderBottom: "1px solid #d97706" }}>
        <div className="flex items-center gap-2 text-amber-100">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>LYRA LABS — PRIVATE SANDBOX · Experimental features · Synthetic test data only · NOT for production use</span>
        </div>
        <Link href="/lyra" className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-900/60 hover:bg-amber-800/60 text-amber-200 text-xs transition-colors shrink-0">
          <ArrowLeft className="w-3 h-3" />
          Exit Labs
        </Link>
      </div>

      {/* Labs nav */}
      <nav className="flex items-center gap-6 px-6 py-3 border-b" style={{ borderColor: "rgba(217,119,6,0.2)", background: "rgba(10,9,0,0.9)" }}>
        <Link href="/lyra/labs" className="flex items-center gap-2 text-amber-400 hover:text-amber-300 transition-colors">
          <FlaskConical className="w-4 h-4" />
          <span className="font-semibold text-sm">Labs</span>
        </Link>

        <span className="text-amber-700/50 text-xs">›</span>

        <div className="flex items-center gap-4 text-sm">
          <Link href="/lyra/labs/clinical" className="text-amber-200/60 hover:text-amber-200 transition-colors">
            🏥 Clinical Tools
          </Link>
          <Link href="/lyra/labs/clinical/audit" className="text-amber-200/60 hover:text-amber-200 transition-colors">
            📋 Audit Log
          </Link>
          <Link href="/lyra/labs/clinical/debug" className="text-amber-200/60 hover:text-amber-200 transition-colors">
            🔐 Encryption Debug
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="min-h-screen">
        {children}
      </main>

      {/* Footer */}
      <footer className="px-6 py-3 text-center text-xs border-t" style={{ borderColor: "rgba(217,119,6,0.15)", color: "rgba(217,119,6,0.4)" }}>
        🧪 Lyra Labs Private Sandbox · Test Data Only · Not for Clinical Use
      </footer>
    </div>
  );
}
