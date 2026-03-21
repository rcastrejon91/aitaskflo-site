export type MemoryType = "personal" | "shared";
export type MemoryImportance = "low" | "medium" | "high" | "critical";

export interface Memory {
  id: string;
  type: MemoryType;
  content: string;
  tags: string[];
  importance: MemoryImportance;
  createdAt: string;
  lastAccessedAt: string;
  accessCount: number;
  agentId: string;
  sourceConversationId?: string;
  userId?: string;
}

export interface Reflection {
  id: string;
  agentId: string;
  conversationId: string;
  conversationSummary: string;
  whatWentWell: string[];
  whatToImprove: string[];
  lessonsLearned: string[];
  score: number; // 1–10
  createdAt: string;
}

export interface Agent {
  id: string;
  version: string;
  name: string;
  systemPrompt: string;
  parentId: string | null;
  childrenIds: string[];
  generation: number;
  createdAt: string;
  createdFromReflectionIds: string[];
  reflectionCount: number;
  conversationCount: number;
  averageScore: number;
  evolutionThreshold: number;
  isActive: boolean;
  evolutionNotes: string;
}

export interface LyraState {
  activeAgentId: string;
  totalConversations: number;
  totalReflections: number;
  totalEvolutions: number;
  createdAt: string;
  lastUpdatedAt: string;
}

export interface LineageNode {
  agent: Agent;
  x: number;
  y: number;
  depth: number;
  childCount: number;
}

export interface LineageEdge {
  fromId: string;
  toId: string;
}

export interface LineageGraph {
  nodes: LineageNode[];
  edges: LineageEdge[];
  width: number;
  height: number;
}
