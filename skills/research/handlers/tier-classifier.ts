#!/usr/bin/env bun
/**
 * Tier Classifier — auto-selects research tier from prompt signals.
 * Scores complexity across five dimensions, maps to tier 1-4.
 */
type Tier = 1 | 2 | 3 | 4;
interface ClassificationResult { tier: Tier; score: number; reason: string; override: boolean }

const OVERRIDES: Array<{ pattern: RegExp; tier: Tier; reason: string }> = [
  { pattern: /\bquick\s+(research|lookup|search)\b/i, tier: 1, reason: "explicit quick request" },
  { pattern: /\bjust\s+(look\s+up|check|find)\b/i, tier: 1, reason: "simple lookup language" },
  { pattern: /\bextensive\s+research\b/i, tier: 3, reason: "explicit extensive request" },
  { pattern: /\bcomprehensive\s+(analysis|research|review)\b/i, tier: 3, reason: "explicit comprehensive request" },
  { pattern: /\bdeep\s+investigation\b/i, tier: 4, reason: "explicit deep investigation" },
  { pattern: /\bmap\s+the\s+(landscape|market|ecosystem)\b/i, tier: 4, reason: "landscape mapping request" },
  { pattern: /\binvestigate\s+everything\b/i, tier: 4, reason: "exhaustive investigation request" },
];

function scoreComplexity(prompt: string): number {
  let s = 0;
  const words = prompt.split(/\s+/).length;
  const entities = prompt.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || [];
  s += Math.min(entities.length * 4, 20);
  if (/\b(history|evolution|timeline|over\s+the\s+years|since\s+\d{4})\b/i.test(prompt)) s += 15;
  if (/\b(recent|latest|current|today)\b/i.test(prompt)) s += 5;
  if (/\b(vs\.?|versus|compare|comparison|alternatives|pros\s+and\s+cons)\b/i.test(prompt)) s += 15;
  if (/\b(landscape|ecosystem|market\s+map|industry|sector|implications)\b/i.test(prompt)) s += 20;
  if (/\b(strategy|strategic|trade-?offs?|architecture)\b/i.test(prompt)) s += 10;
  s += words > 50 ? 10 : words > 20 ? 5 : 0;
  return Math.min(s, 100);
}

export function classifyResearchTier(prompt: string, complexityScore?: number): ClassificationResult {
  for (const o of OVERRIDES) {
    if (o.pattern.test(prompt)) return { tier: o.tier, score: complexityScore ?? -1, reason: o.reason, override: true };
  }
  const score = complexityScore ?? scoreComplexity(prompt);
  if (score <= 30) return { tier: 1, score, reason: "low complexity", override: false };
  if (score <= 55) return { tier: 2, score, reason: "moderate complexity", override: false };
  if (score <= 75) return { tier: 3, score, reason: "high complexity", override: false };
  return { tier: 4, score, reason: "very high complexity", override: false };
}

if (import.meta.main) {
  const prompt = process.argv.slice(2).join(" ");
  if (!prompt) { console.error("Usage: tier-classifier.ts <prompt>"); process.exit(1); }
  console.log(JSON.stringify(classifyResearchTier(prompt), null, 2));
}
