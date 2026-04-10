/**
 * Lyra Knowledge Base — Document storage + RAG for white-label businesses
 *
 * Documents are chunked into ~500 word segments and stored as JSON.
 * When a question comes in, relevant chunks are retrieved and injected
 * into Lyra's context so she can answer based on the business's own data.
 *
 * Storage: data/kb/{slug}/chunks.json + data/kb/{slug}/meta.json
 */

import fsp from "fs/promises";
import path from "path";

const DATA_DIR = process.env.APP_DIR ?? process.cwd();

// ── Types ────────────────────────────────────────────────────────────────────

export interface KbDocument {
  id: string;
  slug: string;
  filename: string;
  fileType: string;
  uploadedAt: string;
  chunkCount: number;
  charCount: number;
}

export interface KbChunk {
  id: string;
  docId: string;
  slug: string;
  text: string;
  index: number;
}

// ── Storage helpers ───────────────────────────────────────────────────────────

function kbDir(slug: string) {
  return path.join(DATA_DIR, "data", "kb", slug);
}

async function loadChunks(slug: string): Promise<KbChunk[]> {
  try {
    const raw = await fsp.readFile(path.join(kbDir(slug), "chunks.json"), "utf-8");
    return JSON.parse(raw) as KbChunk[];
  } catch {
    return [];
  }
}

async function saveChunks(slug: string, chunks: KbChunk[]): Promise<void> {
  await fsp.mkdir(kbDir(slug), { recursive: true });
  await fsp.writeFile(path.join(kbDir(slug), "chunks.json"), JSON.stringify(chunks), "utf-8");
}

async function loadDocMeta(slug: string): Promise<KbDocument[]> {
  try {
    const raw = await fsp.readFile(path.join(kbDir(slug), "meta.json"), "utf-8");
    return JSON.parse(raw) as KbDocument[];
  } catch {
    return [];
  }
}

async function saveDocMeta(slug: string, docs: KbDocument[]): Promise<void> {
  await fsp.mkdir(kbDir(slug), { recursive: true });
  await fsp.writeFile(path.join(kbDir(slug), "meta.json"), JSON.stringify(docs), "utf-8");
}

// ── Text chunking ─────────────────────────────────────────────────────────────

function chunkText(text: string, chunkSize = 500): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, i + chunkSize).join(" "));
  }
  return chunks.filter(c => c.length > 50);
}

// ── Text extraction ───────────────────────────────────────────────────────────

export function extractText(content: string, fileType: string): string {
  if (fileType === "text/plain" || fileType === "text/csv" || fileType === "text/markdown") {
    return content;
  }

  if (fileType === "application/json") {
    try {
      const obj = JSON.parse(content);
      return JSON.stringify(obj, null, 2);
    } catch {
      return content;
    }
  }

  // For HTML — strip tags
  if (fileType === "text/html") {
    return content
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Default — treat as plain text
  return content;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function ingestDocument(
  slug: string,
  filename: string,
  fileType: string,
  content: string
): Promise<KbDocument> {
  const text = extractText(content, fileType);
  const chunks = chunkText(text);
  const docId = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const newChunks: KbChunk[] = chunks.map((c, i) => ({
    id: `${docId}_${i}`,
    docId,
    slug,
    text: c,
    index: i,
  }));

  // Append chunks
  const existing = await loadChunks(slug);
  await saveChunks(slug, [...existing, ...newChunks]);

  // Save doc meta
  const doc: KbDocument = {
    id: docId,
    slug,
    filename,
    fileType,
    uploadedAt: new Date().toISOString(),
    chunkCount: chunks.length,
    charCount: text.length,
  };

  const existingDocs = await loadDocMeta(slug);
  await saveDocMeta(slug, [...existingDocs, doc]);

  return doc;
}

export async function deleteDocument(slug: string, docId: string): Promise<boolean> {
  const chunks = await loadChunks(slug);
  const filtered = chunks.filter(c => c.docId !== docId);
  await saveChunks(slug, filtered);

  const docs = await loadDocMeta(slug);
  const filteredDocs = docs.filter(d => d.id !== docId);
  await saveDocMeta(slug, filteredDocs);

  return docs.length !== filteredDocs.length;
}

export async function listDocuments(slug: string): Promise<KbDocument[]> {
  return loadDocMeta(slug);
}

export async function clearKnowledgeBase(slug: string): Promise<void> {
  await saveChunks(slug, []);
  await saveDocMeta(slug, []);
}

// ── RAG search ────────────────────────────────────────────────────────────────

function scoreChunk(chunk: KbChunk, query: string): number {
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const chunkLower = chunk.text.toLowerCase();
  let score = 0;

  for (const word of queryWords) {
    // Exact word match
    const regex = new RegExp(`\\b${word}\\b`, "g");
    const matches = chunkLower.match(regex)?.length ?? 0;
    score += matches * 2;

    // Partial match
    if (chunkLower.includes(word)) score += 1;
  }

  // Boost for phrase match
  if (chunkLower.includes(query.toLowerCase().slice(0, 30))) score += 5;

  return score;
}

export async function searchKnowledgeBase(slug: string, query: string, topK = 5): Promise<KbChunk[]> {
  const chunks = await loadChunks(slug);
  if (chunks.length === 0) return [];

  const scored = chunks
    .map(c => ({ chunk: c, score: scoreChunk(c, query) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored.map(x => x.chunk);
}

export async function buildKbContext(slug: string, query: string): Promise<string> {
  const chunks = await searchKnowledgeBase(slug, query, 5);
  if (chunks.length === 0) return "";

  const context = chunks.map((c, i) => `[Source ${i + 1}]\n${c.text}`).join("\n\n");
  return `\n\n---\n**Knowledge Base Context** (from uploaded business documents):\n${context}\n---\n`;
}

export async function getKbStats(slug: string): Promise<{ documents: number; chunks: number; totalChars: number }> {
  const docs = await loadDocMeta(slug);
  const chunks = await loadChunks(slug);
  const totalChars = docs.reduce((sum, d) => sum + d.charCount, 0);
  return { documents: docs.length, chunks: chunks.length, totalChars };
}
