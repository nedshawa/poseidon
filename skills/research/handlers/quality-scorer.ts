#!/usr/bin/env bun

/**
 * Quality Scorer — 4-axis rubric scoring for research output.
 *
 * Uses heuristic analysis (word count, citation count, source diversity,
 * structural checks) to score research quality. No LLM call required.
 */

interface AxisScore {
  name: string;
  score: number;
  reason: string;
}

interface QualityResult {
  pass: boolean;
  axes: AxisScore[];
  total: number;
  failures: string[];
  recommendation: string;
}

const MIN_SCORE = 6;
const URL_PATTERN = /https?:\/\/[^\s)<>\]"']+/g;
const HEADING_PATTERN = /^#{1,4}\s+.+/gm;

function extractDomains(text: string): Set<string> {
  const urls = text.match(URL_PATTERN) || [];
  const domains = new Set<string>();
  for (const url of urls) {
    try {
      domains.add(new URL(url).hostname);
    } catch { /* skip malformed */ }
  }
  return domains;
}

function scoreCompleteness(text: string): AxisScore {
  const words = text.split(/\s+/).length;
  const headings = (text.match(HEADING_PATTERN) || []).length;
  let score = 0;

  if (words >= 500) score += 4;
  else if (words >= 200) score += 3;
  else if (words >= 100) score += 2;
  else score += 1;

  if (headings >= 4) score += 3;
  else if (headings >= 2) score += 2;
  else score += 1;

  // Bonus for having multiple distinct sections
  if (headings >= 6) score += 2;
  else if (headings >= 3) score += 1;

  score = Math.min(score, 10);
  return { name: "explicit_completeness", score, reason: `${words} words, ${headings} sections` };
}

function scoreSynthesis(text: string): AxisScore {
  let score = 0;
  const words = text.split(/\s+/).length;
  const urls = (text.match(URL_PATTERN) || []).length;

  // Cross-references: mentions of "however", "in contrast", "similarly", "corroborates"
  const crossRefTerms = /\b(however|in contrast|similarly|conversely|corroborates|aligns with|contradicts|compared to|on the other hand|building on)\b/gi;
  const crossRefs = (text.match(crossRefTerms) || []).length;

  if (crossRefs >= 5) score += 4;
  else if (crossRefs >= 2) score += 3;
  else if (crossRefs >= 1) score += 2;
  else score += 1;

  // Ratio of analysis to raw citation (higher words-per-url = more synthesis)
  const ratio = urls > 0 ? words / urls : words;
  if (ratio >= 100) score += 3;
  else if (ratio >= 50) score += 2;
  else score += 1;

  // Presence of comparative structures (tables, vs, comparison)
  if (/\|.*\|.*\|/m.test(text) || /\b(vs\.?|versus|compared)\b/i.test(text)) score += 2;
  else score += 1;

  score = Math.min(score, 10);
  return { name: "synthesis_quality", score, reason: `${crossRefs} cross-references, ${ratio.toFixed(0)} words/citation` };
}

function scoreCitationIntegrity(text: string): AxisScore {
  const urls = (text.match(URL_PATTERN) || []).length;
  const domains = extractDomains(text);
  let score = 0;

  // Citation count
  if (urls >= 10) score += 4;
  else if (urls >= 5) score += 3;
  else if (urls >= 2) score += 2;
  else score += 1;

  // Source diversity (unique domains)
  if (domains.size >= 6) score += 3;
  else if (domains.size >= 3) score += 2;
  else score += 1;

  // Inline citation style (URLs embedded in text, not just a list at the end)
  const inlinePattern = /\[.+?\]\(https?:\/\/.+?\)/g;
  const inlineCitations = (text.match(inlinePattern) || []).length;
  if (inlineCitations >= 3) score += 3;
  else if (inlineCitations >= 1) score += 2;
  else score += 1;

  score = Math.min(score, 10);
  return { name: "citation_integrity", score, reason: `${urls} citations from ${domains.size} domains` };
}

function scoreClarity(text: string): AxisScore {
  const headings = (text.match(HEADING_PATTERN) || []).length;
  const bullets = (text.match(/^[\s]*[-*]\s+/gm) || []).length;
  const words = text.split(/\s+/).length;
  let score = 0;

  // Structure: headings and bullets indicate organized output
  if (headings >= 4 && bullets >= 3) score += 4;
  else if (headings >= 2) score += 3;
  else score += 1;

  // Conciseness: not too sparse, not too bloated
  if (words >= 200 && words <= 3000) score += 3;
  else if (words >= 100) score += 2;
  else score += 1;

  // Scanability: presence of bold, tables, or structured data
  if (/\*\*.+?\*\*/m.test(text)) score += 2;
  else score += 1;

  if (/\|.*\|.*\|/m.test(text)) score += 1;

  score = Math.min(score, 10);
  return { name: "clarity", score, reason: `${headings} headings, ${bullets} bullets` };
}

export function scoreResearchQuality(text: string, enforceMinimum = true): QualityResult {
  const axes = [
    scoreCompleteness(text),
    scoreSynthesis(text),
    scoreCitationIntegrity(text),
    scoreClarity(text),
  ];

  const total = axes.reduce((sum, a) => sum + a.score, 0);
  const failures: string[] = [];

  if (enforceMinimum) {
    for (const axis of axes.slice(0, 3)) {
      if (axis.score < MIN_SCORE) {
        failures.push(`${axis.name}: ${axis.score}/${MIN_SCORE} — ${axis.reason}`);
      }
    }
  }

  const pass = failures.length === 0;
  const recommendation = pass
    ? "Quality gate passed."
    : `Re-research needed: ${failures.map((f) => f.split(":")[0]).join(", ")}`;

  return { pass, axes, total, failures, recommendation };
}

// CLI entry point: reads research text from stdin
if (import.meta.main) {
  const input = await Bun.stdin.text();
  if (!input.trim()) {
    console.error("Usage: echo 'research output' | quality-scorer.ts");
    process.exit(1);
  }
  const result = scoreResearchQuality(input);
  console.log(JSON.stringify(result, null, 2));
}
