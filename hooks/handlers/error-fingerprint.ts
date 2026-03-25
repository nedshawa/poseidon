/**
 * error-fingerprint.ts — Error classification and fingerprinting.
 * Templatizes error messages and generates stable fingerprints
 * so recurring errors are deduplicated in the error log.
 */

import { createHash } from "crypto";
import { readFileSync } from "fs";
import { SECURITY_DIR } from "../lib/paths";
import { join } from "path";

export interface ErrorSignal {
  tool: string;
  exitCode: number | null;
  errorClass: string;
  message: string;
}

interface PatternEntry {
  pattern: string;
  class: string;
}

interface PatternsConfig {
  patterns: Record<string, PatternEntry[]>;
}

let cachedPatterns: PatternsConfig | null = null;

function loadPatterns(): PatternsConfig {
  if (cachedPatterns) return cachedPatterns;
  try {
    const raw = readFileSync(join(SECURITY_DIR(), "error-patterns.yaml"), "utf-8");
    // Minimal YAML parse — structure is flat enough for regex extraction
    const patterns: Record<string, PatternEntry[]> = {};
    let currentDomain = "";
    for (const line of raw.split("\n")) {
      const domainMatch = line.match(/^  (\w+):$/);
      if (domainMatch) { currentDomain = domainMatch[1]; patterns[currentDomain] = []; continue; }
      const patMatch = line.match(/^\s+- pattern:\s*"(.+)"$/);
      if (patMatch && currentDomain) {
        const entry: Partial<PatternEntry> = { pattern: patMatch[1] };
        // Next line should be class
        patterns[currentDomain].push(entry as PatternEntry);
        continue;
      }
      const classMatch = line.match(/^\s+class:\s*"(.+)"$/);
      if (classMatch && currentDomain && patterns[currentDomain].length > 0) {
        const last = patterns[currentDomain][patterns[currentDomain].length - 1];
        last.class = classMatch[1];
      }
    }
    cachedPatterns = { patterns };
    return cachedPatterns;
  } catch {
    return { patterns: {} };
  }
}

/** Templatize a message by replacing variable parts with placeholders. */
function templatize(msg: string): string {
  return msg
    .replace(/https?:\/\/[^\s"']+/g, "{url}")
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, "{date}")
    .replace(/\b[0-9a-f]{8,}\b/gi, "{hash}")
    .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, "{ip}")
    .replace(/:\d{2,5}\b/g, ":{port}")
    .replace(/\/[\w./-]{4,}/g, "{path}")
    .replace(/\b\d{3,}\b/g, "{num}");
}

/** Generate a stable 16-char hex fingerprint from an error signal. */
export function generateFingerprint(error: ErrorSignal): string {
  const template = templatize(error.message);
  const canonical = `${error.tool}|${error.exitCode ?? "null"}|${error.errorClass}|${template}`;
  return createHash("sha256").update(canonical).digest("hex").slice(0, 16);
}

/** Classify a tool output into an ErrorSignal, or null if no error detected. */
export function classifyError(tool: string, output: string, exitCode?: number | null): ErrorSignal | null {
  if (!output) return null;
  const lower = output.toLowerCase();
  const config = loadPatterns();

  for (const [domain, entries] of Object.entries(config.patterns)) {
    for (const entry of entries) {
      try {
        if (new RegExp(entry.pattern, "i").test(output)) {
          return {
            tool,
            exitCode: exitCode ?? null,
            errorClass: entry.class,
            message: output.slice(0, 500),
          };
        }
      } catch { /* invalid regex, skip */ }
    }
  }

  // Fallback: detect generic errors for Bash with non-zero exit
  if (tool === "Bash" && exitCode && exitCode !== 0) {
    return {
      tool,
      exitCode,
      errorClass: "TOOL_EXECUTION",
      message: output.slice(0, 500),
    };
  }

  return null;
}
