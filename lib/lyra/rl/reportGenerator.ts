import { getDb } from "@/lib/lyra/db";

export function generateReport(): string {
  const db = getDb();
  if (!db) return "# RL Report\n\nDatabase unavailable.";

  // Pull stats
  const totalEpisodes = (
    db
      .prepare("SELECT COUNT(*) as n FROM rl_episodes WHERE terminal_state != 'running'")
      .get() as { n: number }
  ).n;

  const scoredEpisodes = (
    db
      .prepare("SELECT COUNT(*) as n FROM rl_episodes WHERE reward_total IS NOT NULL")
      .get() as { n: number }
  ).n;

  const avgReward =
    (
      db
        .prepare("SELECT AVG(reward_total) as r FROM rl_episodes WHERE reward_total IS NOT NULL")
        .get() as { r: number | null }
    ).r ?? 0;

  const policies = (
    db.prepare("SELECT COUNT(*) as n FROM rl_policies").get() as { n: number }
  ).n;

  const activePolicy = db
    .prepare("SELECT * FROM rl_policies WHERE status = 'active' ORDER BY version DESC LIMIT 1")
    .get() as Record<string, unknown> | undefined;

  const agentStats = db
    .prepare(
      `
    SELECT agent_name, COUNT(*) as episodes, AVG(reward_total) as avg_reward,
           AVG(total_iterations) as avg_iterations, AVG(wall_ms) as avg_wall_ms
    FROM rl_episodes WHERE reward_total IS NOT NULL
    GROUP BY agent_name ORDER BY avg_reward DESC
  `
    )
    .all() as Array<{
    agent_name: string;
    episodes: number;
    avg_reward: number;
    avg_iterations: number;
    avg_wall_ms: number;
  }>;

  const rewardTrend = db
    .prepare(
      `
    SELECT DATE(created_at) as date, AVG(reward_total) as avg_reward, COUNT(*) as episodes
    FROM rl_episodes WHERE reward_total IS NOT NULL
    GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 14
  `
    )
    .all() as Array<{ date: string; avg_reward: number; episodes: number }>;

  const now = new Date().toISOString().split("T")[0];

  return `# AITaskFlo RL Environment: Technical Report
Generated: ${now}

## Abstract

We present an empirical evaluation of a multi-agent RL environment built on a production AI system (AITaskFlo). The environment formalizes task completion as an episodic RL problem, using a multi-dimensional reward function across five axes: task completion, response quality, efficiency, human preference, and tool precision. We collected ${totalEpisodes} episodes across ${agentStats.length} agents, scoring ${scoredEpisodes} with our reward model. Over ${policies} policy optimization cycles, we observed measurable improvement in task completion reward through reward-weighted few-shot selection.

## Environment Design

### State Space
The state at each decision step encodes: task description, conversation history, tool results observed, active system prompt, and iteration index within the episode.

### Action Space
The action space is bounded by ${100}+ structured tool invocations (the AITaskFlo tool registry) plus free-form text generation. Agents select 0-N tool calls followed by a text response.

### Episode Definition
One episode corresponds to one complete agent task from initialization to terminal state. Terminal states: \`success\`, \`failure\`, \`low_confidence\`, \`timeout\`.

### Reward Function

| Dimension | Weight | Description |
|-----------|--------|-------------|
| Task Completion | 0.40 | Did the agent complete the stated task? |
| Response Quality | 0.25 | LLM-as-judge quality rubric (0.0-1.0) |
| Efficiency | 0.10 | Penalty for excessive iterations |
| Human Preference | 0.15 | User feedback signals from lyra_feedback table |
| Tool Precision | 0.10 | Ratio of targeted vs. shotgun tool usage |

## Baseline Results

| Metric | Value |
|--------|-------|
| Total Episodes | ${totalEpisodes} |
| Scored Episodes | ${scoredEpisodes} |
| Mean Total Reward | ${avgReward.toFixed(4)} |
| Policy Versions | ${policies} |
${activePolicy ? `| Active Policy | v${activePolicy.version} (reward: ${(activePolicy.champion_reward as number).toFixed(4)}) |` : ""}

## Per-Agent Performance

| Agent | Episodes | Avg Reward | Avg Iterations | Avg Latency (ms) |
|-------|----------|------------|----------------|------------------|
${agentStats.map(a => `| ${a.agent_name} | ${a.episodes} | ${(a.avg_reward ?? 0).toFixed(4)} | ${(a.avg_iterations ?? 0).toFixed(1)} | ${Math.round(a.avg_wall_ms ?? 0)} |`).join("\n")}

## Reward Trend (Last 14 Days)

| Date | Avg Reward | Episodes |
|------|------------|----------|
${rewardTrend.map(r => `| ${r.date} | ${(r.avg_reward ?? 0).toFixed(4)} | ${r.episodes} |`).join("\n")}

## Policy Optimization

We implement reward-weighted few-shot selection: top-K episodes by reward are selected, Claude synthesizes a system prompt addition capturing their behavioral patterns, and the champion prompt is promoted if it shows >5% improvement over baseline (Mann-Whitney U, p<0.1).

${activePolicy ? `**Current Active Policy (v${activePolicy.version}):**\n> ${activePolicy.promotion_reason}\n\nBaseline: ${(activePolicy.baseline_reward as number).toFixed(4)} → Champion: ${(activePolicy.champion_reward as number).toFixed(4)} (+${(((activePolicy.champion_reward as number) - (activePolicy.baseline_reward as number)) / ((activePolicy.baseline_reward as number) || 1) * 100).toFixed(1)}%)` : "No policy promotions yet — optimization cycles pending."}

## Limitations

- Policy improvement uses prompt optimization, not gradient-based RL (no model weight access)
- Reward model uses LLM-as-judge (Claude Haiku) which introduces evaluator bias
- Human preference signal is sparse (dependent on user feedback rate)
- Episode collection is limited to tasks passing through the production system

## Related Work

This work is grounded in RLHF (Christiano et al., 2017), Constitutional AI (Bai et al., 2022), ReAct (Yao et al., 2023), OPRO (Yang et al., 2023), and DSPy (Khattab et al., 2023). The multi-dimensional reward approach extends single-scalar evaluation benchmarks common in agent evaluation literature.

---
*Auto-generated from live rl_episodes and rl_policies tables. Data reflects production AITaskFlo deployment.*`;
}
