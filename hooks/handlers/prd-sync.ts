/** prd-sync.ts — Sync PRD frontmatter to dashboard state. */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { poseidonPath } from "../lib/paths";

interface PrdFields {
  task?: string;
  slug?: string;
  effort?: string;
  phase?: string;
  progress?: number;
  started?: string;
  updated?: string;
}

/**
 * Parse YAML frontmatter from a PRD.md file.
 * Expects --- delimited frontmatter at the top of the file.
 */
function parseFrontmatter(content: string): PrdFields {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fields: PrdFields = {};
  for (const line of match[1].split("\n")) {
    const kv = line.match(/^(\w+):\s*(.+)$/);
    if (!kv) continue;
    const [, key, val] = kv;
    const trimmed = val.trim().replace(/^["']|["']$/g, "");
    if (key === "progress") { fields.progress = parseInt(trimmed, 10); }
    else if (key in { task: 1, slug: 1, effort: 1, phase: 1, started: 1, updated: 1 }) {
      (fields as any)[key] = trimmed;
    }
  }
  return fields;
}

/**
 * Read a PRD.md file and sync its frontmatter into memory/state/work.json.
 */
export function syncPrdToState(prdPath: string): void {
  if (!existsSync(prdPath)) return;

  const content = readFileSync(prdPath, "utf-8");
  const fields = parseFrontmatter(content);
  if (!fields.slug && !fields.task) return; // nothing useful to sync

  const workPath = poseidonPath("memory", "state", "work.json");
  const workDir = dirname(workPath);
  if (!existsSync(workDir)) mkdirSync(workDir, { recursive: true });

  let work: Record<string, any> = {};
  if (existsSync(workPath)) {
    try { work = JSON.parse(readFileSync(workPath, "utf-8")); } catch { work = {}; }
  }

  const key = fields.slug || fields.task || "unknown";
  work[key] = {
    ...fields,
    syncedAt: new Date().toISOString(),
    source: prdPath,
  };

  writeFileSync(workPath, JSON.stringify(work, null, 2) + "\n");
}
