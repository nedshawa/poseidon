#!/usr/bin/env bun
/** synthesize-learning.ts — Weekly learning synthesis report generator. */
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from "fs";
import { join, basename } from "path";
import { homedir } from "os";

// ANSI colors
const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bgBlue: "\x1b[44m",
};

function getBaseDir(): string {
  return process.env.POSEIDON_DIR || join(homedir(), ".poseidon");
}

function p(...segments: string[]): string {
  return join(getBaseDir(), ...segments);
}

// --- CLI parsing ---
const args = process.argv.slice(2);
let format: "text" | "json" = "text";
let period: "weekly" | "monthly" = "weekly";

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--help" || args[i] === "-h") {
    console.log(`${C.bold}${C.cyan}Poseidon Learning Synthesis${C.reset}

${C.bold}Usage:${C.reset}
  synthesize-learning [options]

${C.bold}Options:${C.reset}
  --format json|text   Output format (default: text)
  --period weekly|monthly  Synthesis period (default: weekly)
  --help, -h           Show this help message

${C.bold}Reads:${C.reset}
  memory/learning/signals/ratings.jsonl
  memory/learning/signals/algorithm-reflections.jsonl
  memory/learning/failures/*/ERROR_ANALYSIS.md
  memory/learning/rules/*.md

${C.bold}Produces:${C.reset}
  memory/learning/synthesis/{YYYY-MM}/weekly-{YYYY-MM-DD}.md`);
    process.exit(0);
  }
  if (args[i] === "--format" && args[i + 1]) { format = args[++i] as any; }
  if (args[i] === "--period" && args[i + 1]) { period = args[++i] as any; }
}

// --- Data readers ---
interface Rating { ts: string; rating: number; session_id?: string; context?: string; }
interface Reflection { ts: string; capability?: string; outcome?: string; context?: string; }
interface FailureEntry { dir: string; fingerprint: string; category: string; date: string; }

