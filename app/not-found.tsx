import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-white" style={{ background: "#080810" }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[140px]" style={{ background: "rgba(109,40,217,0.07)" }} />
      </div>
      <div className="relative text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mx-auto mb-6 shadow-2xl" style={{ boxShadow: "0 8px 32px rgba(109,40,217,0.35)" }}>
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-8xl font-bold mb-4" style={{ background: "linear-gradient(135deg, rgb(167,139,250), rgb(240,171,252))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>404</h1>
        <p className="text-xl font-semibold text-white mb-2">Page not found</p>
        <p className="text-white/40 mb-8 max-w-sm mx-auto">This page does not exist or was moved. Let Lyra help you find what you were looking for.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white" style={{ background: "linear-gradient(135deg, rgb(109,40,217), rgb(134,25,143))", boxShadow: "0 4px 16px rgba(109,40,217,0.3)" }}>
            Go home <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/lyra" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-white/60 hover:text-white transition-colors" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            Open Lyra
          </Link>
        </div>
      </div>
    </div>
  );
}
