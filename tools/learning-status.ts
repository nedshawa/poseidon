#!/usr/bin/env bun
/**
 * learning-status.ts — CLI tool for viewing learning metrics.
 * Usage: bun tools/learning-status.ts
 */

import { computeMetrics, formatScoreDisplay } from "../hooks/handlers/learning-metrics";
import { poseidonPath, RULES_DIR, CANDIDATES_DIR } from "../hooks/lib/paths";
import { readFileSync, readdirSync, existsSync } from "fs";

function main() {
  const metrics = computeMetrics();

  console.log("");
  console.log(formatScoreDisplay(metrics));
  console.log("");

  // Detailed metrics
  if (!metrics.calibrating) {
    const errPct = Math.round((1 - metrics.err) * 100);
    const rerPct = Math.round(metrics.rer * 100);
    const kcPct = Math.round(metrics.kc * 100);

    console.log("Metrics:");
    console.log(`  Error Recurrence Rate:  ${errPct}% (target: <20%)`);
    console.log(`  Rule Effectiveness:     ${rerPct}% (target: >80%)`);
    console.log(`  Knowledge Coverage:     ${kcPct}% (target: >70%)`);
    console.log(`  MTBF:                   ${metrics.mtbfHours.toFixed(1)} hours`);
    console.log("");
  }

  console.log(`Rules: ${metrics.totalRules} active, ${countCandidates()} candidates pending`);
  console.log(`Errors: ${metrics.totalFingerprints} unique fingerprints, ${countTotalErrors()} total captured`);
  console.log(`Velocity: ${metrics.lvGen} candidates generated, ${metrics.lvVer} rules verified (this week)`);
  console.log("");

  // Show recent candidates
  const candidates = getRecentCandidates();
  if (candidates.length > 0) {
    console.log("Recent rule candidates:");
    for (const c of candidates) {
      console.log(`  [pending] ${c}`);
    }
    console.log("");
  }
}

function countCandidates(): number {
  const dir = CANDIDATES_DIR();
  if (!existsSync(dir)) return 0;
  try { return readdirSync(dir).filter((f) => f.endsWith(".md")).length; } catch { return 0; }
}

function countTotalErrors(): number {
  const path = poseidonPath("memory", "learning", "error-log.jsonl");
  if (!existsSync(path)) return 0;
  try {
    return readFileSync(path, "utf-8").split("\n").filter(Boolean).length;
  } catch { return 0; }
}

function getRecentCandidates(): string[] {
  const dir = CANDIDATES_DIR();
  if (!existsSync(dir)) return [];
  try {
    const files = readdirSync(dir)
      .filter((f) => f.endsWith(".md"))
      .sort()
      .reverse()
      .slice(0, 5);
    const summaries: string[] = [];
    for (const file of files) {
      const content = readFileSync(`${dir}/${file}`, "utf-8");
      const patternMatch = content.match(/\*\*Pattern:\*\*\s*(.+)/);
      const ruleMatch = content.match(/\*\*Rule:\*\*\s*(.+)/);
      if (patternMatch) {
        summaries.push(`${patternMatch[1].trim()}${ruleMatch ? " — " + ruleMatch[1].trim() : ""}`);
      }
    }
    return summaries;
  } catch { return []; }
}

main();
