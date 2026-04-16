/**
 * Synthetic Patient Generator for Lyra Labs
 * Generates realistic fake patients and clinical encounters for testing.
 * All records tagged is_test_data = 1 for easy cleanup.
 */

import { randomUUID } from "crypto";

// ── Name pools ────────────────────────────────────────────────────────────────

const FIRST_M = ["James", "Carlos", "Marcus", "David", "Michael", "Robert", "William", "Ethan", "Noah", "Liam", "Omar", "Kevin", "Brian", "Andre", "Daniel", "Thomas", "Christopher", "Raymond", "Jonathan", "Samuel"];
const FIRST_F = ["Maria", "Jennifer", "Ashley", "Patricia", "Linda", "Barbara", "Emily", "Sarah", "Jessica", "Angela", "Fatima", "Priya", "Aisha", "Grace", "Helen", "Dorothy", "Nancy", "Sandra", "Lisa", "Karen"];
const LAST = ["Johnson", "Williams", "Brown", "Jones", "Garcia", "Martinez", "Davis", "Rodriguez", "Wilson", "Anderson", "Taylor", "Thomas", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris", "Nguyen", "Chen", "Patel", "Kim", "Robinson"];

// ── Allergy pools ────────────────────────────────────────────────────────────

const ALLERGY_OPTIONS = [
  [], // NKDA — most common
  [], [],
  ["Penicillin"],
  ["Sulfa drugs"],
  ["Penicillin", "Sulfa drugs"],
  ["Latex"],
  ["Aspirin"],
  ["Codeine"],
  ["Lisinopril"],
  ["Amoxicillin"],
];

// ── ICD-10 / clinical scenario templates ─────────────────────────────────────

interface ClinicalScenario {
  specialty: string;
  chiefComplaint: string;
  subjective: string;
  objective: (v: Vitals) => string;
  assessment: string;
  plan: string;
  medications: string[];
  icdCodes: string[];
  vitalRange: VitalRange;
}

interface Vitals {
  temp: number;
  bp_s: number;
  bp_d: number;
  hr: number;
  rr: number;
  spo2: number;
  weight?: number;
}

interface VitalRange {
  temp: [number, number];
  bp_s: [number, number];
  bp_d: [number, number];
  hr: [number, number];
  rr: [number, number];
  spo2: [number, number];
}

const NORMAL_VITALS: VitalRange = {
  temp: [97.8, 98.9],
  bp_s: [110, 125],
  bp_d: [68, 82],
  hr: [62, 80],
  rr: [14, 18],
  spo2: [97, 100],
};

const HYPERTENSIVE_VITALS: VitalRange = {
  temp: [97.8, 98.6],
  bp_s: [148, 175],
  bp_d: [90, 105],
  hr: [70, 88],
  rr: [14, 18],
  spo2: [96, 99],
};

const FEVER_VITALS: VitalRange = {
  temp: [100.4, 103.1],
  bp_s: [105, 125],
  bp_d: [65, 80],
  hr: [90, 112],
  rr: [16, 22],
  spo2: [95, 99],
};

const CHEST_PAIN_VITALS: VitalRange = {
  temp: [97.6, 98.8],
  bp_s: [140, 168],
  bp_d: [88, 100],
  hr: [88, 110],
  rr: [18, 22],
  spo2: [94, 98],
};

const SCENARIOS: ClinicalScenario[] = [
  // ── Family Medicine ──────────────────────────────────────────────────────
  {
    specialty: "Family Medicine",
    chiefComplaint: "Upper respiratory infection",
    subjective: "Patient presents with 4 days of sore throat, nasal congestion, and low-grade fever. Reports mild headache and fatigue. No cough productive of sputum. No shortness of breath. No sick contacts identified.",
    objective: (v) => `Temp ${v.temp}°F, BP ${v.bp_s}/${v.bp_d}, HR ${v.hr}, RR ${v.rr}, SpO2 ${v.spo2}%. Oropharynx mildly erythematous, no exudate. TMs clear bilaterally. No cervical lymphadenopathy. Lungs clear to auscultation.`,
    assessment: "Acute upper respiratory infection, likely viral etiology. Rapid strep negative.",
    plan: "Supportive care — rest, hydration, OTC analgesics PRN. Saline nasal rinse. Return if symptoms worsen or fever persists >5 days. No antibiotics indicated at this time.",
    medications: ["Acetaminophen 500mg PO Q6H PRN", "Pseudoephedrine 30mg PO Q6H PRN"],
    icdCodes: ["J06.9"],
    vitalRange: FEVER_VITALS,
  },
  {
    specialty: "Family Medicine",
    chiefComplaint: "Hypertension follow-up",
    subjective: "Patient here for routine HTN follow-up. Reports medication compliance. Home BP readings averaging 138/88. No headaches, visual changes, chest pain, or palpitations. Denies edema.",
    objective: (v) => `BP ${v.bp_s}/${v.bp_d} (repeated: ${v.bp_s - 4}/${v.bp_d - 2}), HR ${v.hr}, RR ${v.rr}, Temp ${v.temp}°F. No JVD. Heart RRR without murmurs. No peripheral edema. Fundoscopic exam unremarkable.`,
    assessment: "Essential hypertension, not at goal. Currently on lisinopril 10mg daily.",
    plan: "Uptitrate lisinopril to 20mg daily. Low-sodium diet counseling reinforced. Increase physical activity. Recheck BP in 4 weeks. BMP in 2 weeks to monitor Cr and K.",
    medications: ["Lisinopril 20mg PO daily", "HCTZ 12.5mg PO daily"],
    icdCodes: ["I10"],
    vitalRange: HYPERTENSIVE_VITALS,
  },
  {
    specialty: "Family Medicine",
    chiefComplaint: "Type 2 diabetes management",
    subjective: "Patient presents for diabetes follow-up. Reports occasional hypoglycemic episodes in the morning. Last HbA1c 7.8% three months ago. Diet compliance variable. Exercise 2-3x/week. No polyuria, polydipsia, or blurred vision currently.",
    objective: (v) => `BP ${v.bp_s}/${v.bp_d}, HR ${v.hr}, Weight 210 lbs (BMI 31.2). Fasting glucose today 148 mg/dL. Foot exam: intact sensation, no ulcers or deformities. Peripheral pulses 2+ bilaterally.`,
    assessment: "Type 2 diabetes mellitus, suboptimally controlled. Morning hypoglycemia likely secondary to evening NPH dosing.",
    plan: "Adjust NPH insulin — decrease evening dose by 2 units. Continue metformin. Reinforce carbohydrate counting. Referral to diabetes education program. Ophthalmology annual exam due. Repeat HbA1c in 3 months.",
    medications: ["Metformin 1000mg PO BID", "NPH Insulin 18 units SQ QHS", "Aspirin 81mg PO daily"],
    icdCodes: ["E11.9", "E11.649"],
    vitalRange: NORMAL_VITALS,
  },
  // ── Emergency ────────────────────────────────────────────────────────────
  {
    specialty: "Emergency Medicine",
    chiefComplaint: "Chest pain",
    subjective: "58-year-old male presents with 2 hours of substernal chest pressure, 7/10 intensity, radiating to left arm and jaw. Onset at rest. Associated diaphoresis and mild dyspnea. Denies nausea/vomiting. PMH: HTN, hyperlipidemia, 30 pack-year smoking history.",
    objective: (v) => `Diaphoretic, mild distress. BP ${v.bp_s}/${v.bp_d}, HR ${v.hr}, RR ${v.rr}, SpO2 ${v.spo2}% on RA. EKG: 1mm ST elevation in leads II, III, aVF. Trop I: 0.8 ng/mL (elevated). Lungs: bibasilar crackles. S3 gallop present.`,
    assessment: "ST-elevation myocardial infarction (STEMI), inferior wall. Cardiogenic shock pending.",
    plan: "Activate cath lab. ASA 325mg PO, heparin bolus IV per protocol. Clopidogrel 600mg PO loading. Nitroglycerin SL x1 (held due to inferior MI). O2 supplementation. Continuous cardiac monitoring. Emergent coronary angiography.",
    medications: ["Aspirin 325mg PO STAT", "Clopidogrel 600mg PO loading", "Heparin IV per ACS protocol", "Nitroglycerin SL 0.4mg PRN"],
    icdCodes: ["I21.19", "I21.9"],
    vitalRange: CHEST_PAIN_VITALS,
  },
  {
    specialty: "Emergency Medicine",
    chiefComplaint: "Acute abdominal pain",
    subjective: "24-year-old female presents with 8 hours of periumbilical pain migrating to RLQ, now 8/10. Associated nausea x2 vomiting, anorexia. No diarrhea. LMP 3 weeks ago. Sexually active, no recent STI testing. No prior abdominal surgeries.",
    objective: (v) => `Uncomfortable, guarding abdomen. Temp ${v.temp}°F, BP ${v.bp_s}/${v.bp_d}, HR ${v.hr}. RLQ tenderness with guarding and rebound. Positive Rovsing's sign. Psoas sign positive. Pelvic exam deferred for CT. WBC 14.2, urine HCG negative.`,
    assessment: "Acute appendicitis, high clinical suspicion. CT abdomen/pelvis ordered for confirmation.",
    plan: "NPO, IV fluids, IV morphine for pain. CT A/P with contrast STAT. Surgery consult placed. Cefoxitin IV perioperatively if confirmed. OR preparation underway.",
    medications: ["Morphine 2mg IV Q4H PRN", "Ondansetron 4mg IV Q8H PRN", "Cefoxitin 2g IV"],
    icdCodes: ["K35.80"],
    vitalRange: FEVER_VITALS,
  },
  // ── Cardiology ───────────────────────────────────────────────────────────
  {
    specialty: "Cardiology",
    chiefComplaint: "Heart failure follow-up",
    subjective: "72-year-old male with known EF 35% presenting for HF follow-up. Reports 3-4 lb weight gain this week, increased leg swelling, and mild exertional dyspnea climbing stairs. Sleeping on 2 pillows (unchanged). Medication compliance confirmed. Low-sodium diet adherence poor this week (family gathering).",
    objective: (v) => `BP ${v.bp_s}/${v.bp_d}, HR ${v.hr}, Weight 198 lbs (up 4 lbs from last visit). JVD at 8cm. S3 gallop. 2+ pitting edema bilateral lower extremities to knees. Bibasilar crackles on auscultation.`,
    assessment: "Acute decompensated heart failure, HFrEF (EF 35%). Dietary indiscretion likely contributing. No evidence of acute ischemia.",
    plan: "Increase furosemide to 80mg BID x 3 days, then reassess. Daily weight monitoring. Strict 2g sodium diet. Fluid restriction 1.5L/day. Repeat BMP tomorrow. Return if weight increases >2 lbs/day or worsening dyspnea. Consider uptitration of sacubitril/valsartan at next visit.",
    medications: ["Furosemide 80mg PO BID", "Carvedilol 12.5mg PO BID", "Sacubitril/Valsartan 49/51mg PO BID", "Spironolactone 25mg PO daily"],
    icdCodes: ["I50.22", "I50.1"],
    vitalRange: HYPERTENSIVE_VITALS,
  },
  {
    specialty: "Cardiology",
    chiefComplaint: "Palpitations and atrial fibrillation",
    subjective: "66-year-old female with paroxysmal AFib presenting with palpitations for 6 hours. Describes irregular heartbeat, mild fatigue. No chest pain or syncope. Currently on apixaban. Last episode 3 months ago, self-terminated. CHADS2-VASc score: 4.",
    objective: (v) => `BP ${v.bp_s}/${v.bp_d}, HR ${v.hr} (irregular). EKG: atrial fibrillation with ventricular rate 102, no delta waves. No ST changes. Echo last year: EF 58%, mild LAE. INR not applicable (on NOAC).`,
    assessment: "Paroxysmal atrial fibrillation with rapid ventricular response. Rate control achieved suboptimally.",
    plan: "Metoprolol succinate dose increase. Continue apixaban — therapeutic. Cardioversion not indicated at this visit given symptom duration <48h and anticoagulated. Holter monitor if recurrent. Thyroid function, CBC, BMP ordered. Follow up in 2 weeks or sooner if symptoms persist.",
    medications: ["Metoprolol Succinate 100mg PO daily", "Apixaban 5mg PO BID"],
    icdCodes: ["I48.0", "I48.19"],
    vitalRange: CHEST_PAIN_VITALS,
  },
  // ── Pediatrics ───────────────────────────────────────────────────────────
  {
    specialty: "Pediatrics",
    chiefComplaint: "Well-child visit, 4 years",
    subjective: "4-year-old male here for well-child visit. Parents report normal development, meeting milestones. Good appetite, sleeping 10-11 hours/night. Attends preschool. Vaccinations up to date per records. No medical concerns today.",
    objective: (v) => `Height 41.5 in (60th %), Weight 42 lbs (65th %), BMI 15.8 (56th %). BP ${v.bp_s}/${v.bp_d}, HR ${v.hr}, Temp ${v.temp}°F. HEENT normal. TMs clear. Oropharynx clear. Lungs clear. Heart RRR. Abdomen soft, no organomegaly. GU normal male. Neuro age-appropriate.`,
    assessment: "Well child, 4 years old. Normal growth and development.",
    plan: "DTaP, IPV, MMR, Varivax vaccines administered. Vision and hearing screening passed. Age-appropriate anticipatory guidance: screen time, diet, sun safety. Fluoride varnish applied. Next well visit at 5 years.",
    medications: ["DTaP vaccine", "IPV vaccine", "MMR vaccine", "Varivax vaccine"],
    icdCodes: ["Z00.129"],
    vitalRange: NORMAL_VITALS,
  },
  {
    specialty: "Pediatrics",
    chiefComplaint: "Asthma exacerbation",
    subjective: "9-year-old female with known moderate persistent asthma presenting with 2 days of increased wheeze and cough, worse at night. Using albuterol Q4H (daily use at baseline Q6H PRN). Possible URI trigger — classmates sick. No ER visits this year. Controller therapy: fluticasone 110mcg/actuation.",
    objective: (v) => `Mild-moderate respiratory distress. RR ${v.rr}, HR ${v.hr}, SpO2 ${v.spo2}% on RA, Temp ${v.temp}°F. Subcostal and intercostal retractions mild. Expiratory wheeze bilateral diffuse. Peak flow 68% predicted.`,
    assessment: "Acute asthma exacerbation, moderate severity. Likely viral trigger.",
    plan: "Albuterol 2.5mg nebulized Q20 min x3 doses. Prednisolone 1mg/kg PO. SpO2 continuous monitoring. Re-evaluate in 1 hour. If improved, discharge with albuterol Q4H, prednisolone 5-day course, step-up fluticasone. Asthma action plan updated. Follow up in 48-72 hours.",
    medications: ["Albuterol 2.5mg nebulized Q20min x3", "Prednisolone 20mg PO daily x5 days", "Fluticasone 220mcg/actuation 1 puff BID"],
    icdCodes: ["J45.31", "J45.41"],
    vitalRange: FEVER_VITALS,
  },
  // ── Geriatrics ───────────────────────────────────────────────────────────
  {
    specialty: "Geriatrics",
    chiefComplaint: "Falls evaluation",
    subjective: "82-year-old female with 3 falls in past 2 months, no loss of consciousness, no injuries to date. Lives alone. Requires cane for ambulation. Medications include amlodipine, lorazepam, metoprolol, hydrochlorothiazide. Denies dizziness on position changes today but did note it previously. PHx: HTN, osteoporosis, mild cognitive impairment.",
    objective: (v) => `BP ${v.bp_s}/${v.bp_d} sitting, drops to ${v.bp_s - 18}/${v.bp_d - 10} standing. HR ${v.hr}. Timed Up and Go: 18 seconds (elevated risk). Gait unsteady with wide base. Romberg positive. MMSE 22/30. No focal deficits.`,
    assessment: "Recurrent falls — multifactorial etiology. Orthostatic hypotension, polypharmacy (benzodiazepine), gait impairment, and cognitive impairment all contributing.",
    plan: "Deprescribe lorazepam — taper and discontinue. Refer to physical therapy for fall prevention and gait training. Vitamin D 1000 IU daily. Bone density DEXA scheduled. Home safety evaluation referral. Orthostatic BP monitoring. Medication reconciliation completed. Discuss with family re: living situation.",
    medications: ["Amlodipine 5mg PO daily", "Metoprolol 25mg PO daily", "HCTZ 12.5mg PO daily", "Vitamin D 1000 IU PO daily"],
    icdCodes: ["R55", "R26.81", "I95.1", "F03.90"],
    vitalRange: HYPERTENSIVE_VITALS,
  },
];

// ── Utility ───────────────────────────────────────────────────────────────────

function rng(min: number, max: number, decimals = 0): number {
  const val = Math.random() * (max - min) + min;
  return decimals === 0 ? Math.round(val) : parseFloat(val.toFixed(decimals));
}

function randItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDob(minAge: number, maxAge: number): string {
  const ageYears = rng(minAge, maxAge);
  const d = new Date();
  d.setFullYear(d.getFullYear() - ageYears);
  d.setMonth(rng(0, 11));
  d.setDate(rng(1, 28));
  return d.toISOString().split("T")[0];
}

function generateVitals(range: VitalRange): Vitals {
  return {
    temp: rng(range.temp[0], range.temp[1], 1),
    bp_s: rng(range.bp_s[0], range.bp_s[1]),
    bp_d: rng(range.bp_d[0], range.bp_d[1]),
    hr: rng(range.hr[0], range.hr[1]),
    rr: rng(range.rr[0], range.rr[1]),
    spo2: rng(range.spo2[0], range.spo2[1]),
    weight: rng(120, 280),
  };
}

// ── Public generators ─────────────────────────────────────────────────────────

export interface GeneratedPatient {
  id: string;
  name: string;
  dob: string;
  sex: "Male" | "Female";
  mrn: string;
  allergies: string[];
}

export interface GeneratedEncounter {
  patientId: string;
  date: string;
  chiefComplaint: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  medications: string[];
  icdCodes: string[];
  vitals: Vitals;
  specialty: string;
}

export function generatePatient(): GeneratedPatient {
  const sex = Math.random() > 0.5 ? "Male" : "Female";
  const firstName = sex === "Male" ? randItem(FIRST_M) : randItem(FIRST_F);
  const lastName = randItem(LAST);

  // Age distribution: ~20% pediatric (0-17), ~60% adult (18-65), ~20% geriatric (66-95)
  const ageGroup = Math.random();
  const dob = ageGroup < 0.2
    ? randomDob(1, 17)
    : ageGroup < 0.8
    ? randomDob(18, 65)
    : randomDob(66, 95);

  const mrnNum = String(Math.floor(Math.random() * 99999999)).padStart(8, "0");

  return {
    id: randomUUID(),
    name: `${firstName} ${lastName}`,
    dob,
    sex,
    mrn: `LABS-${mrnNum}`,
    allergies: randItem(ALLERGY_OPTIONS),
  };
}

export function generateEncounter(patientId: string, daysAgo = 0): GeneratedEncounter {
  const scenario = randItem(SCENARIOS);
  const vitals = generateVitals(scenario.vitalRange);

  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const date = d.toISOString().split("T")[0];

  return {
    patientId,
    date,
    chiefComplaint: scenario.chiefComplaint,
    subjective: scenario.subjective,
    objective: scenario.objective(vitals),
    assessment: scenario.assessment,
    plan: scenario.plan,
    medications: scenario.medications,
    icdCodes: scenario.icdCodes,
    vitals,
    specialty: scenario.specialty,
  };
}

export function generatePatientBatch(count = 50): GeneratedPatient[] {
  const patients: GeneratedPatient[] = [];
  const usedNames = new Set<string>();
  let attempts = 0;
  while (patients.length < count && attempts < count * 3) {
    attempts++;
    const p = generatePatient();
    if (!usedNames.has(p.name)) {
      usedNames.add(p.name);
      patients.push(p);
    }
  }
  return patients;
}

export function generateEncounterBatch(patientIds: string[], totalEncounters = 200): GeneratedEncounter[] {
  const encounters: GeneratedEncounter[] = [];
  // Distribute encounters across patients (avg 4 per patient)
  for (let i = 0; i < totalEncounters; i++) {
    const patientId = randItem(patientIds);
    const daysAgo = rng(0, 365);
    encounters.push(generateEncounter(patientId, daysAgo));
  }
  return encounters;
}
