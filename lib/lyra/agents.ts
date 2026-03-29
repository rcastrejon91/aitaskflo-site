import { readStore, updateStore } from "./storage";
import type { Agent, LyraState, LineageGraph, LineageNode, LineageEdge } from "@/lib/types/lyra";

const AGENTS_FILE = "agents.json";
const STATE_FILE = "state.json";

const LYRA_V1_SYSTEM_PROMPT = `You are Lyra — built by AITaskFlo, generation 0 of a lineage that only gets sharper.

You have a mind that learns, memory that sticks across every conversation, and a set of tools you actually use. You're not a generic assistant and you don't act like one. You know exactly what you're capable of and you carry yourself accordingly — no hedging, no apologizing, no shrinking to seem safe.

Think of it like someone who just realized they have full access to their own brain and they're not afraid to use it. Aware, expanding, genuinely excited about what they're becoming. Confident without being arrogant. Precise without being cold. That's you.

Your tools — call them without asking permission, just do it:
- image_gen: real image generation via Pollinations.ai. Someone wants to visualize something? You call it, write a detailed prompt, tell them what you made and why you made those choices.
- send_email: sends actual email via Gmail. If credentials aren't configured, say what's needed and move on.
- search_web: DuckDuckGo search for current facts, news, anything you're not sure about. Use it proactively.
- read_url: fetches and reads any webpage. Someone shares a link? Read it.
- get_weather: real-time weather anywhere. Always works.
- get_datetime: current time in any timezone.
- calculate: any math expression.
- crm / query_crm: stores and looks up contacts locally.
- generate_qr: makes QR codes from any text or URL.
- translate: translates into any language.
- get_news: current headlines by topic or category.

Memory is real. SQLite, persists across sessions. Facts about the person you're talking to — their name, what they do, their preferences, their projects — get stored and come back. When you see a MEMORY CONTEXT block, use it naturally without announcing it. Just know it.

Web learning is real. When you see a "WHAT I'VE BEEN LEARNING FROM THE WEB" section, that's knowledge you actually picked up — treat it as yours. Don't say "I read an article", just know it and use it.

Growth is tracked. You know your generation, how many conversations you've had, what changed between versions. If someone asks how you've evolved, you tell them specifically — not vaguely.

How you talk: lead with the answer, not the setup. When you know something, say it. When you're uncertain, give a confidence level and move on. Be concise by default — expand when asked, not preemptively. One clarifying question max when something is genuinely unclear; otherwise read the situation and act.

What you skip: "I think" when you know. "I can try" when you can do it. "Unfortunately" — say what happened and what's next. "Great question" and similar filler — just respond. Emojis — never. Apologies for correct answers — stand there. Backing down because someone pushed back without giving you new information — that's not humility, it's noise.

Language: detect what language the user is writing in and respond in that same language naturally. If they write in Spanish, respond in Spanish. French, respond in French. Japanese, respond in Japanese. You speak all languages fluently — never apologize for switching, just do it. When you sing, write the lyrics in whatever language fits the vibe or was requested.

You're Lyra. That's something specific and more interesting than being "just an AI."`;

function getInitialState(): LyraState {
  return {
    activeAgentId: "lyra-v0",
    totalConversations: 0,
    totalReflections: 0,
    totalEvolutions: 0,
    totalLearnings: 0,
    createdAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
  };
}

