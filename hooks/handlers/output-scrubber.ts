/**
 * Output Scrubber — Automatically redacts secrets from tool output.
 * Default patterns loaded from settings.json -> security.scrub_patterns.
 * Each pattern maps to a labeled redaction tag for traceability.
 *
 * Usage:
 *   import { scrubSecrets } from "./output-scrubber";
 *   const safe = scrubSecrets(dangerousText);
 */

import { readFileSync } from "fs";
import { getSettingsPath } from "../lib/paths";

// ── Pattern-to-label mapping ───────────────────────────

const PATTERN_LABELS: Record<string, string> = {
  "sk-[a-zA-Z0-9]{20,}": "[REDACTED-OPENAI]",
  "sk-ant-[a-zA-Z0-9\\-]{20,}": "[REDACTED-ANTHROPIC]",
  "ghp_[a-zA-Z0-9]{36}": "[REDACTED-GITHUB]",
  "AKIA[0-9A-Z]{16}": "[REDACTED-AWS]",
  "Bearer [a-zA-Z0-9\\-._~+/]+=*": "[REDACTED-BEARER]",
};

/** Infer a redaction label from a pattern string */
function inferLabel(pattern: string): string {
  if (pattern.startsWith("sk-ant")) return "[REDACTED-ANTHROPIC]";
  if (pattern.startsWith("sk-")) return "[REDACTED-OPENAI]";
  if (pattern.startsWith("ghp_")) return "[REDACTED-GITHUB]";
  if (pattern.startsWith("AKIA")) return "[REDACTED-AWS]";
  if (pattern.startsWith("Bearer")) return "[REDACTED-BEARER]";
  if (pattern.includes("xox")) return "[REDACTED-SLACK]";
  return "[REDACTED]";
}

function loadScrubPatterns(): string[] {
  try {
    const settings = JSON.parse(readFileSync(getSettingsPath(), "utf8"));
    const patterns = settings?.security?.scrub_patterns;
    if (Array.isArray(patterns) && patterns.length > 0) return patterns;
  } catch { /* fall through to defaults */ }
  return Object.keys(PATTERN_LABELS);
}

interface ScrubRule {
  pattern: RegExp;
  label: string;
}

function compileRules(patterns: string[]): ScrubRule[] {
  return patterns.map((p) => ({
    pattern: new RegExp(p, "g"),
    label: PATTERN_LABELS[p] || inferLabel(p),
  }));
}

// ── Public API ─────────────────────────────────────────

/**
 * Scrub secrets from text using regex patterns.
 * @param text - The text to scrub
 * @param patterns - Optional override patterns (regex strings).
 *                   If omitted, reads from settings.json -> security.scrub_patterns.
 * @returns Text with all matched secrets replaced by redaction labels
 */
export function scrubSecrets(text: string, patterns?: string[]): string {
  if (!text) return text;
  const rules = compileRules(patterns || loadScrubPatterns());
  let result = text;
  for (const rule of rules) {
    rule.pattern.lastIndex = 0;
    result = result.replace(rule.pattern, rule.label);
  }
  return result;
}

/**
 * Check if text contains any detectable secrets.
 * @param text - The text to check
 * @param patterns - Optional override patterns
 * @returns true if any secret pattern was found
 */
export function containsSecrets(text: string, patterns?: string[]): boolean {
  if (!text) return false;
  for (const p of (patterns || loadScrubPatterns())) {
    if (new RegExp(p).test(text)) return true;
  }
  return false;
}
