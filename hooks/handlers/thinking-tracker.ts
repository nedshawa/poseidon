/**
 * thinking-tracker.ts — Log thinking skill invocations for effectiveness tracking.
 * Appends to memory/learning/signals/thinking-runs.jsonl.
 * Used by post-response.ts to detect when thinking was invoked and log the outcome.
 */

import { appendFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { poseidonPath, SIGNALS_DIR } from "../lib/paths";

export interface ThinkingRun {
  timestamp: string;
  session_id: string;
  mode: string;        // "first-principles", "red-team", "council", etc.
  chained: boolean;    // was this part of a chain?
  chain_modes?: string[];
  project_id?: string;
  prompt_summary: string; // first 80 chars of prompt
}

const THINKING_LOG = () => join(SIGNALS_DIR(), "thinking-runs.jsonl");

const THINKING_MODES = [
  "first-principles", "first principles", "deconstruct", "reconstruct", "challenge assumptions",
  "red-team", "red team", "stress test", "critique", "attack", "devil's advocate",
  "council", "debate", "perspectives", "multiple viewpoints",
  "brainstorm", "creative", "tree of thoughts", "divergent",
  "hypothesis", "experiment", "science", "scientific method",
  "threat model", "world model", "futures", "scenario",
  "iterative depth", "deep exploration", "multi-angle",
];

const MODE_MAP: Record<string, string> = {
  "first-principles": "first-principles", "first principles": "first-principles",
  "deconstruct": "first-principles", "reconstruct": "first-principles",
  "challenge assumptions": "first-principles",
  "red-team": "red-team", "red team": "red-team",
  "stress test": "red-team", "critique": "red-team",
  "attack": "red-team", "devil's advocate": "red-team",
  "council": "council", "debate": "council",
  "perspectives": "council", "multiple viewpoints": "council",
  "brainstorm": "creative", "creative": "creative",
  "tree of thoughts": "creative", "divergent": "creative",
  "hypothesis": "science", "experiment": "science",
  "science": "science", "scientific method": "science",
  "threat model": "world-model", "world model": "world-model",
  "futures": "world-model", "scenario": "world-model",
  "iterative depth": "iterative-depth", "deep exploration": "iterative-depth",
  "multi-angle": "iterative-depth",
};

/** Detect which thinking mode(s) were invoked from the assistant's response text. */
export function detectThinkingMode(responseText: string): string | null {
  const lower = responseText.toLowerCase();
  for (const [trigger, mode] of Object.entries(MODE_MAP)) {
    if (lower.includes(trigger)) return mode;
  }
  return null;
}

/** Detect if a chain was used (multiple modes in sequence). */
export function detectChain(responseText: string): string[] {
  const lower = responseText.toLowerCase();
  const modes = new Set<string>();
  for (const [trigger, mode] of Object.entries(MODE_MAP)) {
    if (lower.includes(trigger)) modes.add(mode);
  }
  return [...modes];
}

/** Log a thinking skill invocation. */
export function logThinkingRun(run: ThinkingRun): void {
  try {
    const dir = SIGNALS_DIR();
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    appendFileSync(THINKING_LOG(), JSON.stringify(run) + "\n");
  } catch {
    // Never block
  }
}

/** Get thinking run counts by mode (for effectiveness analysis). */
export function getThinkingStats(): Record<string, number> {
  const stats: Record<string, number> = {};
  try {
    const content = readFileSync(THINKING_LOG(), "utf-8");
    for (const line of content.split("\n")) {
      if (!line.trim()) continue;
      try {
        const run = JSON.parse(line) as ThinkingRun;
        stats[run.mode] = (stats[run.mode] || 0) + 1;
      } catch {}
    }
  } catch {}
  return stats;
}
