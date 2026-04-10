/**
 * lib/lyra/observeLearnLoop.ts
 * Observe → Plan → Act → Learn
 *
 * Called after every completed multi-step task to:
 * 1. Write a task summary to execution_memory
 * 2. Update skill usage_count / success_rate if a skill was used
 * 3. Detect skill gaps → trigger Skill Factory
 * 4. Return a notification string if a new skill was auto-created
 */

import { saveExecution, saveIdeation } from "./dualMemory";
import { recordSkillUsage, getAllSkillsL1 } from "./skills";
import { createSkillFromRequest, detectSkillGap } from "./skillFactory";

export interface TaskSummary {
  userId: string;
  task: string;
  toolSequence: string[];
  outcome: string;
  success: boolean;
  skillUsed?: string;
  durationMs?: number;
  approaches?: string[];
  decidedNot?: string[];
  reasoning?: string;
}

/**
 * Call this after any multi-step task completes.
 * Returns a notification string if a new skill was auto-created, or null.
 */
export async function observeAndLearn(summary: TaskSummary): Promise<string | null> {
  // 1. Write to execution_memory
  saveExecution({
    user_id: summary.userId,
    task: summary.task,
    tool_sequence: summary.toolSequence,
    outcome: summary.outcome,
    success: summary.success,
    skill_used: summary.skillUsed ?? null,
    duration_ms: summary.durationMs ?? null,
  });

  // 2. Write to ideation_memory if planning context provided
  if (summary.approaches?.length || summary.decidedNot?.length) {
    saveIdeation({
      user_id: summary.userId,
      task: summary.task,
      approaches: summary.approaches ?? [],
      decided_not: summary.decidedNot ?? [],
      reasoning: summary.reasoning ?? "",
    });
  }

  // 3. Update skill stats if a skill was used
  if (summary.skillUsed) {
    const { getSkillByName } = await import("./skills");
    const skill = getSkillByName(summary.skillUsed);
    if (skill) {
      recordSkillUsage(skill.id, summary.success);
    }
  }

  // 4. Detect skill gap and trigger factory
  const activeSkillNames = getAllSkillsL1().map((s) => s.name);
  const hasGap = detectSkillGap(summary.task, activeSkillNames) && summary.toolSequence.length >= 2;

  if (hasGap && summary.success) {
    try {
      const result = await createSkillFromRequest(summary.task, summary.userId);
      if (result.status === "active" && result.skill) {
        return `✨ I just learned a new skill: **${result.skill.name}** — ${result.skill.description}. I'll remember how to do this for next time.`;
      }
    } catch (err) {
      console.error("[ObserveLearn] skill factory error:", err instanceof Error ? err.message : err);
    }
  }

  return null;
}

/**
 * Lightweight version — just logs execution, no gap detection.
 * Use for simple single-tool tasks.
 */
export function logExecution(
  userId: string,
  task: string,
  toolsUsed: string[],
  success: boolean,
  skillUsed?: string
): void {
  saveExecution({
    user_id: userId,
    task,
    tool_sequence: toolsUsed,
    outcome: success ? "completed" : "failed",
    success,
    skill_used: skillUsed ?? null,
    duration_ms: null,
  });

  if (skillUsed) {
    import("./skills").then(({ getSkillByName, recordSkillUsage }) => {
      const skill = getSkillByName(skillUsed);
      if (skill) recordSkillUsage(skill.id, success);
    }).catch(() => { /* ignore */ });
  }
}
