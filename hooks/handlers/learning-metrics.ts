/** learning-metrics.ts — Computes the Learning Score and all sub-metrics. */
import { readFileSync, readdirSync, existsSync, appendFileSync, mkdirSync } from "fs";
import { poseidonPath, RULES_DIR, CANDIDATES_DIR, LEARNING_DIR } from "../lib/paths";

export interface LearningMetrics {
  learningScore: number;
  err: number;
  rer: number;
  mtbfHours: number;
  kc: number;
  lvGen: number;
  lvVer: number;
  totalRules: number;
  totalFingerprints: number;
  errorsThisSession: number;
  errorsPrevented: number;
  calibrating: boolean;
}

interface ErrorEntry { ts: string; fingerprint: string; error_class: string; session_id: string; }

function readJsonl<T>(path: string): T[] {
  if (!existsSync(path)) return [];
  try { return readFileSync(path, "utf-8").split("\n").filter(Boolean).map((l) => JSON.parse(l)); }
  catch { return []; }
}

function countFiles(dir: string, ext = ".md"): number {
  if (!existsSync(dir)) return 0;
  try { return readdirSync(dir).filter((f) => f.endsWith(ext)).length; } catch { return 0; }
}

export function computeMetrics(): LearningMetrics {
  const errorLog = poseidonPath("memory", "learning", "error-log.jsonl");
  const metricsLog = poseidonPath("memory", "learning", "metrics.jsonl");
  const ratingsPath = poseidonPath("memory", "learning", "signals", "ratings.jsonl");
  const errors = readJsonl<ErrorEntry>(errorLog);
  const ratings = readJsonl<{ ts: string }>(ratingsPath);
  const totalRules = countFiles(RULES_DIR());
  const calibrating = ratings.length < 10 || totalRules < 1;

  // Unique fingerprints and recurrence
  const fpCounts = new Map<string, number>();
  for (const e of errors) fpCounts.set(e.fingerprint, (fpCounts.get(e.fingerprint) || 0) + 1);
  const totalFingerprints = fpCounts.size;
  const recurringCount = [...fpCounts.values()].filter((c) => c > 1).length;
  const err = totalFingerprints > 0 ? 1 - (recurringCount / totalFingerprints) : 1;

  // RER: Rule Effectiveness Rate
  const rer = totalRules > 0 ? Math.min(1, totalRules / Math.max(1, totalFingerprints)) : 0;

  // MTBF: Mean Time Between Failures (hours)
  let mtbfHours = 0;
  if (errors.length >= 2) {
    const sorted = errors.map((e) => new Date(e.ts).getTime()).filter((t) => !isNaN(t)).sort((a, b) => a - b);
    if (sorted.length >= 2) mtbfHours = (sorted[sorted.length - 1] - sorted[0]) / (sorted.length - 1) / 3_600_000;
  }

  // KC: Knowledge Coverage
  const errorClasses = new Set(errors.map((e) => e.error_class));
  const kc = errorClasses.size > 0 ? Math.min(1, totalRules / Math.max(1, errorClasses.size)) : (totalRules > 0 ? 1 : 0);

  // Learning Velocity: rules created/verified this week
  const week = new Date(); week.setDate(week.getDate() - 7);
  let lvGen = 0, lvVer = 0;
  try {
    const candDir = CANDIDATES_DIR();
    if (existsSync(candDir)) for (const f of readdirSync(candDir)) {
      const m = readFileSync(`${candDir}/${f}`, "utf-8").match(/created:\s*(\S+)/);
      if (m && new Date(m[1]) > week) lvGen++;
    }
    const rulesDir = RULES_DIR();
    if (existsSync(rulesDir)) for (const f of readdirSync(rulesDir)) {
      const m = readFileSync(`${rulesDir}/${f}`, "utf-8").match(/verified:\s*(\S+)/);
      if (m && new Date(m[1]) > week) lvVer++;
    }
  } catch { /* non-blocking */ }

  const errorsPrevented = Math.round(rer * totalRules * 3);
  const errorsThisSession = errors.filter((e) => Date.now() - new Date(e.ts).getTime() < 14_400_000).length;
  const mtbfNorm = Math.min(1, mtbfHours / 48);
  const learningScore = calibrating ? 0 : Math.round((30 * err) + (30 * rer) + (20 * kc) + (20 * mtbfNorm));

  // Persist snapshot
  try {
    const dir = LEARNING_DIR();
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    appendFileSync(metricsLog, JSON.stringify({ ts: new Date().toISOString(), learningScore, err, rer, kc, mtbfHours }) + "\n");
  } catch { /* non-blocking */ }

  return { learningScore, err, rer, mtbfHours, kc, lvGen, lvVer, totalRules, totalFingerprints, errorsThisSession, errorsPrevented, calibrating };
}

export function formatScoreDisplay(metrics: LearningMetrics): string {
  if (metrics.calibrating) {
    const pending = metrics.totalFingerprints > 0 ? `${metrics.totalFingerprints} errors captured` : "no errors yet";
    return `Learning: Calibrating... (${pending}, ${metrics.totalRules} rules active)`;
  }
  const rerPct = Math.round(metrics.rer * 100), kcPct = Math.round(metrics.kc * 100);
  return [
    `Learning Score: ${metrics.learningScore}/100`,
    `  Errors prevented: ${rerPct}%  |  Rules active: ${metrics.totalRules}  |  Coverage: ${kcPct}%`,
    `  Recurrence: ${Math.round((1 - metrics.err) * 100)}%  |  MTBF: ${metrics.mtbfHours.toFixed(1)}h  |  Fingerprints: ${metrics.totalFingerprints}`,
  ].join("\n");
}
