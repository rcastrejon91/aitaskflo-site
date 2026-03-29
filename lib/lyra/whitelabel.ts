/**
 * lib/lyra/whitelabel.ts
 * White-label configuration management.
 * Agencies buy a white-label plan and get their own branded Lyra instance.
 */

import fsp from "fs/promises";
import path from "path";
import { WhiteLabelConfig, DEFAULT_WL_TOOLS } from "./resume";

const WL_FILE = path.join(process.env.APP_DIR ?? process.cwd(/*turbopackIgnore: true*/), "data", "whitelabels.json");

// ── Storage ───────────────────────────────────────────────────────────────────

async function loadAll(): Promise<WhiteLabelConfig[]> {
  try {
    const raw = await fsp.readFile(WL_FILE, "utf-8");
    return JSON.parse(raw) as WhiteLabelConfig[];
  } catch {
    return [];
  }
}

async function saveAll(configs: WhiteLabelConfig[]): Promise<void> {
  await fsp.mkdir(path.dirname(WL_FILE), { recursive: true });
  await fsp.writeFile(WL_FILE, JSON.stringify(configs, null, 2), "utf-8");
}

export async function getWhiteLabel(slug: string): Promise<WhiteLabelConfig | null> {
  const all = await loadAll();
  return all.find((c) => c.slug === slug) ?? null;
}

export async function listWhiteLabels(): Promise<WhiteLabelConfig[]> {
  return loadAll();
}

export async function upsertWhiteLabel(config: Omit<WhiteLabelConfig, "createdAt"> & { createdAt?: string }): Promise<WhiteLabelConfig> {
  const all = await loadAll();
  const idx = all.findIndex((c) => c.slug === config.slug);
  const full: WhiteLabelConfig = {
    ...config,
    createdAt: config.createdAt ?? new Date().toISOString(),
    allowedTools: config.allowedTools?.length ? config.allowedTools : DEFAULT_WL_TOOLS,
  };
  if (idx >= 0) {
    all[idx] = full;
  } else {
    all.push(full);
  }
  await saveAll(all);
  return full;
}

export async function deleteWhiteLabel(slug: string): Promise<boolean> {
  const all = await loadAll();
  const filtered = all.filter((c) => c.slug !== slug);
  if (filtered.length === all.length) return false;
  await saveAll(filtered);
  return true;
}

// ── Embed script builder ──────────────────────────────────────────────────────

export function buildEmbedScript(config: WhiteLabelConfig, baseUrl: string): string {
  return `<!-- ${config.agencyName} — Powered by ${config.agentName} -->
<script>
  (function() {
    var s = document.createElement('script');
    s.src = '${baseUrl}/embed.js';
    s.dataset.slug = '${config.slug}';
    s.dataset.name = '${config.agentName}';
    s.dataset.color = '${config.primaryColor}';
    s.async = true;
    document.head.appendChild(s);
  })();
</script>`;
}

// ── Chat endpoint URL ─────────────────────────────────────────────────────────

export function getWlChatEndpoint(slug: string, baseUrl: string): string {
  return `${baseUrl}/api/wl/${slug}/chat`;
}
