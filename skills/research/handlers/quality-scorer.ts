#!/usr/bin/env bun
/**
 * Quality Scorer — 4-axis heuristic rubric for research output. No LLM call.
 *
 * Scores: completeness, synthesis, citations, clarity (each 0-10, total 0-40).
 * Persists scores to memory/learning/signals/research-quality.jsonl.
 * Provides agent performance history lookups.
 */
import { readFileSync, appendFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";

interface AxisScore { name: string; score: number; reason: string }
interface QualityResult { pass: boolean; axes: AxisScore[]; total: number; failures: string[]; recommendation: string }

interface ScoreRecord {
  timestamp: string;
  topic: string;
  agent_type: string;
  scores: { completeness: number; synthesis: number; citations: number; clarity: number };
  total: number;
}

interface AgentPerformance {
  avg_score: number;
  best_for: string[];
}

const MIN_SCORE = 6;
const URLS = /https?:\/\/[^\s)<>\]"']+/g;
const HEADINGS = /^#{1,4}\s+.+/gm;
const CROSS_REF = /\b(however|in contrast|similarly|conversely|corroborates|contradicts|compared to|on the other hand)\b/gi;
const INLINE_CITE = /\[.+?\]\(https?:\/\/.+?\)/g;

const POSEIDON_ROOT = join(__dirname, "..", "..", "..");
const QUALITY_SIGNALS_PATH = join(
  POSEIDON_ROOT, "memory", "learning", "signals", "research-quality.jsonl"
);

function domains(text: string): number {
  const s = new Set<string>();
  for (const u of text.match(URLS) || []) { try { s.add(new URL(u).hostname); } catch {} }
  return s.size;
}

function scoreCompleteness(t: string): AxisScore {
  const w = t.split(/\s+/).length, h = (t.match(HEADINGS) || []).length;
  let s = (w >= 500 ? 4 : w >= 200 ? 3 : w >= 100 ? 2 : 1) + (h >= 4 ? 3 : h >= 2 ? 2 : 1) + (h >= 6 ? 2 : h >= 3 ? 1 : 0);
  return { name: "explicit_completeness", score: Math.min(s, 10), reason: `${w} words, ${h} sections` };
}

function scoreSynthesis(t: string): AxisScore {
  const w = t.split(/\s+/).length, u = (t.match(URLS) || []).length, cr = (t.match(CROSS_REF) || []).length;
  const ratio = u > 0 ? w / u : w;
  let s = (cr >= 5 ? 4 : cr >= 2 ? 3 : cr >= 1 ? 2 : 1) + (ratio >= 100 ? 3 : ratio >= 50 ? 2 : 1);
  s += /\|.*\|.*\|/m.test(t) || /\b(vs\.?|versus)\b/i.test(t) ? 2 : 1;
  return { name: "synthesis_quality", score: Math.min(s, 10), reason: `${cr} cross-refs, ${ratio.toFixed(0)} words/cite` };
}

function scoreCitation(t: string): AxisScore {
  const u = (t.match(URLS) || []).length, d = domains(t), ic = (t.match(INLINE_CITE) || []).length;
  let s = (u >= 10 ? 4 : u >= 5 ? 3 : u >= 2 ? 2 : 1) + (d >= 6 ? 3 : d >= 3 ? 2 : 1) + (ic >= 3 ? 3 : ic >= 1 ? 2 : 1);
  return { name: "citation_integrity", score: Math.min(s, 10), reason: `${u} citations, ${d} domains` };
}

function scoreClarity(t: string): AxisScore {
  const h = (t.match(HEADINGS) || []).length, b = (t.match(/^[\s]*[-*]\s+/gm) || []).length, w = t.split(/\s+/).length;
  let s = (h >= 4 && b >= 3 ? 4 : h >= 2 ? 3 : 1) + (w >= 200 && w <= 3000 ? 3 : w >= 100 ? 2 : 1);
  s += /\*\*.+?\*\*/m.test(t) ? 2 : 1;
  return { name: "clarity", score: Math.min(s, 10), reason: `${h} headings, ${b} bullets` };
}

// ── Persistence ────────────────────────────────────────────────────

