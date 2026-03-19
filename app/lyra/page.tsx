import { getAllAgents, getLyraState, getActiveAgent, computeLineageGraph } from "@/lib/lyra/agents";
import { getAllMemories } from "@/lib/lyra/memories";
import { getAllReflections } from "@/lib/lyra/reflections";
import { Dashboard } from "@/components/lyra/Dashboard";

export const dynamic = "force-dynamic";

export default function LyraPage() {
  const state = getLyraState();
  const activeAgent = getActiveAgent();
  const agents = getAllAgents();
  const lineage = computeLineageGraph(agents);
  const memories = getAllMemories()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 50);
  const reflections = getAllReflections()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const stats = {
    totalAgents: agents.length,
    totalMemories: memories.length,
    totalReflections: reflections.length,
    generations: Math.max(...agents.map((a) => a.generation), 0),
  };

  return (
    <Dashboard
      initial={{ state, activeAgent, agents, lineage, memories, reflections, stats }}
    />
  );
}
