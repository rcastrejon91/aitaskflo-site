/**
 * Semantic Embeddings (Module A)
 *
 * Uses HuggingFace Inference API (sentence-transformers/all-MiniLM-L6-v2, 384-dim)
 * to generate embeddings for reflections and facts.
 *
 * Stored in lyra_embeddings SQLite table.
 * Used in findRelatedReflections() for semantic memory search.
 */

import { getDb } from "./db";

const HF_MODEL = "sentence-transformers/all-MiniLM-L6-v2";
const HF_URL = `https://api-inference.huggingface.co/models/${HF_MODEL}`;

// ── Generation ────────────────────────────────────────────────────────────────

export async function generateEmbedding(text: string): Promise<number[] | null> {
  const token = process.env.HF_TOKEN;
  if (!token) return null;

  try {
    const res = await fetch(HF_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ inputs: text.slice(0, 512) }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const data = await res.json() as unknown;
    // HF feature-extraction returns [[...]] or [...]
    if (Array.isArray(data) && Array.isArray((data as number[][])[0])) return (data as number[][])[0];
    if (Array.isArray(data)) return data as number[];
    return null;
  } catch {
    return null;
  }
}

// ── Math ──────────────────────────────────────────────────────────────────────

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ── Storage ───────────────────────────────────────────────────────────────────

export function storeEmbedding(
  entityType: string,
  entityId: string,
  content: string,
  embedding: number[]
): void {
  const db = getDb();
  if (!db) return;
  try {
    db.prepare(`
      INSERT OR REPLACE INTO lyra_embeddings (entity_type, entity_id, content, embedding, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(entityType, entityId, content.slice(0, 600), JSON.stringify(embedding), new Date().toISOString());
  } catch { /* ignore */ }
}

interface EmbeddingRow {
  entity_type: string;
  entity_id: string;
  content: string;
  embedding: string;
  created_at: string;
}

export function getEmbeddings(entityType: string): EmbeddingRow[] {
  const db = getDb();
  if (!db) return [];
  try {
    return db.prepare("SELECT * FROM lyra_embeddings WHERE entity_type = ?").all(entityType) as EmbeddingRow[];
  } catch {
    return [];
  }
}

// ── Semantic search ───────────────────────────────────────────────────────────

export interface SemanticMatch {
  entityId: string;
  content: string;
  score: number;
}

export async function semanticSearch(
  query: string,
  entityType: string,
  limit = 3,
  threshold = 0.35
): Promise<SemanticMatch[]> {
  const queryEmbedding = await generateEmbedding(query);
  if (!queryEmbedding) return [];

  const rows = getEmbeddings(entityType);
  if (!rows.length) return [];

  const scored = rows
    .map((row) => {
      try {
        const emb = JSON.parse(row.embedding) as number[];
        return { entityId: row.entity_id, content: row.content, score: cosineSimilarity(queryEmbedding, emb) };
      } catch {
        return null;
      }
    })
    .filter((r): r is SemanticMatch => r !== null && r.score >= threshold);

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

// ── Background embedding for a reflection ────────────────────────────────────

/** Called after a reflection is stored — generates and persists its embedding. */
export async function embedReflection(
  reflectionId: string,
  agentId: string,
  content: string
): Promise<void> {
  const embedding = await generateEmbedding(content);
  if (!embedding) return;
  storeEmbedding("reflection", `${agentId}:${reflectionId}`, content, embedding);
}
