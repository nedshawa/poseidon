#!/usr/bin/env bun
/**
 * mine-reflections.ts - Extract patterns from algorithm reflections
 *
 * Usage:
 *   bun tools/mine-reflections.ts [options]
 *
 * Options:
 *   --format json|text   Output format (default: text)
 *   --min-count N        Minimum pattern occurrences to report (default: 2)
 *   --effort TIER        Filter by effort level
 *   --since DATE         Only reflections after this date (ISO format)
 *   --help               Show this help
 *
 * @author Poseidon System
 * @version 1.0.0
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";

interface Reflection {
  timestamp: string;
  effort_level: string;
  task_description: string;
  criteria_count: number;
  criteria_passed: number;
  criteria_failed: number;
  prd_id: string;
  implied_sentiment: number;
  reflection_q1: string; // What should I have done differently?
  reflection_q2: string; // What would a smarter algorithm have done?
  reflection_q3: string; // What capabilities should I have used?
  reflection_q4?: string; // What would a smarter AI have designed?
  within_budget: boolean;
}

interface Pattern {
  theme: string;
  occurrences: number;
  examples: string[];
  effort_levels: string[];
  avg_sentiment: number;
}

function findReflectionsFile(): string | null {
  const candidates = [
    join(process.cwd(), "memory/learning/signals/algorithm-reflections.jsonl"),
    join(process.env.HOME || "", ".poseidon/memory/learning/signals/algorithm-reflections.jsonl"),
    join(process.env.HOME || "", "poseidon/memory/learning/signals/algorithm-reflections.jsonl"),
  ];
  for (const path of candidates) {
    if (existsSync(path)) return path;
  }
  return null;
}

function loadReflections(path: string, filters: { effort?: string; since?: string }): Reflection[] {
  const lines = readFileSync(path, "utf-8").trim().split("\n").filter(Boolean);
  let reflections: Reflection[] = [];

  for (const line of lines) {
    try {
      const r = JSON.parse(line) as Reflection;
      if (filters.effort && r.effort_level !== filters.effort) continue;
      if (filters.since && r.timestamp < filters.since) continue;
      reflections.push(r);
    } catch {
      // skip malformed lines
    }
  }
  return reflections;
}

function extractThemes(text: string): string[] {
  const themes: string[] = [];
  const lower = text.toLowerCase();

  // Common pattern categories
  const patterns: [string, RegExp][] = [
    ["research-depth", /research|agent.*research|parallel.*research|multi.*agent/],
    ["capability-underuse", /capability|skill|should have (used|invoked|called)/],
    ["phantom-capability", /phantom|never (invoked|called)|text-only/],
    ["context-management", /context|compaction|compress|bloat|rot/],
    ["classification", /classif|mode|effort|tier|under.*classif|over.*classif/],
    ["verification", /verif|check|test|confirm|validate/],
    ["parallelization", /parallel|concurrent|background|simultaneous/],
    ["thinking-depth", /first.?principles|council|red.?team|think/],
    ["time-management", /time|budget|slow|fast|SLA|deadline/],
    ["scope-creep", /scope|minimal|extra|unnecessary|beyond/],
  ];

  for (const [theme, regex] of patterns) {
    if (regex.test(lower)) themes.push(theme);
  }
  return themes.length > 0 ? themes : ["uncategorized"];
}

function minePatterns(reflections: Reflection[], minCount: number): Pattern[] {
  const themeMap = new Map<string, { examples: string[]; efforts: string[]; sentiments: number[] }>();

  for (const r of reflections) {
    const allText = [r.reflection_q1, r.reflection_q2, r.reflection_q3, r.reflection_q4 || ""].join(" ");
    const themes = extractThemes(allText);

    for (const theme of themes) {
      if (!themeMap.has(theme)) {
        themeMap.set(theme, { examples: [], efforts: [], sentiments: [] });
      }
      const entry = themeMap.get(theme)!;
      // Use q1 (what should have been different) as the primary example
      if (r.reflection_q1 && !entry.examples.includes(r.reflection_q1)) {
        entry.examples.push(r.reflection_q1);
      }
      if (!entry.efforts.includes(r.effort_level)) {
        entry.efforts.push(r.effort_level);
      }
      entry.sentiments.push(r.implied_sentiment);
    }
  }

  const patterns: Pattern[] = [];
  for (const [theme, data] of themeMap) {
    if (data.examples.length >= minCount) {
      patterns.push({
        theme,
        occurrences: data.examples.length,
        examples: data.examples.slice(0, 5),
        effort_levels: data.efforts,
        avg_sentiment: data.sentiments.reduce((a, b) => a + b, 0) / data.sentiments.length,
      });
    }
  }

  return patterns.sort((a, b) => b.occurrences - a.occurrences);
}

function generateRecommendations(patterns: Pattern[], reflections: Reflection[]): string[] {
  const recs: string[] = [];

  // Overall stats
  const avgSentiment = reflections.reduce((a, r) => a + r.implied_sentiment, 0) / reflections.length;
  const budgetRate = reflections.filter((r) => r.within_budget).length / reflections.length;
  const passRate =
    reflections.reduce((a, r) => a + r.criteria_passed, 0) /
    reflections.reduce((a, r) => a + r.criteria_count, 0);

  if (avgSentiment < 7) {
    recs.push(`Average sentiment is ${avgSentiment.toFixed(1)}/10 — investigate what's causing dissatisfaction`);
  }
  if (budgetRate < 0.8) {
    recs.push(
      `Only ${(budgetRate * 100).toFixed(0)}% of sessions finish within budget — consider adjusting effort tier thresholds`
    );
  }
  if (passRate < 0.9) {
    recs.push(
      `ISC pass rate is ${(passRate * 100).toFixed(0)}% — criteria may be too ambitious or verification too strict`
    );
  }

  // Pattern-specific recommendations
  for (const p of patterns) {
    switch (p.theme) {
      case "research-depth":
        recs.push(`Research depth is a recurring theme (${p.occurrences}x) — review research tier auto-selection`);
        break;
      case "capability-underuse":
        recs.push(
          `Capabilities are being underused (${p.occurrences}x) — consider expanding capability awareness in OBSERVE`
        );
        break;
      case "phantom-capability":
        recs.push(
          `Phantom capabilities detected (${p.occurrences}x) — enforce invocation obligation more strictly`
        );
        break;
      case "parallelization":
        recs.push(
          `Parallelization opportunities missed (${p.occurrences}x) — default to background agents for independent work`
        );
        break;
      case "thinking-depth":
        recs.push(
          `Thinking depth insufficient (${p.occurrences}x) — increase min capabilities for Extended+ tiers`
        );
        break;
    }
  }

  return recs;
}

// --- Main ---

const args = process.argv.slice(2);

if (args.includes("--help")) {
  console.log(`
${BOLD}mine-reflections${RESET} — Extract patterns from algorithm reflections

${BOLD}Usage:${RESET}
  bun tools/mine-reflections.ts [options]

${BOLD}Options:${RESET}
  --format json|text   Output format (default: text)
  --min-count N        Minimum pattern occurrences (default: 2)
  --effort TIER        Filter by effort level
  --since DATE         Only reflections after this date
  --help               Show this help
`);
  process.exit(0);
}

const formatJson = args.includes("--format") && args[args.indexOf("--format") + 1] === "json";
const minCount = args.includes("--min-count") ? parseInt(args[args.indexOf("--min-count") + 1]) : 2;
const effortFilter = args.includes("--effort") ? args[args.indexOf("--effort") + 1] : undefined;
const sinceFilter = args.includes("--since") ? args[args.indexOf("--since") + 1] : undefined;

const reflectionsPath = findReflectionsFile();
if (!reflectionsPath) {
  console.error(`${RED}No algorithm-reflections.jsonl found.${RESET}`);
  console.error(`${DIM}Expected at: memory/learning/signals/algorithm-reflections.jsonl${RESET}`);
  process.exit(1);
}

const reflections = loadReflections(reflectionsPath, { effort: effortFilter, since: sinceFilter });
if (reflections.length === 0) {
  console.log(`${YELLOW}No reflections found matching filters.${RESET}`);
  process.exit(0);
}

const patterns = minePatterns(reflections, minCount);
const recommendations = generateRecommendations(patterns, reflections);

if (formatJson) {
  console.log(
    JSON.stringify(
      {
        total_reflections: reflections.length,
        patterns,
        recommendations,
        stats: {
          avg_sentiment: (reflections.reduce((a, r) => a + r.implied_sentiment, 0) / reflections.length).toFixed(1),
          budget_rate: (
            (reflections.filter((r) => r.within_budget).length / reflections.length) *
            100
          ).toFixed(0),
          pass_rate: (
            (reflections.reduce((a, r) => a + r.criteria_passed, 0) /
              reflections.reduce((a, r) => a + r.criteria_count, 0)) *
            100
          ).toFixed(0),
        },
      },
      null,
      2
    )
  );
} else {
  console.log(`\n${BOLD}${CYAN}═══ Algorithm Reflection Mining ═══${RESET}`);
  console.log(`${DIM}Source: ${reflectionsPath}${RESET}`);
  console.log(`${DIM}Reflections analyzed: ${reflections.length}${RESET}\n`);

  // Stats
  const avgSent = (reflections.reduce((a, r) => a + r.implied_sentiment, 0) / reflections.length).toFixed(1);
  const budgetPct = ((reflections.filter((r) => r.within_budget).length / reflections.length) * 100).toFixed(0);
  const totalCriteria = reflections.reduce((a, r) => a + r.criteria_count, 0);
  const totalPassed = reflections.reduce((a, r) => a + r.criteria_passed, 0);
  const passPct = ((totalPassed / totalCriteria) * 100).toFixed(0);

  console.log(`  ${BOLD}Stats:${RESET}`);
  console.log(`    Avg Sentiment: ${avgSent}/10`);
  console.log(`    Budget Rate:   ${budgetPct}%`);
  console.log(`    ISC Pass Rate: ${passPct}% (${totalPassed}/${totalCriteria})`);

  if (patterns.length > 0) {
    console.log(`\n  ${BOLD}Patterns Found:${RESET}`);
    for (const p of patterns) {
      const sentColor = p.avg_sentiment >= 7 ? GREEN : p.avg_sentiment >= 5 ? YELLOW : RED;
      console.log(`\n    ${CYAN}${p.theme}${RESET} (${p.occurrences}x, sentiment: ${sentColor}${p.avg_sentiment.toFixed(1)}${RESET})`);
      console.log(`    ${DIM}Effort levels: ${p.effort_levels.join(", ")}${RESET}`);
      for (const ex of p.examples.slice(0, 3)) {
        console.log(`      • ${ex.substring(0, 100)}${ex.length > 100 ? "..." : ""}`);
      }
    }
  } else {
    console.log(`\n  ${YELLOW}No recurring patterns found (min count: ${minCount}).${RESET}`);
  }

  if (recommendations.length > 0) {
    console.log(`\n  ${BOLD}Recommendations:${RESET}`);
    for (const rec of recommendations) {
      console.log(`    ${GREEN}→${RESET} ${rec}`);
    }
  }

  console.log();
}
