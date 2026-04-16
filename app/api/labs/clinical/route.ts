import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  upsertPatient,
  saveEncounter,
  deleteTestData,
  listTestPatients,
  getEncounters,
} from "@/lib/lyra/clinical";
import {
  generatePatient,
  generatePatientBatch,
  generateEncounterBatch,
} from "@/lib/labs/synthetic-patients";
import { getDb } from "@/lib/lyra/db";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const ADMIN_IDS = ["admin-1", "b9969c91-8bb4-4377-aae5-94e2a8b7f718"];

async function getAuthorizedUserId(req: NextRequest): Promise<string | null> {
  if (process.env.ENABLE_LABS !== "true") return null;
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId || !ADMIN_IDS.includes(userId)) return null;
  return userId;
}

function getAuditLogLocal(userId: string, limit = 100) {
  const db = getDb();
  if (!db) return [];
  try {
    return db.prepare(
      "SELECT * FROM ehr_audit_log WHERE user_id = ? ORDER BY ts DESC LIMIT ?"
    ).all(userId, limit) as Array<{
      id: string; user_id: string; action: string; record_type: string;
      record_id: string | null; detail: string | null; ip: string | null; ts: string;
    }>;
  } catch { return []; }
}

export async function GET(req: NextRequest) {
  const userId = await getAuthorizedUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized or Labs disabled" }, { status: 401 });

  const action = req.nextUrl.searchParams.get("action") ?? "list";
  const ip = req.headers.get("x-forwarded-for") ?? undefined;

  if (action === "list") {
    const patients = listTestPatients(userId);
    return NextResponse.json({ patients, count: patients.length });
  }

  if (action === "encounters") {
    const patientId = req.nextUrl.searchParams.get("patient_id");
    if (!patientId) return NextResponse.json({ error: "patient_id required" }, { status: 400 });
    const encounters = getEncounters(userId, patientId, 20, ip);
    return NextResponse.json({ encounters });
  }

  if (action === "audit") {
    const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "100");
    const log = getAuditLogLocal(userId, Math.min(limit, 500));
    return NextResponse.json({ log, count: log.length });
  }

  if (action === "db_inspect") {
    // Show raw encrypted rows for a patient (for debug panel)
    const patientId = req.nextUrl.searchParams.get("patient_id");
    if (!patientId) return NextResponse.json({ error: "patient_id required" }, { status: 400 });
    const db = getDb();
    if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 500 });
    const raw = db.prepare("SELECT * FROM ehr_patients WHERE id = ? AND user_id = ?").get(patientId, userId);
    return NextResponse.json({ raw });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const userId = await getAuthorizedUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized or Labs disabled" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const action = (body.action as string) ?? "";
  const ip = req.headers.get("x-forwarded-for") ?? undefined;

  // ── Seed: generate 50 patients + 200 encounters ──────────────────────────
  if (action === "seed") {
    const existing = listTestPatients(userId);
    if (existing.length > 0) {
      return NextResponse.json({
        message: `Already seeded — ${existing.length} test patients exist. Use reset first.`,
        count: existing.length,
      });
    }

    const patientCount = (body.patients as number) ?? 50;
    const encounterCount = (body.encounters as number) ?? 200;

    const syntheticPatients = generatePatientBatch(Math.min(patientCount, 100));
    const savedPatients = [];

    for (const sp of syntheticPatients) {
      const saved = upsertPatient({
        userId,
        name: sp.name,
        dob: sp.dob,
        sex: sp.sex,
        mrn: sp.mrn,
        allergies: sp.allergies,
        notes: "",
        isTestData: true,
        ip,
      });
      savedPatients.push(saved);
    }

    const patientIds = savedPatients.map((p) => p.id);
    const syntheticEncounters = generateEncounterBatch(patientIds, Math.min(encounterCount, 500));
    let savedEncounters = 0;

    for (const se of syntheticEncounters) {
      saveEncounter({
        userId,
        patientId: se.patientId,
        date: se.date,
        chiefComplaint: se.chiefComplaint,
        soap: {
          subjective: se.subjective,
          objective: se.objective,
          assessment: se.assessment,
          plan: se.plan,
        },
        vitals: se.vitals as unknown as Record<string, unknown>,
        medications: se.medications,
        icdCodes: se.icdCodes,
        isTestData: true,
        ip,
      });
      savedEncounters++;
    }

    return NextResponse.json({
      message: "Labs seeded successfully",
      patients: savedPatients.length,
      encounters: savedEncounters,
    });
  }

  // ── Reset: wipe all test data and re-seed ────────────────────────────────
  if (action === "reset") {
    const deleted = deleteTestData(userId);
    return NextResponse.json({ message: "Test data cleared", deleted });
  }

  // ── Generate: create one new synthetic patient ────────────────────────────
  if (action === "generate") {
    const sp = generatePatient();
    const patient = upsertPatient({
      userId,
      name: sp.name,
      dob: sp.dob,
      sex: sp.sex,
      mrn: sp.mrn,
      allergies: sp.allergies,
      isTestData: true,
      ip,
    });

    // Add 1-3 random encounters for this patient
    const encounterCount = Math.floor(Math.random() * 3) + 1;
    const encounters = generateEncounterBatch([patient.id], encounterCount);
    const savedEncounters = [];
    for (const se of encounters) {
      const enc = saveEncounter({
        userId,
        patientId: patient.id,
        date: se.date,
        chiefComplaint: se.chiefComplaint,
        soap: { subjective: se.subjective, objective: se.objective, assessment: se.assessment, plan: se.plan },
        vitals: se.vitals as unknown as Record<string, unknown>,
        medications: se.medications,
        icdCodes: se.icdCodes,
        isTestData: true,
        ip,
      });
      savedEncounters.push(enc);
    }

    return NextResponse.json({ patient, encounters: savedEncounters });
  }

  // ── Save encounter manually ───────────────────────────────────────────────
  if (action === "save_encounter") {
    const patientId = body.patient_id as string;
    if (!patientId) return NextResponse.json({ error: "patient_id required" }, { status: 400 });
    const enc = saveEncounter({
      userId,
      patientId,
      date: body.date as string | undefined,
      chiefComplaint: body.chief_complaint as string | undefined,
      soap: {
        subjective: body.subjective as string | undefined,
        objective: body.objective as string | undefined,
        assessment: body.assessment as string | undefined,
        plan: body.plan as string | undefined,
      },
      vitals: body.vitals as Record<string, unknown> | undefined,
      medications: body.medications as string[] | undefined,
      icdCodes: body.icd_codes as string[] | undefined,
      isTestData: true,
      ip,
    });
    return NextResponse.json({ encounter: enc });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
