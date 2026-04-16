// ── Robot Arm API client ──────────────────────────────────────────────────────
// Compatible with Universal Robots REST API and ROS bridge HTTP interfaces.
// Base URL: process.env.ROBOT_ARM_URL (e.g. http://192.168.1.100:5000)

const BASE = () => {
  const url = process.env.ROBOT_ARM_URL;
  if (!url) throw new Error("ROBOT_ARM_URL is not set in environment variables.");
  return url.replace(/\/$/, "");
};

export interface ArmStatus {
  joints: number[];          // 6 joint angles in degrees
  mode: string;              // e.g. "RUNNING", "IDLE", "STOPPED"
  safetyState: string;       // e.g. "NORMAL", "FAULT", "PROTECTIVE_STOP"
  tcpPosition: { x: number; y: number; z: number; rx: number; ry: number; rz: number };
  powered: boolean;
  programRunning: boolean;
}

export interface ArmResponse {
  success: boolean;
  message?: string;
}

async function armFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Robot arm API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

/** GET /status — returns joint positions, mode, and safety state */
export async function getArmStatus(): Promise<ArmStatus> {
  return armFetch<ArmStatus>("/status");
}

/** POST /move — move the end effector to a Cartesian position (mm + radians) */
export async function moveToPosition(
  x: number, y: number, z: number,
  rx: number, ry: number, rz: number
): Promise<ArmResponse> {
  return armFetch<ArmResponse>("/move", {
    method: "POST",
    body: JSON.stringify({ x, y, z, rx, ry, rz }),
  });
}

/** POST /program/run — execute a saved program by name */
export async function runProgram(programName: string): Promise<ArmResponse> {
  return armFetch<ArmResponse>("/program/run", {
    method: "POST",
    body: JSON.stringify({ program: programName }),
  });
}

/** POST /stop — immediately halt all arm motion */
export async function stopArm(): Promise<ArmResponse> {
  return armFetch<ArmResponse>("/stop", { method: "POST", body: "{}" });
}

/** POST /gripper/open — open the end-effector gripper */
export async function openGripper(): Promise<ArmResponse> {
  return armFetch<ArmResponse>("/gripper/open", { method: "POST", body: "{}" });
}

/** POST /gripper/close — close the end-effector gripper */
export async function closeGripper(): Promise<ArmResponse> {
  return armFetch<ArmResponse>("/gripper/close", { method: "POST", body: "{}" });
}

/** Returns the MJPEG stream URL for the lab camera */
export function getVideoFeed(): string {
  return `${BASE()}/camera/stream`;
}
