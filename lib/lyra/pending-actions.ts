/**
 * lib/lyra/pending-actions.ts
 * In-memory store for actions awaiting user confirmation.
 * TTL: 5 minutes. Auto-purged on each write.
 */

export interface PendingAction {
  id: string;
  tool: string;
  input: Record<string, string>;
  userId?: string;
  clientIp?: string;
  createdAt: number;
  description: string;
  details?: Record<string, string>;
}

const TTL = 5 * 60 * 1000; // 5 min
const STORE = new Map<string, PendingAction>();

function purge() {
  const now = Date.now();
  for (const [k, v] of STORE) {
    if (now - v.createdAt > TTL) STORE.delete(k);
  }
}

export function savePendingAction(action: PendingAction): void {
  purge();
  STORE.set(action.id, action);
}

export function getPendingAction(id: string): PendingAction | null {
  const action = STORE.get(id);
  if (!action) return null;
  if (Date.now() - action.createdAt > TTL) { STORE.delete(id); return null; }
  return action;
}

export function deletePendingAction(id: string): void {
  STORE.delete(id);
}
