#!/usr/bin/env bun
/**
 * source-auto-indexer.ts — Auto-classify and index data sources from key detection
 *
 * When a new API key is detected that matches a key_pattern from data-sources.yaml,
 * auto-enable the service. When NO pattern matches, provide structured questions
 * for the user.
 *
 * @author Poseidon System
 * @version 1.0.0
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";

const POSEIDON_DIR = process.env.POSEIDON_DIR || join(dirname(import.meta.path.replace("file://", "")), "..", "..");
const DATA_SOURCES_PATH = join(POSEIDON_DIR, "data-sources.yaml");

// ── Types ────────────────────────────────────────────────────

export interface KeyMatch {
  source_id: string;
  source_name: string;
  domain: string;
  cost: string;
  cost_note: string;
  matched: true;
}

export interface KeyUnknown {
  matched: false;
  key_preview: string;  // first 4 + last 4 chars
  questions: string[];  // 5 questions to ask user
}

interface SourceEntry {
  id: string;
  name: string;
  domain: string;
  cost: string;
  cost_note: string;
  key_patterns: string[];
  [key: string]: unknown;
}

// ── YAML Helpers ─────────────────────────────────────────────

function parseSourcesFromYaml(content: string): SourceEntry[] {
  const sources: SourceEntry[] = [];
  const blocks = content.split(/\n  - id: /);

  for (let i = 1; i < blocks.length; i++) {
    const block = "  - id: " + blocks[i];
    const get = (field: string): string => {
      const m = block.match(new RegExp(`${field}:\\s*"?([^"\\n]+)"?`));
      return m ? m[1].trim() : "";
    };
    const getArray = (field: string): string[] => {
      const m = block.match(new RegExp(`${field}:\\s*\\[([^\\]]*)\\]`));
      if (!m) return [];
      return m[1].split(",").map(s => s.trim().replace(/^"|"$/g, "")).filter(Boolean);
    };

    sources.push({
      id: get("id"),
      name: get("name"),
      domain: get("domain"),
      cost: get("cost"),
      cost_note: get("cost_note"),
      key_patterns: getArray("key_patterns"),
    });
  }

  return sources;
}

function maskKey(key: string): string {
  if (key.length <= 8) return "****";
  return key.slice(0, 4) + "..." + key.slice(-4);
}

// ── Core Functions ───────────────────────────────────────────

/**
 * Identify the data source a key belongs to by matching key_patterns
 * from data-sources.yaml. Returns KeyMatch on hit, KeyUnknown otherwise.
 */
export function identifyKeySource(key: string): KeyMatch | KeyUnknown {
  if (!existsSync(DATA_SOURCES_PATH)) {
    return unknownResult(key);
  }

  const content = readFileSync(DATA_SOURCES_PATH, "utf-8");
  const sources = parseSourcesFromYaml(content);

  for (const source of sources) {
    if (!source.key_patterns || source.key_patterns.length === 0) continue;

    for (const pattern of source.key_patterns) {
      if (key.startsWith(pattern)) {
        return {
          source_id: source.id,
          source_name: source.name,
          domain: source.domain,
          cost: source.cost,
          cost_note: source.cost_note,
          matched: true,
        };
      }
    }
  }

  return unknownResult(key);
}

function unknownResult(key: string): KeyUnknown {
  return {
    matched: false,
    key_preview: maskKey(key),
    questions: [
      "What service is this API key for?",
      "What domain? (finance/research/security/content/media/voice/notifications/infrastructure)",
      "Is this a paid service? (paid/freemium/free) and approximate cost?",
      "What does it provide? (comma-separated: stock-quotes, web-search, etc.)",
      "API docs URL?",
    ],
  };
}

/**
 * Append a new source entry to data-sources.yaml.
 * Returns true on success, false on failure.
 */
export function addNewSource(answers: {
  id: string;
  name: string;
  domain: string;
  cost: string;
  cost_note: string;
  key_fields: string[];
  provides: string[];
  docs_url: string;
}): boolean {
  if (!existsSync(DATA_SOURCES_PATH)) return false;

  try {
    const content = readFileSync(DATA_SOURCES_PATH, "utf-8");

    const keyFieldsStr = answers.key_fields.map(f => `"${f}"`).join(", ") || "";
    const providesStr = answers.provides.join(", ");

    const entry = [
      "",
      `  # ═══ AUTO-INDEXED ════════════════════════════════════════`,
      "",
      `  - id: ${answers.id}`,
      `    name: "${answers.name}"`,
      `    domain: ${answers.domain}`,
      `    type: api`,
      `    cost: ${answers.cost}`,
      `    cost_note: "${answers.cost_note}"`,
      `    requires_key: true`,
      `    key_fields: [${keyFieldsStr}]`,
      `    key_patterns: []`,
      `    docs_url: "${answers.docs_url}"`,
      `    manifest_service: ${answers.id}`,
      `    fallback: null`,
      `    used_by: []`,
      `    provides: [${providesStr}]`,
      "",
    ].join("\n");

    writeFileSync(DATA_SOURCES_PATH, content.trimEnd() + "\n" + entry, "utf-8");
    return true;
  } catch {
    return false;
  }
}
