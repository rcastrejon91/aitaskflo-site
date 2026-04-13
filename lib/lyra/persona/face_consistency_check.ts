/**
 * Skill 4: face_consistency_check
 * Compare a batch of generated images against the hero embedding.
 * Returns pass/fail + similarity score for each image.
 */

import { computeFaceEmbedding, cosineSimilarity } from "./hero_gen";
import { getPersona, updatePersona } from "@/lib/lyra/db";

export interface ConsistencyResult {
  url: string;
  seed: number;
  similarity: number;
  passed: boolean;
}

export interface FaceConsistencyReport {
  persona_id: string;
  threshold: number;
  results: ConsistencyResult[];
  passed_count: number;
  failed_count: number;
  avg_similarity: number;
}

export async function faceConsistencyCheck(params: {
  persona_id: string;
  candidates: Array<{ url: string; seed: number }>;
  threshold?: number;
  updateAvg?: boolean;
}): Promise<FaceConsistencyReport> {
  const { persona_id, candidates, threshold = 0.82, updateAvg = false } = params;

  const persona = getPersona(persona_id);
  if (!persona) throw new Error(`Persona ${persona_id} not found`);
  if (!persona.hero_embedding) throw new Error(`Persona ${persona_id} has no hero embedding`);

  const heroEmbedding = JSON.parse(persona.hero_embedding) as number[];

  // Compute embeddings for all candidates in parallel
  const results: ConsistencyResult[] = await Promise.all(
    candidates.map(async (c) => {
      const embedding = await computeFaceEmbedding(c.url);
      if (!embedding) {
        return { url: c.url, seed: c.seed, similarity: 0, passed: false };
      }
      const similarity = cosineSimilarity(heroEmbedding, embedding);
      return {
        url: c.url,
        seed: c.seed,
        similarity: Math.round(similarity * 10000) / 10000,
        passed: similarity >= threshold,
      };
    })
  );

  const passed = results.filter((r) => r.passed);
  const failed = results.filter((r) => !r.passed);
  const avgSimilarity =
    results.length > 0
      ? results.reduce((sum, r) => sum + r.similarity, 0) / results.length
      : 0;

  if (updateAvg) {
    updatePersona(persona_id, {
      similarity_avg: Math.round(avgSimilarity * 10000) / 10000,
    });
  }

  return {
    persona_id,
    threshold,
    results,
    passed_count: passed.length,
    failed_count: failed.length,
    avg_similarity: Math.round(avgSimilarity * 10000) / 10000,
  };
}
