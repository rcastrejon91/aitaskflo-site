export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getSearchHistory } from "@/lib/lyra/db";
import { AppShell } from "@/components/lyra/AppShell";

const ADMIN_IDS = ["admin-1", "b9969c91-8bb4-4377-aae5-94e2a8b7f718"];

export default async function SearchesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;
  if (!ADMIN_IDS.includes(userId)) redirect("/lyra");

  const searches = getSearchHistory(500);

  return (
    <AppShell>
      <div className="min-h-screen bg-[#0a0a0f] text-white">
        <div className="border-b border-white/8 px-6 py-3 flex items-center gap-3">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center font-black text-black text-xs">S</div>
          <span className="font-bold text-white text-sm">Search History</span>
          <span className="ml-auto text-white/30 text-xs">{searches.length} queries logged</span>
        </div>

        <div className="p-6 max-w-4xl mx-auto">
          {searches.length === 0 ? (
            <div className="text-center py-20 text-white/20 text-sm">
              No searches yet. Go try some in Lyra.
            </div>
          ) : (
            <div className="space-y-2">
              {searches.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between bg-white/3 border border-white/8 rounded-xl px-4 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{s.query}</p>
                    <p className="text-white/30 text-xs mt-0.5">
                      {s.user_id ?? "anonymous"} · {new Date(s.searched_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="ml-4 text-teal-400 text-xs font-mono shrink-0">
                    {s.results} results
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
