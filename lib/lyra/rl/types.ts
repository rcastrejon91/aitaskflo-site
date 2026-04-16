export interface RLStep {
  step: number;
  state: {
    task: string;
    conversationHistory: Array<{ role: string; content: string }>;
    toolResults: Array<{ tool: string; result: string }>;
    iteration: number;
  };
  action: {
    toolCalls: Array<{ name: string; input: Record<string, unknown> }>;
    textResponse: string;
    confidence: "high" | "medium" | "low";
    reflection?: string;
  };
  timestamp: string;
}

export interface RewardVector {
  taskCompletion: number;    // 0.0 - 1.0
  responseQuality: number;   // 0.0 - 1.0
  efficiency: number;        // 0.0 - 1.0 (penalizes wasted iterations)
  humanPreference: number;   // -1.0, 0.0, or 1.0 normalized to 0.0-1.0
  toolPrecision: number;     // 0.0 - 1.0
  total: number;             // weighted sum
}

export interface RLEpisode {
  id: string;
  task: string;
  agentName: string;
  systemPromptHash: string;
  rollout: RLStep[];
  totalIterations: number;
  wallMs: number;
  terminalState: "success" | "failure" | "low_confidence" | "timeout";
  reward?: RewardVector;
  scoredAt?: string;
  createdAt: string;
}

export interface RLPolicy {
  id: string;
  version: number;
  fewShotExamples: Array<{ task: string; response: string; reward: number }>;
  promotionReason: string;
  baselineReward: number;
  championReward: number;
  pValue: number;
  sampleSize: number;
  status: "candidate" | "active" | "retired";
  createdAt: string;
}

export interface RLExperiment {
  id: string;
  episodeId: string;
  policyId: string;
  variant: "baseline" | "champion";
  rewardTotal: number;
  createdAt: string;
}

export interface PolicyCycleResult {
  cycleId: string;
  episodesAnalyzed: number;
  topKEpisodes: number;
  baselineReward: number;
  championReward: number;
  improvement: number;
  promoted: boolean;
  reason: string;
}

export interface EvalResult {
  policyId?: string;
  totalTasks: number;
  passedTasks: number;
  passRate: number;
  avgReward: RewardVector;
  byCategory: Record<string, { total: number; passed: number; avgReward: number }>;
  durationMs: number;
  runAt: string;
}
