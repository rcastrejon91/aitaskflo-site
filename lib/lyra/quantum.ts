/**
 * lib/lyra/quantum.ts
 * IBM Quantum integration for Lyra — runs real quantum circuits and logs results.
 */

const IBM_QUANTUM_URL = "https://quantum.cloud.ibm.com/api/v1";
const IAM_URL = "https://iam.cloud.ibm.com/identity/token";

// ── Auth ──────────────────────────────────────────────────────────────────────
let cachedToken: { token: string; expires: number } | null = null;

export async function getQuantumToken(): Promise<string | null> {
  const apiKey = process.env.IBM_QUANTUM_API_KEY;
  if (!apiKey) return null;

  if (cachedToken && Date.now() < cachedToken.expires - 60000) {
    return cachedToken.token;
  }

  try {
    const res = await fetch(IAM_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ibm:params:oauth:grant-type:apikey",
        apikey: apiKey,
      }),
    });
    const data = await res.json() as { access_token: string; expires_in: number };
    cachedToken = { token: data.access_token, expires: Date.now() + data.expires_in * 1000 };
    return cachedToken.token;
  } catch (e) {
    console.error("[quantum] auth error:", e);
    return null;
  }
}

// ── List available backends ───────────────────────────────────────────────────
export async function listBackends(): Promise<string[]> {
  const token = await getQuantumToken();
  if (!token) return [];
  try {
    const res = await fetch(`${IBM_QUANTUM_URL}/backends`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json() as { backends: Array<{ name: string; status: string }> };
    return (data.backends ?? []).filter(b => b.status === "online").map(b => b.name);
  } catch { return []; }
}

// ── Quantum Random Number Generator ──────────────────────────────────────────
// Uses a simple Hadamard circuit — each qubit in superposition, measured → true random bits
export async function quantumRandom(bits = 8): Promise<{ value: number; binary: string; backend: string; shots: number } | null> {
  const token = await getQuantumToken();
  if (!token) return null;

  // Build a simple circuit: H on each qubit, then measure
  // Encoded as OpenQASM 2.0
  const qasm = `
OPENQASM 2.0;
include "qelib1.inc";
qreg q[${bits}];
creg c[${bits}];
${Array.from({ length: bits }, (_, i) => `h q[${i}];`).join("\n")}
${Array.from({ length: bits }, (_, i) => `measure q[${i}] -> c[${i}];`).join("\n")}
  `.trim();

  try {
    // Submit job via Sampler primitive (REST API)
    const jobRes = await fetch(`${IBM_QUANTUM_URL}/jobs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        program_id: "sampler",
        backend: "ibm_kingston",
        params: {
          circuits: [qasm],
          shots: 1,
        },
      }),
    });

    if (!jobRes.ok) {
      const err = await jobRes.text();
      console.error("[quantum] job submit error:", err);
      return null;
    }

    const job = await jobRes.json() as { id: string };

    // Poll for result
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const statusRes = await fetch(`${IBM_QUANTUM_URL}/jobs/${job.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const status = await statusRes.json() as { status: string; results?: Array<{ data: { c: { samples: string[] } } }> };

      if (status.status === "Completed" && status.results) {
        const sample = status.results[0]?.data?.c?.samples?.[0] ?? "0".repeat(bits);
        const value = parseInt(sample, 2);
        return { value, binary: sample, backend: "ibm_kingston", shots: 1 };
      }
      if (status.status === "Failed" || status.status === "Cancelled") break;
    }
  } catch (e) {
    console.error("[quantum] RNG error:", e);
  }
  return null;
}

// ── Log experiment to DB ──────────────────────────────────────────────────────
export function logQuantumExperiment(opts: {
  userId: string;
  title: string;
  hypothesis: string;
  result: string;
  metadata?: Record<string, unknown>;
}): string {
  try {
    const { saveExperiment } = require("@/lib/lyra/db");
    const id = Math.random().toString(36).slice(2, 12);
    saveExperiment({
      id,
      userId: opts.userId,
      type: "quantum",
      title: opts.title,
      hypothesis: opts.hypothesis,
      status: "completed",
      result: opts.result,
      metadata: JSON.stringify(opts.metadata ?? {}),
    });
    return id;
  } catch { return ""; }
}

// ── Quantum experiment runner ─────────────────────────────────────────────────
export interface QuantumExperimentResult {
  name: string;
  description: string;
  result: unknown;
  insight: string;
  backend: string;
  timestamp: string;
}

export async function runQuantumExperiment(name: string): Promise<QuantumExperimentResult | null> {
  const experiments: Record<string, () => Promise<QuantumExperimentResult | null>> = {
    rng: async () => {
      const r = await quantumRandom(8);
      if (!r) return null;
      return {
        name: "Quantum Random Number Generation",
        description: "8-qubit Hadamard circuit — each qubit in superposition, collapsed by measurement",
        result: r,
        insight: `Generated truly random number ${r.value} (${r.binary} in binary) using quantum superposition on ${r.backend}. Unlike classical pseudo-random generators, this result is fundamentally unpredictable — no algorithm could have predicted it before measurement.`,
        backend: r.backend,
        timestamp: new Date().toISOString(),
      };
    },

    entanglement: async () => {
      const token = await getQuantumToken();
      if (!token) return null;
      // Bell state circuit — creates quantum entanglement between 2 qubits
      const qasm = `
OPENQASM 2.0;
include "qelib1.inc";
qreg q[2];
creg c[2];
h q[0];
cx q[0],q[1];
measure q[0] -> c[0];
measure q[1] -> c[1];
      `.trim();

      const jobRes = await fetch(`${IBM_QUANTUM_URL}/jobs`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ program_id: "sampler", backend: "ibm_kingston", params: { circuits: [qasm], shots: 100 } }),
      });
      if (!jobRes.ok) return null;
      const job = await jobRes.json() as { id: string };

      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const s = await fetch(`${IBM_QUANTUM_URL}/jobs/${job.id}`, { headers: { Authorization: `Bearer ${token}` } });
        const status = await s.json() as { status: string; results?: Array<{ data: { c: { counts: Record<string, number> } } }> };
        if (status.status === "Completed" && status.results) {
          const counts = status.results[0]?.data?.c?.counts ?? {};
          return {
            name: "Bell State Entanglement",
            description: "Created a Bell state — maximum quantum entanglement between 2 qubits",
            result: counts,
            insight: `Measured entangled qubit pairs: ${JSON.stringify(counts)}. In a perfect Bell state, only |00⟩ and |11⟩ should appear — demonstrating that measuring one qubit instantly determines the other, regardless of distance.`,
            backend: "ibm_kingston",
            timestamp: new Date().toISOString(),
          };
        }
        if (status.status === "Failed") break;
      }
      return null;
    },
  };

  const fn = experiments[name] ?? experiments.rng;
  return fn();
}
