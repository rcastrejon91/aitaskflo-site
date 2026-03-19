import { randomUUID } from "crypto";
import { readStore, updateStore } from "./storage";
import type { Memory, MemoryType, MemoryImportance } from "@/lib/types/lyra";

const MEMORIES_FILE = "memories.json";
const MAX_MEMORIES = 200;

const IMPORTANCE_WEIGHT: Record<MemoryImportance, number> = {
  critical: 1.0,
  high: 0.75,
  medium: 0.5,
  low: 0.25,
};

export function getAllMemories(): Memory[] {
  return readStore<Memory[]>(MEMORIES_FILE, []);
}

export async function storeMemory(
  memory: Omit<Memory, "id" | "createdAt" | "lastAccessedAt" | "accessCount">
): Promise<Memory> {
  const now = new Date().toISOString();
  const newMemory: Memory = {
    ...memory,
    id: randomUUID(),
    createdAt: now,
    lastAccessedAt: now,
    accessCount: 0,
  };

  await updateStore<Memory[]>(MEMORIES_FILE, [], (memories) => {
    memories.push(newMemory);
    // Trim if over limit: drop lowest-scored entries
    if (memories.length > MAX_MEMORIES) {
      memories.sort((a, b) => scoreMemory(b) - scoreMemory(a));
      memories = memories.slice(0, MAX_MEMORIES);
    }
    return memories;
  });

  return newMemory;
}

function scoreMemory(m: Memory): number {
  const recencyMs = Date.now() - new Date(m.lastAccessedAt).getTime();
  const recencyDays = recencyMs / (1000 * 60 * 60 * 24);
  const recencyScore = Math.max(0, 1 - recencyDays / 30); // decays over 30 days
  return IMPORTANCE_WEIGHT[m.importance] * 0.5 + recencyScore * 0.3 + Math.min(m.accessCount / 10, 1) * 0.2;
}

function tagOverlap(tags: string[], queryTokens: string[]): number {
  if (tags.length === 0 || queryTokens.length === 0) return 0;
  const tagSet = new Set(tags.map((t) => t.toLowerCase()));
  const matches = queryTokens.filter((t) => tagSet.has(t) || tags.some((tag) => tag.toLowerCase().includes(t)));
  return matches.length / queryTokens.length;
}

function contentOverlap(content: string, queryTokens: string[]): number {
  if (queryTokens.length === 0) return 0;
  const lower = content.toLowerCase();
  const matches = queryTokens.filter((t) => lower.includes(t));
  return matches.length / queryTokens.length;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2)
    .filter((t) => !STOP_WORDS.has(t));
}

const STOP_WORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "can", "has",
  "was", "his", "her", "they", "she", "him", "that", "this", "with",
  "have", "from", "will", "one", "would", "about", "been", "what",
]);

export async function getRelevantMemories(
  query: string,
  limit = 5,
  type?: MemoryType
): Promise<Memory[]> {
  const memories = getAllMemories();
  const queryTokens = tokenize(query);

  let candidates = type ? memories.filter((m) => m.type === type) : memories;

  const scored = candidates.map((m) => {
    const tagScore = tagOverlap(m.tags, queryTokens);
    const contentScore = contentOverlap(m.content, queryTokens);
    const importanceScore = IMPORTANCE_WEIGHT[m.importance];
    const recencyMs = Date.now() - new Date(m.lastAccessedAt).getTime();
    const recencyScore = Math.max(0, 1 - recencyMs / (1000 * 60 * 60 * 24 * 30));
    const relevance = tagScore * 0.4 + contentScore * 0.3 + importanceScore * 0.2 + recencyScore * 0.1;
    return { memory: m, relevance };
  });

  const top = scored
    .filter((s) => s.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit)
    .map((s) => s.memory);

  // Update access metadata for retrieved memories
  const topIds = new Set(top.map((m) => m.id));
  if (topIds.size > 0) {
    const now = new Date().toISOString();
    await updateStore<Memory[]>(MEMORIES_FILE, [], (mems) =>
      mems.map((m) =>
        topIds.has(m.id)
          ? { ...m, accessCount: m.accessCount + 1, lastAccessedAt: now }
          : m
      )
    );
  }

  return top;
}

export function formatMemoriesForPrompt(memories: Memory[]): string {
  if (memories.length === 0) return "";
  const lines = memories.map((m) => `- [${m.importance}] ${m.content}`);
  return `\n\nRELEVANT MEMORIES FROM PREVIOUS CONVERSATIONS:\n${lines.join("\n")}\n`;
}
