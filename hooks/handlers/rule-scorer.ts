/**
 * rule-scorer.ts — Relevance scoring for rule injection.
 * Replaces basic keyword matching with multi-signal scoring.
 */

import { readFileSync, existsSync, statSync } from "fs";
import { poseidonPath } from "../lib/paths";

export interface ScoredRule {
  ruleText: string;
  score: number;
  matchReasons: string[];
}

interface RuleInput {
  text: string;
  pattern: string;
  errorClass?: string;
}

const TOOL_DOMAINS: Record<string, string[]> = {
  Bash: ["COMMAND_NOT_FOUND", "PERMISSION_DENIED", "TIMEOUT", "FILE_NOT_FOUND", "TOOL_EXECUTION"],
  Read: ["FILE_NOT_FOUND", "PERMISSION_DENIED"],
  Write: ["EDIT_MATCH_FAILED", "PERMISSION_DENIED", "DISK_FULL"],
  Edit: ["EDIT_MATCH_FAILED"],
  WebSearch: ["RATE_LIMITED", "TIMEOUT", "AUTH_FAILURE"],
  WebFetch: ["RATE_LIMITED", "TIMEOUT", "AUTH_FAILURE", "SERVER_ERROR"],
};

const TOOL_KEYWORDS: Record<string, string[]> = {
  Bash: ["bash", "command", "run", "execute", "shell", "script", "git", "npm", "bun"],
  Read: ["read", "file", "open", "load", "path"],
  Write: ["write", "create", "save", "output"],
  Edit: ["edit", "modify", "change", "replace", "update"],
  WebSearch: ["search", "find", "lookup", "google"],
  WebFetch: ["fetch", "download", "url", "api", "http", "curl"],
};

function detectLikelyTools(prompt: string): string[] {
  const lower = prompt.toLowerCase();
  const tools: string[] = [];
  for (const [tool, keywords] of Object.entries(TOOL_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) tools.push(tool);
  }
  return tools.length > 0 ? tools : ["Bash"];
}

function recentlyTriggered(errorClass?: string): boolean {
  if (!errorClass) return false;
  try {
    const logPath = poseidonPath("memory", "learning", "error-log.jsonl");
    if (!existsSync(logPath)) return false;
    const stat = statSync(logPath);
    // If error log was modified in the last hour, recent errors exist
    return Date.now() - stat.mtimeMs < 3600_000;
  } catch { return false; }
}

export function scoreRules(prompt: string, rules: RuleInput[]): ScoredRule[] {
  const likelyTools = detectLikelyTools(prompt);
  const lowerPrompt = prompt.toLowerCase();

  const scored: ScoredRule[] = rules.map((rule) => {
    let score = 0;
    const reasons: string[] = [];

    // Tool match: rule's error domain matches likely tools (+3)
    if (rule.errorClass) {
      for (const tool of likelyTools) {
        if (TOOL_DOMAINS[tool]?.includes(rule.errorClass)) {
          score += 3;
          reasons.push(`tool_match:${tool}`);
          break;
        }
      }
    }

    // Keyword match: rule keywords appear in prompt (+2 each, max 4)
    const keywords = rule.pattern.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean);
    let kwScore = 0;
    for (const kw of keywords) {
      if (lowerPrompt.includes(kw)) { kwScore += 2; reasons.push(`keyword:${kw}`); }
      if (kwScore >= 4) break;
    }
    score += kwScore;

    // Recency: error class was recently triggered (+1)
    if (recentlyTriggered(rule.errorClass)) {
      score += 1;
      reasons.push("recent_trigger");
    }

    return { ruleText: rule.text, score, matchReasons: reasons };
  });

  return scored
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}
