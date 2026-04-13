/**
 * HuggingFace Hub Upload + AutoTrain trigger
 *
 * 1. Creates a private dataset repo on HF Hub (idempotent)
 * 2. Uploads train.jsonl + dpo.jsonl via the Hub commit API
 * 3. Optionally triggers an AutoTrain fine-tuning job
 */

import fs from "fs";

const HF_API = "https://huggingface.co/api";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function hfFetch(endpoint: string, method: string, body?: unknown, token?: string): Promise<Response> {
  const hfToken = token ?? process.env.HF_TOKEN;
  return fetch(`${HF_API}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${hfToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000),
  });
}

export async function getHFUsername(): Promise<string | null> {
  try {
    const res = await hfFetch("/whoami-v2", "GET");
    if (!res.ok) return null;
    const data = await res.json() as { name?: string };
    return data.name ?? null;
  } catch { return null; }
}

// ── Create dataset repo ───────────────────────────────────────────────────────

export async function ensureDatasetRepo(repoName: string): Promise<{ repoId: string } | null> {
  try {
    const username = await getHFUsername();
    if (!username) return null;

    const repoId = `${username}/${repoName}`;

    // Try to create — 409 means already exists, both are fine
    const res = await hfFetch("/repos/create", "POST", {
      type: "dataset",
      name: repoName,
      private: true,
    });

    if (!res.ok && res.status !== 409) {
      console.error("[hf_upload] Failed to create repo:", await res.text());
      return null;
    }

    return { repoId };
  } catch { return null; }
}

// ── Upload files via commit API ───────────────────────────────────────────────

export async function uploadFilesToRepo(
  repoId: string,
  files: Array<{ path: string; localPath: string }>
): Promise<boolean> {
  try {
    // Build NDJSON commit body
    const lines: string[] = [
      JSON.stringify({ key: "header", value: { summary: "Update Lyra training data", description: "" } }),
    ];

    for (const file of files) {
      if (!fs.existsSync(file.localPath)) continue;
      const content = fs.readFileSync(file.localPath);
      const base64 = content.toString("base64");
      lines.push(JSON.stringify({
        key: "file",
        value: { path: file.path, encoding: "base64", content: base64 },
      }));
    }

    const hfToken = process.env.HF_TOKEN;
    const res = await fetch(`${HF_API}/datasets/${repoId}/commit/main`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hfToken}`,
        "Content-Type": "application/x-ndjson",
      },
      body: lines.join("\n"),
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
      console.error("[hf_upload] Commit failed:", await res.text());
      return false;
    }

    return true;
  } catch (err) {
    console.error("[hf_upload] Upload error:", err);
    return false;
  }
}

// ── AutoTrain trigger ─────────────────────────────────────────────────────────

export interface AutoTrainConfig {
  baseModel: string;       // e.g. "meta-llama/Llama-3.2-3B-Instruct"
  taskType: "sft" | "dpo"; // supervised fine-tuning or direct preference optimization
  datasetRepo: string;     // HF dataset repo ID
  trainingFile: string;    // file inside the dataset repo
  epochs?: number;
  learningRate?: number;
}

export async function triggerAutoTrain(config: AutoTrainConfig): Promise<{ jobId?: string; url?: string } | null> {
  try {
    const username = await getHFUsername();
    if (!username) return null;

    const outputModelName = `lyra-${config.taskType}-${config.baseModel.split("/").pop()?.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`;

    const payload = {
      model: config.baseModel,
      task: config.taskType === "sft" ? "chat_template" : "orpo",
      data_path: config.datasetRepo,
      train_split: config.trainingFile,
      username,
      token: process.env.HF_TOKEN,
      col_mapping: config.taskType === "sft"
        ? { text: "messages" }
        : { prompt: "prompt", chosen: "chosen", rejected: "rejected" },
      hyperparameters: {
        epochs: config.epochs ?? 3,
        learning_rate: config.learningRate ?? 2e-4,
        max_seq_length: 2048,
        quantization: "int4",
        peft: true,
      },
      hub_model: `${username}/${outputModelName}`,
      hub_private_model: true,
    };

    const res = await fetch("https://api.autotrain.huggingface.co/v1/projects", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HF_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[autotrain] Failed:", err);
      return null;
    }

    const data = await res.json() as { id?: string };
    return {
      jobId: data.id,
      url: `https://huggingface.co/${username}/${outputModelName}`,
    };
  } catch (err) {
    console.error("[autotrain] Error:", err);
    return null;
  }
}

// ── Full pipeline ─────────────────────────────────────────────────────────────

export interface PipelineResult {
  repoId: string;
  repoUrl: string;
  sftUploaded: boolean;
  dpoUploaded: boolean;
  autoTrainJob?: { jobId?: string; url?: string } | null;
}

export async function runUploadPipeline(
  sftPath: string,
  dpoPath: string,
  baseModel = "meta-llama/Llama-3.2-3B-Instruct",
  autoTrain = false
): Promise<PipelineResult | null> {
  const repoName = "lyra-finetuning";

  const repo = await ensureDatasetRepo(repoName);
  if (!repo) return null;

  const files = [
    { path: "train.jsonl", localPath: sftPath },
    { path: "dpo.jsonl", localPath: dpoPath },
  ].filter((f) => fs.existsSync(f.localPath) && fs.statSync(f.localPath).size > 2);

  const uploaded = await uploadFilesToRepo(repo.repoId, files);

  let autoTrainJob = null;
  if (autoTrain && uploaded) {
    autoTrainJob = await triggerAutoTrain({
      baseModel,
      taskType: "sft",
      datasetRepo: repo.repoId,
      trainingFile: "train.jsonl",
    });
  }

  const username = repo.repoId.split("/")[0];
  return {
    repoId: repo.repoId,
    repoUrl: `https://huggingface.co/datasets/${repo.repoId}`,
    sftUploaded: uploaded && fs.existsSync(sftPath),
    dpoUploaded: uploaded && fs.existsSync(dpoPath),
    autoTrainJob,
  };
}