function readJsonl<T>(path: string): T[] {
  if (!existsSync(path)) return [];
  try {
    return readFileSync(path, "utf-8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  } catch { return []; }
}

function readFailures(): FailureEntry[] {
  const failDir = p("memory", "learning", "failures");
  if (!existsSync(failDir)) return [];
  const entries: FailureEntry[] = [];
  try {
    for (const sub of readdirSync(failDir)) {
      const analysisPath = join(failDir, sub, "ERROR_ANALYSIS.md");
      if (!existsSync(analysisPath)) continue;
      const content = readFileSync(analysisPath, "utf-8");
      const fpMatch = content.match(/fingerprint:\s*(\S+)/i);
      const catMatch = content.match(/category:\s*(.+)/i);
      const dateMatch = sub.match(/^(\d{4}-\d{2}-\d{2})/);
      entries.push({
        dir: sub,
        fingerprint: fpMatch?.[1] || "unknown",
        category: catMatch?.[1]?.trim() || "uncategorized",
        date: dateMatch?.[1] || "unknown",
      });
    }
  } catch { /* non-blocking */ }
  return entries;
}

function readRules(): { name: string; created: string; verified: string; preventedClass: string }[] {
  const rulesDir = p("memory", "learning", "rules");
  if (!existsSync(rulesDir)) return [];
  const rules: any[] = [];
  try {
    for (const f of readdirSync(rulesDir).filter((f) => f.endsWith(".md"))) {
      const content = readFileSync(join(rulesDir, f), "utf-8");
      const created = content.match(/created:\s*(\S+)/)?.[1] || "";
      const verified = content.match(/verified:\s*(\S+)/)?.[1] || "";
      const prevents = content.match(/prevents:\s*(.+)/i)?.[1]?.trim() || "";
      rules.push({ name: basename(f, ".md"), created, verified, preventedClass: prevents });
    }
  } catch { /* non-blocking */ }
  return rules;
}

// --- Period filtering ---
const now = new Date();
const daysBack = period === "monthly" ? 30 : 7;
const periodStart = new Date(now);
periodStart.setDate(periodStart.getDate() - daysBack);
const prevPeriodStart = new Date(periodStart);
prevPeriodStart.setDate(prevPeriodStart.getDate() - daysBack);

function inPeriod(ts: string): boolean {
  const d = new Date(ts);
  return d >= periodStart && d <= now;
}

function inPrevPeriod(ts: string): boolean {
  const d = new Date(ts);
  return d >= prevPeriodStart && d < periodStart;
}

// --- Load data ---
const ratings = readJsonl<Rating>(p("memory", "learning", "signals", "ratings.jsonl"));
const reflections = readJsonl<Reflection>(p("memory", "learning", "signals", "algorithm-reflections.jsonl"));
const failures = readFailures();
const rules = readRules();

// --- Compute metrics ---
const thisRatings = ratings.filter((r) => inPeriod(r.ts));
const prevRatings = ratings.filter((r) => inPrevPeriod(r.ts));
const avgThis = thisRatings.length > 0 ? thisRatings.reduce((s, r) => s + r.rating, 0) / thisRatings.length : 0;
const avgPrev = prevRatings.length > 0 ? prevRatings.reduce((s, r) => s + r.rating, 0) / prevRatings.length : 0;
const ratingTrend = avgPrev > 0 ? ((avgThis - avgPrev) / avgPrev * 100).toFixed(1) : "N/A";

// Failure categories by fingerprint frequency
const fpFreq = new Map<string, { count: number; category: string }>();
for (const f of failures) {
  const existing = fpFreq.get(f.fingerprint);
  if (existing) { existing.count++; }
  else { fpFreq.set(f.fingerprint, { count: 1, category: f.category }); }
}
const topFailures = [...fpFreq.entries()]
  .sort((a, b) => b[1].count - a[1].count)
  .slice(0, 10);

// Rule effectiveness
const preventedClasses = new Set(rules.map((r) => r.preventedClass).filter(Boolean));
const failureClasses = new Set(failures.map((f) => f.category));
const classesPrevented = [...failureClasses].filter((c) => preventedClasses.has(c));
const ruleEffectiveness = failureClasses.size > 0
  ? Math.round((classesPrevented.length / failureClasses.size) * 100) : 0;

// Capability usage from reflections
const capUsage = new Map<string, number>();
for (const r of reflections.filter((r) => inPeriod(r.ts))) {
  const cap = r.capability || "general";
  capUsage.set(cap, (capUsage.get(cap) || 0) + 1);
}
const topCapabilities = [...capUsage.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

// Recommendations
const recommendations: string[] = [];
if (avgThis < 4 && thisRatings.length > 0) recommendations.push("Rating average below 4.0 — review recent failures for patterns");
if (topFailures.length > 0 && topFailures[0][1].count > 3) recommendations.push(`Recurring failure "${topFailures[0][1].category}" (${topFailures[0][1].count}x) — create or strengthen rule`);
if (rules.length === 0) recommendations.push("No rules defined yet — start codifying learnings from failures");
if (ruleEffectiveness < 50 && rules.length > 0) recommendations.push("Rule coverage below 50% — expand rules to cover more failure categories");
if (reflections.filter((r) => inPeriod(r.ts)).length === 0) recommendations.push("No reflections this period — enable algorithm reflection logging");
if (thisRatings.length < 5) recommendations.push("Low rating sample size — more data needed for reliable trends");

// --- Build synthesis report ---
interface SynthesisReport {
  period: string;
  generated: string;
  ratingTrend: { thisAvg: number; prevAvg: number; change: string; thisCount: number; prevCount: number };
  topFailures: { fingerprint: string; category: string; count: number }[];
  ruleEffectiveness: { totalRules: number; classesCovered: number; totalClasses: number; pct: number };
  capabilities: { name: string; count: number }[];
  recommendations: string[];
}

const report: SynthesisReport = {
  period: `${period} ending ${now.toISOString().slice(0, 10)}`,
  generated: now.toISOString(),
  ratingTrend: { thisAvg: +avgThis.toFixed(2), prevAvg: +avgPrev.toFixed(2), change: `${ratingTrend}%`, thisCount: thisRatings.length, prevCount: prevRatings.length },
  topFailures: topFailures.map(([fp, v]) => ({ fingerprint: fp, category: v.category, count: v.count })),
  ruleEffectiveness: { totalRules: rules.length, classesCovered: classesPrevented.length, totalClasses: failureClasses.size, pct: ruleEffectiveness },
  capabilities: topCapabilities.map(([name, count]) => ({ name, count })),
  recommendations,
};

// --- Output ---
const dateStr = now.toISOString().slice(0, 10);
const monthStr = now.toISOString().slice(0, 7);
const synthDir = p("memory", "learning", "synthesis", monthStr);
mkdirSync(synthDir, { recursive: true });

if (format === "json") {
  const outPath = join(synthDir, `${period}-${dateStr}.json`);
  writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
  console.log(`\n${C.dim}Written to: ${outPath}${C.reset}`);
} else {
  const trendArrow = avgThis > avgPrev ? `${C.green}▲` : avgThis < avgPrev ? `${C.red}▼` : `${C.yellow}→`;
  const lines: string[] = [
    `${C.bgBlue}${C.white}${C.bold} POSEIDON LEARNING SYNTHESIS ${C.reset}`,
    `${C.dim}Period: ${report.period} | Generated: ${dateStr}${C.reset}`,
    "",
    `${C.bold}${C.cyan}━━ Rating Trend ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C.reset}`,
    `  This ${period}:  ${C.bold}${avgThis.toFixed(2)}${C.reset} avg (${thisRatings.length} ratings)`,
    `  Previous:     ${C.bold}${avgPrev.toFixed(2)}${C.reset} avg (${prevRatings.length} ratings)`,
    `  Trend:        ${trendArrow} ${ratingTrend}%${C.reset}`,
    "",
    `${C.bold}${C.red}━━ Top Failure Categories ━━━━━━━━━━━━━━━━━━━━━━━${C.reset}`,
  ];

  if (topFailures.length === 0) {
    lines.push(`  ${C.green}No failures recorded${C.reset}`);
  } else {
    for (const [fp, v] of topFailures) {
      const bar = "█".repeat(Math.min(v.count, 20));
      lines.push(`  ${C.yellow}${fp.slice(0, 8)}${C.reset}  ${bar} ${v.count}x  ${C.dim}${v.category}${C.reset}`);
    }
  }

  lines.push("", `${C.bold}${C.green}━━ Rule Effectiveness ━━━━━━━━━━━━━━━━━━━━━━━━━━━${C.reset}`);
  lines.push(`  Rules active:     ${C.bold}${rules.length}${C.reset}`);
  lines.push(`  Classes covered:  ${C.bold}${classesPrevented.length}${C.reset} / ${failureClasses.size}`);
  lines.push(`  Effectiveness:    ${C.bold}${ruleEffectiveness}%${C.reset}`);

  lines.push("", `${C.bold}${C.magenta}━━ Capability Usage ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C.reset}`);
  if (topCapabilities.length === 0) {
    lines.push(`  ${C.dim}No reflections this period${C.reset}`);
  } else {
    for (const [name, count] of topCapabilities) {
      lines.push(`  ${C.cyan}${name}${C.reset}: ${count} uses`);
    }
  }

  lines.push("", `${C.bold}${C.yellow}━━ Recommendations ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C.reset}`);
  if (recommendations.length === 0) {
    lines.push(`  ${C.green}All metrics healthy${C.reset}`);
  } else {
    for (const r of recommendations) {
      lines.push(`  ${C.yellow}→${C.reset} ${r}`);
    }
  }
  lines.push("");

  const textOutput = lines.join("\n");
  console.log(textOutput);

  // Write markdown version (strip ANSI for file)
  const mdLines: string[] = [
    `# Learning Synthesis — ${report.period}`,
    `Generated: ${report.generated}`,
    "",
    "## Rating Trend",
    `- This ${period}: **${avgThis.toFixed(2)}** avg (${thisRatings.length} ratings)`,
    `- Previous: **${avgPrev.toFixed(2)}** avg (${prevRatings.length} ratings)`,
    `- Change: ${ratingTrend}%`,
    "",
    "## Top Failure Categories",
  ];

  if (topFailures.length === 0) {
    mdLines.push("- No failures recorded");
  } else {
    for (const [fp, v] of topFailures) {
      mdLines.push(`- \`${fp.slice(0, 8)}\` — ${v.category} (${v.count}x)`);
    }
  }

  mdLines.push("", "## Rule Effectiveness");
  mdLines.push(`- Rules active: ${rules.length}`);
  mdLines.push(`- Classes covered: ${classesPrevented.length} / ${failureClasses.size}`);
  mdLines.push(`- Effectiveness: ${ruleEffectiveness}%`);

  mdLines.push("", "## Capability Usage");
  if (topCapabilities.length === 0) {
    mdLines.push("- No reflections this period");
  } else {
    for (const [name, count] of topCapabilities) {
      mdLines.push(`- ${name}: ${count} uses`);
    }
  }

  mdLines.push("", "## Recommendations");
  if (recommendations.length === 0) {
    mdLines.push("- All metrics healthy");
  } else {
    for (const r of recommendations) {
      mdLines.push(`- ${r}`);
    }
  }
  mdLines.push("");

  const outPath = join(synthDir, `${period}-${dateStr}.md`);
  writeFileSync(outPath, mdLines.join("\n"));
  console.log(`${C.dim}Written to: ${outPath}${C.reset}`);
}
