"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  ArrowLeft, Settings, LogOut,
  MessageSquare, GraduationCap, Truck, Gamepad2, Play, BookOpen,
  Briefcase, Building2, Users, TrendingUp, Rss, FlaskConical, Sparkles,
} from "lucide-react";

const NAV_TABS = [
  { href: "/lyra",      icon: MessageSquare, label: "Chat"      },
  { href: "/learn",     icon: GraduationCap, label: "Learn"     },
  { href: "/trucker",   icon: Truck,         label: "Trucker"   },
  { href: "/games",     icon: Gamepad2,      label: "Games"     },
  { href: "/play",      icon: Play,          label: "Play"      },
  { href: "/book",      icon: BookOpen,      label: "Book"      },
  { href: "/biz",       icon: Briefcase,     label: "Biz"       },
  { href: "/agency",    icon: Building2,     label: "Agency"    },
  { href: "/careers",   icon: Users,         label: "Careers"   },
  { href: "/investors", icon: TrendingUp,    label: "Investors" },
  { href: "/feed",      icon: Rss,           label: "Feed"      },
  { href: "/demo",      icon: FlaskConical,  label: "Demo"      },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col text-white" style={{ minHeight: "100dvh", background: "#09090f" }}>

      {/* Top bar */}
      <header className="flex items-center gap-3 px-4 h-12 flex-shrink-0 sticky top-0 z-40"
        style={{ background: "rgba(0,0,0,0.7)", borderBottom: "1px solid rgba(255,255,255,0.05)", backdropFilter: "blur(12px)" }}>
        <Link href="/" className="transition-colors" style={{ color: "rgba(255,255,255,0.2)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.2)")}
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>

        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgb(109,40,217), rgb(134,25,143))" }}>
            <Sparkles className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>AITaskFlo</span>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <Link href="/account" className="p-1.5 transition-colors" style={{ color: "rgba(255,255,255,0.2)" }}
            title="Account settings"
            onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.6)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.2)")}
          >
            <Settings className="w-3.5 h-3.5" />
          </Link>
          <button onClick={() => signOut({ callbackUrl: "/login" })}
            className="p-1.5 transition-colors" style={{ color: "rgba(255,255,255,0.2)" }}
            title="Sign out"
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.2)")}
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Tab bar with fade hint */}
      <div className="relative flex-shrink-0 sticky top-12 z-40" style={{ background: "rgba(0,0,0,0.5)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <nav className="flex overflow-x-auto scrollbar-none">
          {NAV_TABS.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link key={href} href={href}
                className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-all relative flex-shrink-0"
                style={{ color: active ? "rgb(20,184,166)" : "rgba(255,255,255,0.3)" }}
                onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.6)"; }}
                onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.3)"; }}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                {active && <span className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: "rgb(20,184,166)" }} />}
              </Link>
            );
          })}
        </nav>
        {/* Right fade — signals more tabs exist */}
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12"
          style={{ background: "linear-gradient(to left, rgba(0,0,0,0.7), transparent)" }} />
      </div>

      {/* Page content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
