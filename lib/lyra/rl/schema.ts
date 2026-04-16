import type { Database } from "better-sqlite3";

export function initRLSchema(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS rl_episodes (
      id                TEXT PRIMARY KEY,
      task              TEXT NOT NULL,
      agent_name        TEXT NOT NULL,
      system_prompt_hash TEXT,
      rollout           TEXT NOT NULL,
      total_iterations  INTEGER DEFAULT 1,
      wall_ms           INTEGER DEFAULT 0,
      terminal_state    TEXT DEFAULT 'success',
      reward_task       REAL,
      reward_quality    REAL,
      reward_efficiency REAL,
      reward_human      REAL,
      reward_tool       REAL,
      reward_total      REAL,
      scored_at         TEXT,
      created_at        TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_rl_episodes_agent ON rl_episodes(agent_name, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_rl_episodes_state ON rl_episodes(terminal_state, created_at DESC);

    CREATE TABLE IF NOT EXISTS rl_policies (
      id                TEXT PRIMARY KEY,
      version           INTEGER NOT NULL,
      few_shot_examples TEXT NOT NULL,
      promotion_reason  TEXT,
      baseline_reward   REAL DEFAULT 0,
      champion_reward   REAL DEFAULT 0,
      p_value           REAL DEFAULT 1,
      sample_size       INTEGER DEFAULT 0,
      status            TEXT DEFAULT 'candidate',
      created_at        TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_rl_policies_status ON rl_policies(status, created_at DESC);

    CREATE TABLE IF NOT EXISTS rl_experiments (
      id           TEXT PRIMARY KEY,
      episode_id   TEXT NOT NULL,
      policy_id    TEXT,
      variant      TEXT NOT NULL,
      reward_total REAL DEFAULT 0,
      created_at   TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_rl_experiments_episode ON rl_experiments(episode_id);
    CREATE INDEX IF NOT EXISTS idx_rl_experiments_policy  ON rl_experiments(policy_id, created_at DESC);
  `);
}
