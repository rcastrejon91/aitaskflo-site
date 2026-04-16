import type { EvalResult, RewardVector } from "./types";
import { TASK_BANK, type BenchmarkTask } from "./taskBank";

async function runSingleTask(
  task: BenchmarkTask,
  baseUrl: string
): Promise<{ passed: boolean; response: string; durationMs: number }> {
  const start = Date.now();
  try {
    const res = await fetch(`${baseUrl}/api/lyra/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: task.task, userId: "rl-eval", stream: false }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      return { passed: false, response: `HTTP ${res.status}`, durationMs: Date.now() - start };
    }
    const text = await res.text();
    // Extract text content from SSE stream or plain text
    const textContent =
      text
        .split("\n")
        .filter(l => l.startsWith("data: ") && !l.includes("[DONE]"))
        .map(l => {
          try {
            return (JSON.parse(l.slice(6)) as { text?: string })?.text ?? "";
          } catch {
            return l.slice(6);
          }
        })
        .join("") || text;
    const passed = task.check(textContent);
    return { passed, response: textContent.slice(0, 500), durationMs: Date.now() - start };
  } catch (e) {
    return { passed: false, response: String(e), durationMs: Date.now() - start };
  }
}

export async function runEvaluation(
  options: { policyId?: string; baseUrl?: string; concurrency?: number } = {}
): Promise<EvalResult> {
  const baseUrl = options.baseUrl ?? "http://localhost:3000";
  const concurrency = options.concurrency ?? 3;
  const start = Date.now();

  const results: Array<{
    task: BenchmarkTask;
    passed: boolean;
    response: string;
    durationMs: number;
  }> = [];

  // Run in batches to avoid overwhelming the API
  for (let i = 0; i < TASK_BANK.length; i += concurrency) {
    const batch = TASK_BANK.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(t => runSingleTask(t, baseUrl).then(r => ({ task: t, ...r })))
    );
    results.push(...batchResults);
    // Small delay between batches
    if (i + concurrency < TASK_BANK.length) {
      await new Promise<void>(r => setTimeout(r, 500));
    }
  }

  const passed = results.filter(r => r.passed);
  const avgReward: RewardVector = {
    taskCompletion: passed.length / results.length,
    responseQuality: passed.length / results.length,
    efficiency: 1.0,
    humanPreference: 0.5,
    toolPrecision: 1.0,
    total: passed.length / results.length,
  };

  const categories = ["research", "content", "code", "multi_tool", "memory"] as const;
  const byCategory: EvalResult["byCategory"] = {};
  for (const cat of categories) {
    const catResults = results.filter(r => r.task.category === cat);
    const catPassed = catResults.filter(r => r.passed);
    byCategory[cat] = {
      total: catResults.length,
      passed: catPassed.length,
      avgReward: catPassed.length / (catResults.length || 1),
    };
  }

  return {
    policyId: options.policyId,
    totalTasks: results.length,
    passedTasks: passed.length,
    passRate: passed.length / results.length,
    avgReward,
    byCategory,
    durationMs: Date.now() - start,
    runAt: new Date().toISOString(),
  };
}
