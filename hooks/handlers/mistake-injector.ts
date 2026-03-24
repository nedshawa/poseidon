/**
 * mistake-injector.ts — Scan verified rules and match against prompts.
 * Used by pre-prompt.ts to inject relevant past learnings.
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { RULES_DIR } from "../lib/paths";

interface Rule {
  patterns: string[];
  text: string;
}

function parseRuleFile(filePath: string): Rule | null {
  try {
    const content = readFileSync(filePath, "utf-8");

    // Extract pattern from frontmatter
    const fmMatch = content.match(/---\n([\s\S]*?)\n---/);
    if (!fmMatch) return null;

    const frontmatter = fmMatch[1];
    const patternLine = frontmatter.match(/^pattern:\s*(.+)$/m);
    if (!patternLine) return null;

    // Patterns are comma-separated keywords
    const patterns = patternLine[1]
      .split(",")
      .map((p) => p.trim().toLowerCase())
      .filter(Boolean);

    // Extract rule text from body
    const body = content.slice(content.indexOf("---", 4) + 3).trim();

    // Look for "When doing X, avoid Y because Z" pattern
    const patternMatch = body.match(/\*\*Pattern:\*\*\s*(.+)/);
    const ruleMatch = body.match(/\*\*Rule:\*\*\s*(.+)/);

    if (patternMatch && ruleMatch) {
      return {
        patterns,
        text: `${patternMatch[1].trim()} — ${ruleMatch[1].trim()}`,
      };
    }

    // Fallback: use first non-heading line
    const lines = body.split("\n").filter((l) => l.trim() && !l.startsWith("#"));
    if (lines.length > 0) {
      return { patterns, text: lines[0].trim() };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Scan verified rules and return those matching the prompt via keyword matching.
 */
export function getRelevantMistakes(prompt: string): string[] {
  const rulesDir = RULES_DIR();
  if (!existsSync(rulesDir)) return [];

  let files: string[];
  try {
    files = readdirSync(rulesDir).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }

  if (files.length === 0) return [];

  const lowerPrompt = prompt.toLowerCase();
  const results: string[] = [];

  for (const file of files) {
    const rule = parseRuleFile(join(rulesDir, file));
    if (!rule) continue;

    // Match if any pattern keyword appears in the prompt
    const matches = rule.patterns.some((p) => lowerPrompt.includes(p));
    if (matches) {
      results.push(rule.text);
    }
  }

  return results;
}
