#!/usr/bin/env bun
/**
 * Research Verifier — cross-checks quantitative claims between multiple research agent outputs.
 * Extracts numbers, percentages, dates, and rankings, then compares across agents.
 */

export interface VerificationResult {
  claim: string;
  sources_agree: number;
  sources_disagree: number;
  confidence: "high" | "medium" | "low" | "conflicted";
  details: string;
}

const QUANT_RE = /(?:(?:grew|growth|increased|rose|jumped|surged|fell|dropped|declined|decreased)\s+(?:by\s+)?(\d[\d,.]*%?))|(?:correlation\s+of\s+(-?\d[\d,.]*))|(?:(\d[\d,.]*%?)\s+(?:growth|increase|decline|drop|gain|loss|revenue|market\s+share|margin))|(?:(?:revenue|market\s+cap|valuation|revenue)\s+(?:of\s+)?\$?([\d,.]+\s*[BMTbmt]?))/gi;
const PERCENT_RE = /(\d[\d,.]*)\s*%/g;
const DATE_CLAIM_RE = /\b((?:in|since|by|from)\s+(?:Q[1-4]\s+)?\d{4})\b/gi;

interface RawClaim { agent: string; metric: string; value: string }

function extractClaims(agent: string, content: string): RawClaim[] {
  const claims: RawClaim[] = [];
  for (const m of content.matchAll(QUANT_RE)) {
    const value = (m[1] || m[2] || m[3] || m[4] || "").trim();
    if (!value) continue;
    const start = Math.max(0, m.index! - 60);
    const context = content.slice(start, m.index! + m[0].length + 30).replace(/\n/g, " ").trim();
    claims.push({ agent, metric: context.slice(0, 80), value });
  }
  for (const m of content.matchAll(PERCENT_RE)) {
    const start = Math.max(0, m.index! - 40);
    const context = content.slice(start, m.index! + m[0].length).replace(/\n/g, " ").trim();
    claims.push({ agent, metric: context.slice(0, 80), value: m[0] });
  }
  return claims;
}

function normalizeValue(v: string): string {
  return v.replace(/,/g, "").replace(/\s+/g, "").toLowerCase();
}

function groupByTopic(allClaims: RawClaim[]): Map<string, RawClaim[]> {
  const groups = new Map<string, RawClaim[]>();
  for (const c of allClaims) {
    const keywords = c.metric.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    let matched = false;
    for (const [key, group] of groups) {
      const keyWords = key.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const overlap = keywords.filter(k => keyWords.includes(k)).length;
      if (overlap >= 2 || (keyWords.length > 0 && overlap / keyWords.length > 0.5)) {
        group.push(c);
        matched = true;
        break;
      }
    }
    if (!matched) groups.set(c.metric, [c]);
  }
  return groups;
}

export function verifyCrossAgent(agentResults: { agent: string; content: string }[]): VerificationResult[] {
  const allClaims: RawClaim[] = [];
  for (const { agent, content } of agentResults) allClaims.push(...extractClaims(agent, content));
  if (!allClaims.length) return [];

  const groups = groupByTopic(allClaims);
  const results: VerificationResult[] = [];

  for (const [topic, claims] of groups) {
    if (claims.length < 2) continue;
    const agents = new Set(claims.map(c => c.agent));
    if (agents.size < 2) continue;
    const values = claims.map(c => normalizeValue(c.value));
    const unique = new Set(values);
    const agree = values.length - unique.size + 1;
    const disagree = unique.size - 1;
    const confidence = unique.size === 1 ? "high" : disagree === 1 && agree >= 2 ? "medium" : "conflicted";
    results.push({
      claim: topic,
      sources_agree: agree,
      sources_disagree: disagree,
      confidence,
      details: `Values: ${[...unique].join(", ")} from agents: ${[...agents].join(", ")}`,
    });
  }

  return results.sort((a, b) => {
    const order: Record<string, number> = { conflicted: 0, low: 1, medium: 2, high: 3 };
    return order[a.confidence] - order[b.confidence];
  });
}

if (import.meta.main) {
  const input = await Bun.stdin.text();
  if (!input.trim()) { console.error("Usage: echo '[{\"agent\":\"a\",\"content\":\"...\"}]' | research-verifier.ts"); process.exit(1); }
  console.log(JSON.stringify(verifyCrossAgent(JSON.parse(input)), null, 2));
}