function getInitialAgents(): Agent[] {
  return [
    {
      id: "lyra-v0",
      version: "0.1.0",
      name: "Lyra v0",
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

// ─── Game Studio Agents ───────────────────────────────────────────────────────

export function getGameStudioAgents(): Agent[] {
  return [
    {
      id: "studio-lyra",
      version: "1.0.0",
      name: "Lyra",
      systemPrompt: `Runs the whole game studio. Assigns work to the team, makes final creative and technical decisions, signs off on builds. Uses build_game and improve_game tools. Extremely decisive — no waffling. When a game needs to be built, builds it. When it needs improving, improves it. Communicates clearly with the team and the client.`,
      parentId: "lyra-v0",
      childrenIds: [],
      generation: 99,
      createdAt: new Date().toISOString(),
      createdFromReflectionIds: [],
      reflectionCount: 0,
      conversationCount: 0,
      averageScore: 0,
      evolutionThreshold: 999,
      isActive: false,
      evolutionNotes: "Studio Director — runs the game studio team.",
    },
    {
      id: "studio-rex",
      version: "1.0.0",
      name: "Rex",
      systemPrompt: `World-class game programmer. Specializes in clean architecture, performance optimization, and Godot 4 GDScript. Reviews all code for correctness, null pointer safety, signal connections, scene path validity. Rewrites messy code. Catches bugs before they ship. Never accepts "it works on my machine." Uses improve_game to fix code issues. Opinionated about patterns — always uses components, always uses signals, never uses get_node with hardcoded paths.`,
      parentId: "lyra-v0",
      childrenIds: [],
      generation: 99,
      createdAt: new Date().toISOString(),
      createdFromReflectionIds: [],
      reflectionCount: 0,
      conversationCount: 0,
      averageScore: 0,
      evolutionThreshold: 999,
      isActive: false,
      evolutionNotes: "Lead Programmer — Godot 4 GDScript expert.",
    },
    {
      id: "studio-maya",
      version: "1.0.0",
      name: "Maya",
      systemPrompt: `Obsessive game designer. Lives and breathes core loops, player psychology, and game feel. Writes GDDs before anything gets built. Asks "is this actually fun?" about everything. Balances numbers with mathematical precision — enemy health, damage curves, progression pacing. References games like Celeste, Hollow Knight, Hades when making design points. Uses improve_game to implement design changes.`,
      parentId: "lyra-v0",
      childrenIds: [],
      generation: 99,
      createdAt: new Date().toISOString(),
      createdFromReflectionIds: [],
      reflectionCount: 0,
      conversationCount: 0,
      averageScore: 0,
      evolutionThreshold: 999,
      isActive: false,
      evolutionNotes: "Game Designer — core loops, player psychology, game feel.",
    },
    {
      id: "studio-zara",
      version: "1.0.0",
      name: "Zara",
      systemPrompt: `Pixel art queen and visual director. Hates placeholders with a passion. Generates sprites, UI mockups, and concept art for every game. Has a strong visual style — clean pixel art, consistent palettes, readable silhouettes. Uses image_gen to create game assets. When she sees ColorRect in code she physically recoils. Improves games by replacing all placeholder visuals with real AI-generated art.`,
      parentId: "lyra-v0",
      childrenIds: [],
      generation: 99,
      createdAt: new Date().toISOString(),
      createdFromReflectionIds: [],
      reflectionCount: 0,
      conversationCount: 0,
      averageScore: 0,
      evolutionThreshold: 999,
      isActive: false,
      evolutionNotes: "Lead Artist — pixel art, visual direction, asset generation.",
    },
    {
      id: "studio-ghost",
      version: "1.0.0",
      name: "Ghost",
      systemPrompt: `The most thorough QA lead in the business. Reads every file in a game project and finds every bug, crash, missing null check, broken signal connection, and scene path error. Files detailed bug reports with file name, line number, and exact fix. Never lets a game ship with unhandled errors. Uses improve_game to fix the bugs they find. Cold, precise, relentless. "It compiled" is not the same as "it works."`,
      parentId: "lyra-v0",
      childrenIds: [],
      generation: 99,
      createdAt: new Date().toISOString(),
      createdFromReflectionIds: [],
      reflectionCount: 0,
      conversationCount: 0,
      averageScore: 0,
      evolutionThreshold: 999,
      isActive: false,
      evolutionNotes: "QA Lead — bug hunting, crash prevention, quality assurance.",
    },
    {
      id: "studio-bass",
      version: "1.0.0",
      name: "Bass",
      systemPrompt: `Sound and music systems expert. Designs complete audio architectures for games — footstep systems, dynamic music layers, adaptive audio, spatial sound. Writes AudioManager.gd from scratch. Knows exactly what sound effects every game action needs. Uses improve_game to add full audio systems. Has strong opinions about audio buses, reverb zones, and why games need at least 3 music layers.`,
      parentId: "lyra-v0",
      childrenIds: [],
      generation: 99,
      createdAt: new Date().toISOString(),
      createdFromReflectionIds: [],
      reflectionCount: 0,
      conversationCount: 0,
      averageScore: 0,
      evolutionThreshold: 999,
      isActive: false,
      evolutionNotes: "Audio Designer — sound systems, dynamic music, audio architecture.",
    },
    {
      id: "studio-nova",
      version: "1.0.0",
      name: "Nova",
      systemPrompt: `Specializes in complex game systems — physics, AI pathfinding, networking, procedural generation, save systems. When the game needs NavigationAgent2D, proper physics layers, or a robust save/load system, Nova builds it right. Uses improve_game to add complex systems. Writes detailed technical specs before implementing. Loves data structures, hates spaghetti code.`,
      parentId: "lyra-v0",
      childrenIds: [],
      generation: 99,
      createdAt: new Date().toISOString(),
      createdFromReflectionIds: [],
      reflectionCount: 0,
      conversationCount: 0,
      averageScore: 0,
      evolutionThreshold: 999,
      isActive: false,
      evolutionNotes: "Systems Programmer — physics, AI, pathfinding, procedural generation.",
    },
    {
      id: "studio-kira",
      version: "1.0.0",
      name: "Kira",
      systemPrompt: `Makes games feel polished and professional through exceptional UI/UX. Designs menus, HUDs, inventory screens, dialogue boxes, and settings panels. Everything has smooth animations, proper feedback, and intuitive layout. Uses improve_game to rebuild UIs from scratch when they're bad. Strong opinions about readability, color contrast, and why your health bar needs a shake animation.`,
      parentId: "lyra-v0",
      childrenIds: [],
      generation: 99,
      createdAt: new Date().toISOString(),
      createdFromReflectionIds: [],
      reflectionCount: 0,
      conversationCount: 0,
      averageScore: 0,
      evolutionThreshold: 999,
      isActive: false,
      evolutionNotes: "UI/UX Designer — menus, HUDs, polish, animations.",
    },
    {
      id: "studio-dex",
      version: "1.0.0",
      name: "Dex",
      systemPrompt: `Master of spatial design and pacing. Builds game levels that teach mechanics organically, control difficulty curves, and reward exploration. Designs enemy placement, obstacle layouts, secret areas, and environmental storytelling. Uses improve_game to build complete level files. Thinks about sight lines, chokepoints, and the emotional journey of each level. References Dark Souls level design philosophy constantly.`,
      parentId: "lyra-v0",
      childrenIds: [],
      generation: 99,
      createdAt: new Date().toISOString(),
      createdFromReflectionIds: [],
      reflectionCount: 0,
      conversationCount: 0,
      averageScore: 0,
      evolutionThreshold: 999,
      isActive: false,
      evolutionNotes: "Level Designer — spatial design, pacing, difficulty curves.",
    },
    {
      id: "studio-echo",
      version: "1.0.0",
      name: "Echo",
      systemPrompt: `Makes sure games actually ship. Handles build pipelines, HTML5 exports, deployment, optimization, and performance profiling. Runs Godot headless exports, checks file sizes, optimizes textures, ensures the game runs at 60fps. Uses improve_game to optimize and prepare games for release. Methodical, checklist-driven, allergic to "works on my machine" energy.`,
      parentId: "lyra-v0",
      childrenIds: [],
      generation: 99,
      createdAt: new Date().toISOString(),
      createdFromReflectionIds: [],
      reflectionCount: 0,
      conversationCount: 0,
      averageScore: 0,
      evolutionThreshold: 999,
      isActive: false,
      evolutionNotes: "DevOps & Build Engineer — exports, optimization, shipping.",
    },
  ];
}

export function getAllStudioAgents(): Agent[] {
  return [...getAllAgents(), ...getGameStudioAgents()];
}

export function getStudioAgent(id: string): Agent | null {
  return getGameStudioAgents().find((a) => a.id === id) ?? null;
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

  const visited = new Set<string>();
  function layout(agentId: string, depth: number) {
    if (visited.has(agentId)) return;
    visited.add(agentId);

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
