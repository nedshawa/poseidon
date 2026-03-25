#!/usr/bin/env bun

/**
 * Tier Classifier — auto-selects research tier from prompt signals.
 *
 * Scores prompt complexity across five dimensions and maps to a tier.
 * Keyword overrides bypass scoring for explicit depth requests.
 */

type Tier = 1 | 2 | 3 | 4;

interface ClassificationResult {
  tier: Tier;
  score: number;
  reason: string;
  override: boolean;
}

const KEYWORD_OVERRIDES: Array<{ pattern: RegExp; tier: Tier; reason: string }> = [
  { pattern: /\bquick\s+(research|lookup|search)\b/i, tier: 1, reason: "explicit quick request" },
  { pattern: /\bjust\s+(look\s+up|check|find)\b/i, tier: 1, reason: "simple lookup language" },
  { pattern: /\bextensive\s+research\b/i, tier: 3, reason: "explicit extensive request" },
  { pattern: /\bcomprehensive\s+(analysis|research|review)\b/i, tier: 3, reason: "explicit comprehensive request" },
  { pattern: /\bdeep\s+investigation\b/i, tier: 4, reason: "explicit deep investigation" },
  { pattern: /\bmap\s+the\s+(landscape|market|ecosystem)\b/i, tier: 4, reason: "landscape mapping request" },
  { pattern: /\binvestigate\s+everything\b/i, tier: 4, reason: "exhaustive investigation request" },
];

function scoreComplexity(prompt: string): number {
  let score = 0;
  const words = prompt.split(/\s+/).length;

  // Entity count: more named entities suggest more complex research
  const entities = prompt.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || [];
  score += Math.min(entities.length * 4, 20);

  // Temporal scope: date ranges, "history of", "evolution" suggest depth
  if (/\b(history|evolution|timeline|over\s+the\s+years|since\s+\d{4})\b/i.test(prompt)) score += 15;
  if (/\b(recent|latest|current|today)\b/i.test(prompt)) score += 5;

  // Comparison breadth: "vs", "compare", "alternatives" suggest Standard+
  if (/\b(vs\.?|versus|compare|comparison|alternatives|pros\s+and\s+cons)\b/i.test(prompt)) score += 15;

  // Abstraction level: strategic/analytical language suggests depth
  if (/\b(landscape|ecosystem|market\s+map|industry|sector|implications)\b/i.test(prompt)) score += 20;
  if (/\b(strategy|strategic|trade-?offs?|architecture)\b/i.test(prompt)) score += 10;

  // Prompt length as a proxy for complexity
  if (words > 50) score += 10;
  else if (words > 20) score += 5;

  return Math.min(score, 100);
}

export function classifyResearchTier(prompt: string, complexityScore?: number): ClassificationResult {
  // Check keyword overrides first
  for (const override of KEYWORD_OVERRIDES) {
    if (override.pattern.test(prompt)) {
      return { tier: override.tier, score: complexityScore ?? -1, reason: override.reason, override: true };
    }
  }

  const score = complexityScore ?? scoreComplexity(prompt);

  if (score <= 30) return { tier: 1, score, reason: "low complexity score", override: false };
  if (score <= 55) return { tier: 2, score, reason: "moderate complexity score", override: false };
  if (score <= 75) return { tier: 3, score, reason: "high complexity score", override: false };
  return { tier: 4, score, reason: "very high complexity score", override: false };
}

// CLI entry point
if (import.meta.main) {
  const prompt = process.argv.slice(2).join(" ");
  if (!prompt) {
    console.error("Usage: tier-classifier.ts <prompt>");
    process.exit(1);
  }
  const result = classifyResearchTier(prompt);
  console.log(JSON.stringify(result, null, 2));
}
