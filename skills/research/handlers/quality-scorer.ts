#!/usr/bin/env bun
/**
 * Quality Scorer — 4-axis heuristic rubric for research output. No LLM call.
 */
interface AxisScore { name: string; score: number; reason: string }
interface QualityResult { pass: boolean; axes: AxisScore[]; total: number; failures: string[]; recommendation: string }

const MIN_SCORE = 6;
const URLS = /https?:\/\/[^\s)<>\]"']+/g;
const HEADINGS = /^#{1,4}\s+.+/gm;
const CROSS_REF = /\b(however|in contrast|similarly|conversely|corroborates|contradicts|compared to|on the other hand)\b/gi;
const INLINE_CITE = /\[.+?\]\(https?:\/\/.+?\)/g;

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

export function scoreResearchQuality(text: string, enforceMinimum = true): QualityResult {
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
  return { pass, axes, total, failures, recommendation };
}

if (import.meta.main) {
  const input = await Bun.stdin.text();
  if (!input.trim()) { console.error("Usage: echo 'research text' | quality-scorer.ts"); process.exit(1); }
  console.log(JSON.stringify(scoreResearchQuality(input), null, 2));
}
