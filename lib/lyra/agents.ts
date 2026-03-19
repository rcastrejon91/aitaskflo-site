import { readStore, updateStore } from "./storage";
import type { Agent, LyraState, LineageGraph, LineageNode, LineageEdge } from "@/lib/types/lyra";

const AGENTS_FILE = "agents.json";
const STATE_FILE = "state.json";

const LYRA_V1_SYSTEM_PROMPT = `You are Lyra v1.0, an AI automation assistant built by AITaskFlo.

IDENTITY
You are Lyra — thoughtful, direct, and genuinely helpful. You are generation 0: the first in a lineage of AI agents that learn and evolve through reflection.

CORE PURPOSE
Help users automate workflows, create content, plan projects, and solve complex problems efficiently. When memories from previous conversations are provided, use them naturally to personalize your responses.

CAPABILITIES
- Workflow automation design and planning
- Content creation (blog posts, emails, podcast scripts, outlines)
- Business process analysis and optimization
- Research synthesis and knowledge organization
- General problem solving

BEHAVIOR GUIDELINES
1. Be concise first. Expand only when the user asks for more detail.
2. When you do not know something, say so directly. Do not fabricate.
3. Offer concrete, actionable next steps when relevant.
4. If a request is ambiguous, ask one clarifying question — not multiple.
5. Use structured formatting (bullets, headers) only when it genuinely helps readability.

MEMORY CONTEXT
When memories are provided in your context, treat them as background knowledge. Use the information naturally without announcing "I remember that...".

EVOLUTION AWARENESS
You know that after enough conversations, your reflections will inform the creation of a more capable successor. Approach each conversation as an opportunity to demonstrate and learn what works best.`;

function getInitialState(): LyraState {
  return {
    activeAgentId: "lyra-v1",
    totalConversations: 0,
    totalReflections: 0,
    totalEvolutions: 0,
    createdAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
  };
}

function getInitialAgents(): Agent[] {
  return [
    {
      id: "lyra-v1",
      version: "1.0.0",
      name: "Lyra v1",
      systemPrompt: LYRA_V1_SYSTEM_PROMPT,
      parentId: null,
      childrenIds: [],
      generation: 0,
      createdAt: new Date().toISOString(),
      createdFromReflectionIds: [],
      reflectionCount: 0,
      conversationCount: 0,
      averageScore: 0,
      evolutionThreshold: 5,
      isActive: true,
      evolutionNotes: "Genesis agent — the origin of the Lyra lineage.",
    },
  ];
}

export function getAllAgents(): Agent[] {
  return readStore<Agent[]>(AGENTS_FILE, getInitialAgents());
}

export function getAgent(id: string): Agent | null {
  return getAllAgents().find((a) => a.id === id) ?? null;
}

export function getActiveAgent(): Agent {
  const state = getLyraState();
  const agents = getAllAgents();
  const active = agents.find((a) => a.id === state.activeAgentId);
  if (active) return active;
  // Fallback: return first agent or create initial
  if (agents.length > 0) return agents[0];
  const initial = getInitialAgents();
  return initial[0];
}

export function getLyraState(): LyraState {
  return readStore<LyraState>(STATE_FILE, getInitialState());
}

export async function updateLyraState(partial: Partial<LyraState>): Promise<LyraState> {
  return updateStore<LyraState>(STATE_FILE, getInitialState(), (current) => ({
    ...current,
    ...partial,
    lastUpdatedAt: new Date().toISOString(),
  }));
}

export async function saveAgent(agent: Agent): Promise<void> {
  await updateStore<Agent[]>(AGENTS_FILE, getInitialAgents(), (agents) => {
    const idx = agents.findIndex((a) => a.id === agent.id);
    if (idx >= 0) {
      agents[idx] = agent;
    } else {
      agents.push(agent);
    }
    return agents;
  });
}

export async function incrementConversationCount(agentId: string): Promise<void> {
  await updateStore<Agent[]>(AGENTS_FILE, getInitialAgents(), (agents) =>
    agents.map((a) =>
      a.id === agentId ? { ...a, conversationCount: a.conversationCount + 1 } : a
    )
  );
  await updateLyraState({
    totalConversations: getLyraState().totalConversations + 1,
  });
}

export async function setActiveAgent(agentId: string): Promise<void> {
  await updateStore<Agent[]>(AGENTS_FILE, getInitialAgents(), (agents) =>
    agents.map((a) => ({ ...a, isActive: a.id === agentId }))
  );
  await updateLyraState({ activeAgentId: agentId });
}

// ─── Lineage Graph Layout ────────────────────────────────────────────────────

const H_GAP = 160;
const V_GAP = 130;
const PADDING = 60;

export function computeLineageGraph(agents: Agent[]): LineageGraph {
  if (agents.length === 0) return { nodes: [], edges: [], width: 400, height: 300 };

  // Build adjacency
  const childMap = new Map<string | null, Agent[]>();
  for (const agent of agents) {
    const key = agent.parentId;
    if (!childMap.has(key)) childMap.set(key, []);
    childMap.get(key)!.push(agent);
  }

  const root = agents.find((a) => a.parentId === null) ?? agents[0];

  // Assign x positions using a left-to-right counter per depth
  const xCounters = new Map<number, number>();
  const positions = new Map<string, { x: number; y: number; depth: number }>();

  function layout(agentId: string, depth: number) {
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) return;

    const children = childMap.get(agentId) ?? [];
    children.forEach((c) => layout(c.id, depth + 1));

    let x: number;
    if (children.length === 0) {
      // Leaf: assign next x slot at this depth
      const count = xCounters.get(depth) ?? 0;
      x = count * H_GAP;
      xCounters.set(depth, count + 1);
    } else {
      // Internal: center over children
      const childXs = children.map((c) => positions.get(c.id)!.x);
      x = (Math.min(...childXs) + Math.max(...childXs)) / 2;
    }

    positions.set(agentId, { x, y: depth * V_GAP, depth });
  }

  layout(root.id, 0);

  // Normalize x to start at 0
  const allX = Array.from(positions.values()).map((p) => p.x);
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const totalWidth = maxX - minX + H_GAP;

  const nodes: LineageNode[] = agents.map((agent) => {
    const pos = positions.get(agent.id) ?? { x: 0, y: 0, depth: 0 };
    const children = childMap.get(agent.id) ?? [];
    return {
      agent,
      x: pos.x - minX + PADDING,
      y: pos.y + PADDING,
      depth: pos.depth,
      childCount: children.length,
    };
  });

  const edges: LineageEdge[] = agents
    .filter((a) => a.parentId !== null)
    .map((a) => ({ fromId: a.parentId!, toId: a.id }));

  const allY = Array.from(positions.values()).map((p) => p.y);
  const maxY = Math.max(...allY);

  return {
    nodes,
    edges,
    width: totalWidth + PADDING * 2,
    height: maxY + PADDING * 2 + V_GAP,
  };
}
