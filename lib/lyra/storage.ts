import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function filePath(filename: string): string {
  return path.join(DATA_DIR, filename);
}

function lockPath(filename: string): string {
  return filePath(filename) + ".lock";
}

async function acquireLock(filename: string, maxRetries = 10): Promise<void> {
  const lp = lockPath(filename);
  for (let i = 0; i < maxRetries; i++) {
    try {
      // Exclusive create — fails if file already exists
      fs.writeFileSync(lp, Date.now().toString(), { flag: "wx" });
      return;
    } catch {
      // Stale lock? Check if it's older than 5s
      try {
        const lockAge = Date.now() - parseInt(fs.readFileSync(lp, "utf-8"));
        if (lockAge > 5000) fs.unlinkSync(lp);
      } catch {
        /* ignore */
      }
      await new Promise((r) => setTimeout(r, 50));
    }
  }
  throw new Error(`Could not acquire lock for ${filename}`);
}

function releaseLock(filename: string) {
  try {
    fs.unlinkSync(lockPath(filename));
  } catch {
    /* ignore */
  }
}

export function readStore<T>(filename: string, defaultValue: T): T {
  ensureDataDir();
  const fp = filePath(filename);
  if (!fs.existsSync(fp)) {
    writeStoreSync(filename, defaultValue);
    return defaultValue;
  }
  try {
    return JSON.parse(fs.readFileSync(fp, "utf-8")) as T;
  } catch {
    return defaultValue;
  }
}

function writeStoreSync<T>(filename: string, data: T): void {
  ensureDataDir();
  fs.writeFileSync(filePath(filename), JSON.stringify(data, null, 2), "utf-8");
}

export async function writeStore<T>(filename: string, data: T): Promise<void> {
  ensureDataDir();
  await acquireLock(filename);
  try {
    fs.writeFileSync(filePath(filename), JSON.stringify(data, null, 2), "utf-8");
  } finally {
    releaseLock(filename);
  }
}

export async function updateStore<T>(
  filename: string,
  defaultValue: T,
  updater: (current: T) => T
): Promise<T> {
  ensureDataDir();
  await acquireLock(filename);
  try {
    const current = readStore<T>(filename, defaultValue);
    const updated = updater(current);
    fs.writeFileSync(filePath(filename), JSON.stringify(updated, null, 2), "utf-8");
    return updated;
  } finally {
    releaseLock(filename);
  }
}
