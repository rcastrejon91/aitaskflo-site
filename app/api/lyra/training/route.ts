import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import path from "path";

const ADMIN_USER_ID = "b9969c91-8bb4-4377-aae5-94e2a8b7f718";
const OUTPUT_DIR = path.join(process.cwd(), "data", "training");

function isAdmin(userId?: string): boolean {
  return userId === ADMIN_USER_ID || userId?.startsWith("admin-") === true;
}

/**
 * GET /api/lyra/training
 * Returns export stats (how many examples available) without writing files.
 */
export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!isAdmin(userId)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { buildSFTDataset, buildDPODataset } = await import("@/lib/lyra/training/export");
  const sft = buildSFTDataset();
  const dpo = buildDPODataset();

  return NextResponse.json({
    sft_examples: sft.length,
    dpo_pairs: dpo.length,
    ready_for_training: sft.length >= 10,
    note: sft.length < 10
      ? `Need at least 10 examples for useful fine-tuning. Have ${sft.length}. Keep chatting with Lyra.`
      : `${sft.length} examples ready. Recommended: 100+ for personality, 1000+ for reasoning.`,
  });
}

/**
 * POST /api/lyra/training
 * Actions: "export" | "upload" | "full" (export + upload) | "autotrain"
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!isAdmin(userId)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = await req.json().catch(() => ({})) as {
    action?: string;
    base_model?: string;
    auto_train?: boolean;
  };

  const action = body.action ?? "export";

  // ── Export to local JSONL ───────────────────────────���──────────────────────
  if (action === "export") {
    const { exportTrainingData } = await import("@/lib/lyra/training/export");
    const result = exportTrainingData(OUTPUT_DIR);
    return NextResponse.json({
      ok: true,
      sft_examples: result.sftCount,
      dpo_pairs: result.dpoCount,
      files: { sft: result.sftPath, dpo: result.dpoPath },
    });
  }

  // ── Upload to HuggingFace ──────────────────────────────────────────────────
  if (action === "upload" || action === "full") {
    const { exportTrainingData } = await import("@/lib/lyra/training/export");
    const exported = exportTrainingData(OUTPUT_DIR);

    const { runUploadPipeline } = await import("@/lib/lyra/training/hf_upload");
    const result = await runUploadPipeline(
      exported.sftPath,
      exported.dpoPath,
      body.base_model ?? "meta-llama/Llama-3.2-3B-Instruct",
      false
    );

    if (!result) return NextResponse.json({ error: "Upload failed — check HF_TOKEN" }, { status: 500 });

    return NextResponse.json({
      ok: true,
      sft_examples: exported.sftCount,
      dpo_pairs: exported.dpoCount,
      repo_url: result.repoUrl,
      uploaded: result.sftUploaded,
    });
  }

  // ── Export + Upload + Trigger AutoTrain ────────────────────────────────────
  if (action === "autotrain") {
    const { exportTrainingData } = await import("@/lib/lyra/training/export");
    const exported = exportTrainingData(OUTPUT_DIR);

    if (exported.sftCount < 10) {
      return NextResponse.json({
        error: `Not enough data — need 10+ examples, have ${exported.sftCount}. Keep chatting with Lyra.`,
      }, { status: 400 });
    }

    const { runUploadPipeline } = await import("@/lib/lyra/training/hf_upload");
    const result = await runUploadPipeline(
      exported.sftPath,
      exported.dpoPath,
      body.base_model ?? "meta-llama/Llama-3.2-3B-Instruct",
      true
    );

    if (!result) return NextResponse.json({ error: "Pipeline failed" }, { status: 500 });

    return NextResponse.json({
      ok: true,
      sft_examples: exported.sftCount,
      dpo_pairs: exported.dpoCount,
      repo_url: result.repoUrl,
      autotrain: result.autoTrainJob,
      next_steps: result.autoTrainJob
        ? `Training started. Model will appear at: ${result.autoTrainJob.url}`
        : "Upload succeeded. Go to huggingface.co/autotrain to start training manually.",
    });
  }

  return NextResponse.json({ error: "Unknown action. Use: export | upload | autotrain" }, { status: 400 });
}