function persistScore(record: ScoreRecord): void {
  try {
    const dir = dirname(QUALITY_SIGNALS_PATH);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    appendFileSync(QUALITY_SIGNALS_PATH, JSON.stringify(record) + "\n");
  } catch (err) {
    console.error("[quality-scorer] Failed to persist score:", err);
  }
}

function readAllRecords(): ScoreRecord[] {
  if (!existsSync(QUALITY_SIGNALS_PATH)) return [];
  const lines = readFileSync(QUALITY_SIGNALS_PATH, "utf-8")
    .split("\n")
    .filter((l) => l.trim().length > 0);
  const records: ScoreRecord[] = [];
  for (const line of lines) {
    try { records.push(JSON.parse(line)); } catch { /* skip malformed */ }
  }
  return records;
}

// ── Core scoring function ──────────────────────────────────────────

export function scoreResearchQuality(
  text: string,
  enforceMinimum = true,
  options?: { topic?: string; agent_type?: string }
): QualityResult {
  const axes = [scoreCompleteness(text), scoreSynthesis(text), scoreCitation(text), scoreClarity(text)];
  const total = axes.reduce((sum, a) => sum + a.score, 0);
  const failures: string[] = [];
  if (enforceMinimum) {
    for (const a of axes.slice(0, 3)) {
      if (a.score < MIN_SCORE) failures.push(`${a.name}: ${a.score}/${MIN_SCORE}`);
    }
  }
  const pass = failures.length === 0;
  const recommendation = pass ? "Quality gate passed." : `Re-research: ${failures.map(f => f.split(":")[0]).join(", ")}`;

  // Persist to JSONL if topic and agent_type provided
  if (options?.topic && options?.agent_type) {
    const record: ScoreRecord = {
      timestamp: new Date().toISOString(),
      topic: options.topic,
      agent_type: options.agent_type,
      scores: {
        completeness: axes[0].score,
        synthesis: axes[1].score,
        citations: axes[2].score,
        clarity: axes[3].score,
      },
      total,
    };
    persistScore(record);
  }

  return { pass, axes, total, failures, recommendation };
}

// ── Agent Performance History ──────────────────────────────────────

/**
 * Read research-quality.jsonl and compute average scores per agent type.
 * Returns the average total score and the topics where this agent scored highest.
 */
export function getAgentPerformanceHistory(agentType: string): AgentPerformance {
  const allRecords = readAllRecords();
  const agentRecords = allRecords.filter((r) => r.agent_type === agentType);

  if (agentRecords.length === 0) {
    return { avg_score: 0, best_for: [] };
  }

  const avg_score =
    agentRecords.reduce((sum, r) => sum + r.total, 0) / agentRecords.length;

  // Find topics where this agent had the highest score vs other agents
  const topicBestAgent = new Map<string, { agent: string; score: number }>();
  for (const r of allRecords) {
    const current = topicBestAgent.get(r.topic);
    if (!current || r.total > current.score) {
      topicBestAgent.set(r.topic, { agent: r.agent_type, score: r.total });
    }
  }

  const best_for: string[] = [];
  for (const [topic, best] of topicBestAgent) {
    if (best.agent === agentType) {
      best_for.push(topic);
    }
  }

  return {
    avg_score: Math.round(avg_score * 100) / 100,
    best_for,
  };
}

// ── CLI entry point ────────────────────────────────────────────────

if (import.meta.main) {
  const args = process.argv.slice(2);
  const topic = args.find((a) => a.startsWith("--topic="))?.split("=")[1];
  const agentType = args.find((a) => a.startsWith("--agent="))?.split("=")[1];

  // If --history flag, show agent performance
  if (args.includes("--history") && agentType) {
    console.log(JSON.stringify(getAgentPerformanceHistory(agentType), null, 2));
    process.exit(0);
  }

  const input = await Bun.stdin.text();
  if (!input.trim()) { console.error("Usage: echo 'research text' | quality-scorer.ts [--topic=X --agent=Y]"); process.exit(1); }
  console.log(JSON.stringify(scoreResearchQuality(input, true, { topic, agent_type: agentType }), null, 2));
}
