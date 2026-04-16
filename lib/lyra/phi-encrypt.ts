/**
 * PHI Encryption — AES-256-GCM
 * HIPAA § 164.312(a)(2)(iv) — Encryption and Decryption
 *
 * All Protected Health Information (PHI) fields are encrypted at rest
 * before being written to the database and decrypted on read.
 *
 * Key: PHI_ENCRYPTION_KEY env var (64 hex chars = 32 bytes)
 * Algorithm: AES-256-GCM with a random 12-byte IV per encryption.
 * Format stored: <iv_hex>:<authTag_hex>:<ciphertext_hex>
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;   // 96-bit IV — recommended for GCM
const TAG_LEN = 16;  // 128-bit auth tag

function getKey(): Buffer {
  const raw = process.env.PHI_ENCRYPTION_KEY ?? "";
  if (!raw) {
    // In dev without a key, derive a deterministic key from a warning message.
    // This means data is technically "encrypted" but NOT secure — warn loudly.
    console.warn("[PHI] WARNING: PHI_ENCRYPTION_KEY not set. Using insecure fallback key. Set PHI_ENCRYPTION_KEY in .env.local for production.");
    return createHash("sha256").update("INSECURE_FALLBACK_DO_NOT_USE_IN_PROD").digest();
  }
  const buf = Buffer.from(raw.replace(/\s/g, ""), "hex");
  if (buf.length !== 32) {
    throw new Error(`PHI_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). Got ${buf.length} bytes.`);
  }
  return buf;
}

/**
 * Encrypt a plaintext string. Returns "<iv>:<tag>:<ciphertext>" hex string.
 * Returns empty string if input is empty/null.
 */
export function encryptPHI(plaintext: string | null | undefined): string {
  if (!plaintext) return plaintext ?? "";
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypt a "<iv>:<tag>:<ciphertext>" hex string back to plaintext.
 * Returns the input unchanged if it doesn't look like encrypted data
 * (allows graceful handling of legacy plaintext rows during migration).
 */
export function decryptPHI(stored: string | null | undefined): string {
  if (!stored) return stored ?? "";
  // Detect our format: three colon-separated hex segments
  const parts = stored.split(":");
  if (parts.length !== 3) return stored; // not encrypted — legacy plaintext passthrough
  try {
    const key = getKey();
    const iv = Buffer.from(parts[0], "hex");
    const tag = Buffer.from(parts[1], "hex");
    const ciphertext = Buffer.from(parts[2], "hex");
    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(ciphertext).toString("utf8") + decipher.final("utf8");
  } catch {
    // Auth tag mismatch or corrupt data — return placeholder rather than crashing
    console.error("[PHI] Decryption failed — data may be corrupt or key mismatch");
    return "[DECRYPTION ERROR]";
  }
}

/**
 * Encrypt a JSON-serializable value (arrays, objects).
 * Serializes to JSON first, then encrypts.
 */
export function encryptPHIJson(value: unknown): string {
  if (value === null || value === undefined) return "[]";
  return encryptPHI(JSON.stringify(value));
}

/**
 * Decrypt and parse a JSON-encrypted value.
 * Falls back to JSON.parse of the raw string for legacy unencrypted data.
 */
export function decryptPHIJson<T = unknown>(stored: string | null | undefined, fallback: T): T {
  if (!stored) return fallback;
  try {
    const decrypted = decryptPHI(stored);
    return JSON.parse(decrypted) as T;
  } catch {
    return fallback;
  }
}

/**
 * Check if a string appears to be PHI-encrypted (our format).
 */
export function isEncrypted(value: string | null | undefined): boolean {
  if (!value) return false;
  const parts = value.split(":");
  return parts.length === 3 && parts.every((p) => /^[0-9a-f]+$/i.test(p));
}
