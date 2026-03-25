/**
 * learning-metrics.ts — Computes the Learning Score and all sub-metrics.
 * Single-pass file reads for performance. All paths from centralized paths.ts.
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { poseidonPath, RULES_DIR, CANDIDATES_DIR, SIGNALS_DIR, LEARNING_DIR } from "../lib/paths";

export interface LearningMetrics {
  learningScore: number;
  err: number;               // Error Recurrence Rate (0 = all recurring, 1 = no recurring)
  rer: number;               // Rule Effectiveness Rate (0-1)
  mtbfHours: number;         // Mean Time Between Failures
  kc: number;                // Knowledge Coverage (0-1)
  lvGen: number;             // Learning Velocity: rules generated this week
  lvVer: number;             // Learning Velocity: rules verified this week
  totalRules: number;
  totalFingerprints: number;
  errorsThisSession: number;
  errorsPrevented: number;
  calibrating: boolean;
}

interface ErrorEntry {
  ts: string;
  fingerprint: string;
  error_class: string;
  session_id: string;
}

function readJsonl<T>(path: string): T[] {
  if (!existsSync(path)) return [];
  try {
    return readFileSync(path, "utf-8")
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l));
  } catch { return []; }
}

function countFiles(dir: string, ext = ".md"): number {
  if (!existsSync(dir)) return 0;
  try { return readdirSync(dir).filter((f) => f.endsWith(ext)).length; } catch { return 0; }
}

function weekAgo(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d;
}

export function computeMetrics(): LearningMetrics {
  const errorLog = poseidonPath("memory", "learning", "error-log.jsonl");
  const metricsLog = poseidonPath("memory", "learning", "metrics.jsonl");
  const ratingsPath = poseidonPath("memory", "learning", "signals", "ratings.jsonl");

  const errors = readJsonl<ErrorEntry>(errorLog);
  const ratings = readJsonl<{ ts: string }>(ratingsPath);
  const totalRules = countFiles(RULES_DIR());
  const totalCandidates = countFiles(CANDIDATES_DIR());
  const sessionCount = ratings.length;
  const calibrating = sessionCount < 10 || totalRules < 1;

  // Unique fingerprints
  const fingerprints = new Set(errors.map((e) => e.fingerprint));
  const totalFingerprints = fingerprints.size;

  // ERR: Error Recurrence Rate (1 = good, no recurrence)
  // Count fingerprints that appear more than once
  const fpCounts = new Map<string, number>();
  for (const e of errors) fpCounts.set(e.fingerprint, (fpCounts.get(e.fingerprint) || 0) + 1);
  const recurringCount = [...fpCounts.values()].filter((c) => c > 1).length;
  const err = totalFingerprints > 0 ? 1 - (recurringCount / totalFingerprints) : 1;

  // RER: Rule Effectiveness Rate — rules that matched vs total rules
  // Proxy: if we have rules and fewer recurring errors, rules are effective
  const rer = totalRules > 0
    ? Math.min(1, totalRules / Math.max(1, totalFingerprints))
    : 0;

  // MTBF: Mean Time Between Failures (hours)
  let mtbfHours = 0;
  if (errors.length >= 2) {
    const sorted = errors
      .map((e) => new Date(e.ts).getTime())
      .filter((t) => !isNaN(t))
      .sort((a, b) => a - b);
    if (sorted.length >= 2) {
      const totalSpan = sorted[sorted.length - 1] - sorted[0];
      mtbfHours = totalSpan / (sorted.length - 1) / (1000 * 60 * 60);
    }
  }

  // KC: Knowledge Coverage — unique error classes covered by rules / total unique classes
  const errorClasses = new Set(errors.map((e) => e.error_class));
  const kc = errorClasses.size > 0
    ? Math.min(1, totalRules / Math.max(1, errorClasses.size))
    : totalRules > 0 ? 1 : 0;

  // Learning Velocity: rules created/verified this week
  const week = weekAgo();
  let lvGen = 0;
  let lvVer = 0;
  try {
    const candDir = CANDIDATES_DIR();
    if (existsSync(candDir)) {
      for (const f of readdirSync(candDir)) {
        const content = readFileSync(`${candDir}/${f}`, "utf-8");
        const dateMatch = content.match(/created:\s*(\S+)/);
        if (dateMatch && new Date(dateMatch[1]) > week) lvGen++;
      }
    }
    const rulesDir = RULES_DIR();
    if (existsSync(rulesDir)) {
      for (const f of readdirSync(rulesDir)) {
        const content = readFileSync(`${rulesDir}/${f}`, "utf-8");
        const dateMatch = content.match(/verified:\s*(\S+)/);
        if (dateMatch && new Date(dateMatch[1]) > week) lvVer++;
      }
    }
  } catch { /* non-blocking */ }

  // Errors prevented estimate: rules * effectiveness proxy
  const errorsPrevented = Math.round(rer * totalRules * 3);
  const errorsThisSession = errors.filter((e) => {
    const t = new Date(e.ts).getTime();
    return Date.now() - t < 4 * 60 * 60 * 1000; // last 4 hours
  }).length;

  // Normalize MTBF for scoring (cap at 48 hours = 1.0)
  const mtbfNorm = Math.min(1, mtbfHours / 48);

  // Composite Learning Score: 0-100
  const learningScore = calibrating
    ? 0
    : Math.round((30 * err) + (30 * rer) + (20 * kc) + (20 * mtbfNorm));

  // Persist metrics snapshot
  try {
    const entry = { ts: new Date().toISOString(), learningScore, err, rer, kc, mtbfHours };
    const { appendFileSync, mkdirSync } = require("fs");
    const dir = LEARNING_DIR();
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    appendFileSync(metricsLog, JSON.stringify(entry) + "\n");
  } catch { /* non-blocking */ }

  return {
    learningScore, err, rer, mtbfHours, kc,
    lvGen, lvVer, totalRules, totalFingerprints,
    errorsThisSession, errorsPrevented, calibrating,
  };
}

export function formatScoreDisplay(metrics: LearningMetrics): string {
  if (metrics.calibrating) {
    const pending = metrics.totalFingerprints > 0 ? `${metrics.totalFingerprints} errors captured` : "no errors yet";
    const rules = metrics.totalRules > 0 ? `${metrics.totalRules} rules` : "0 rules";
    return `Learning: Calibrating... (${pending}, ${rules} active)`;
  }

  const errPct = Math.round((1 - metrics.err) * 100);
  const rerPct = Math.round(metrics.rer * 100);
  const kcPct = Math.round(metrics.kc * 100);

  const lines = [
    `Learning Score: ${metrics.learningScore}/100`,
    `  Errors prevented: ${rerPct}%  |  Rules active: ${metrics.totalRules}  |  Coverage: ${kcPct}%`,
    `  Recurrence: ${errPct}%  |  MTBF: ${metrics.mtbfHours.toFixed(1)}h  |  Fingerprints: ${metrics.totalFingerprints}`,
  ];
  return lines.join("\n");
}
