export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Dashboard } from "@/components/lyra/Dashboard";
import { getLyraState, getActiveAgent, getAllAgents, computeLineageGraph } from "@/lib/lyra/agents";
import { getAllMemories } from "@/lib/lyra/memories";
import { getAllReflections } from "@/lib/lyra/reflections";

export default async function LyraPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;

  const agents = getAllAgents();
  const state = getLyraState();
  const activeAgent = getActiveAgent();
  const lineage = computeLineageGraph(agents);
  const memories = getAllMemories(userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 50);
  const reflections = getAllReflections().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const stats = {
    totalAgents: agents.length,
    totalMemories: memories.length,
    totalReflections: reflections.length,
    generations: agents.length > 0 ? Math.max(...agents.map((a) => a.generation)) : 0,
  };

  return (
    <Dashboard
      initial={{ state, activeAgent, agents, lineage, memories, reflections, stats }}
      userId={userId}
    />
  );
}
