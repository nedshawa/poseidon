#!/usr/bin/env bun
/**
 * Context Injector — reads existing project knowledge to avoid re-researching known facts.
 * Modifies research prompts with prior context so agents focus on gaps, not known ground.
 */
import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";

const FACT_RE = /^(?:\s*[-*]\s+|\s*\d+[.)]\s+)(.+)/gm;
const TABLE_RE = /^\|(.+)\|$/gm;
const MAX_FACTS = 20;
const MAX_SUMMARY = 5;

function extractFacts(content: string): string[] {
  const facts: string[] = [];
  for (const m of content.matchAll(FACT_RE)) {
    const fact = m[1].trim();
    if (fact.length > 10 && fact.length < 200) facts.push(fact);
  }
  for (const m of content.matchAll(TABLE_RE)) {
    const row = m[1].trim();
    if (row.includes("---")) continue;
    if (row.length > 10) facts.push(row.replace(/\s*\|\s*/g, " | ").trim());
  }
  return facts;
}

function readKnowledgeDir(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const allFacts: string[] = [];
  const files = readdirSync(dir).filter(f => f.endsWith(".md"));
  for (const file of files) {
    try {
      const content = readFileSync(join(dir, file), "utf-8");
      allFacts.push(...extractFacts(content));
    } catch {}
  }
  return allFacts.slice(0, MAX_FACTS);
}

function summarizeFacts(facts: string[]): string[] {
  return facts.slice(0, MAX_SUMMARY).map(f => f.length > 120 ? f.slice(0, 117) + "..." : f);
}

function deriveFocusAreas(originalPrompt: string, knownFacts: string[]): string[] {
  const promptWords = new Set(originalPrompt.toLowerCase().split(/\s+/).filter(w => w.length > 4));
  const knownWords = new Set(knownFacts.join(" ").toLowerCase().split(/\s+/).filter(w => w.length > 4));
  const gaps = [...promptWords].filter(w => !knownWords.has(w));
  return gaps.length > 0 ? [`Focus on uncovered areas: ${gaps.slice(0, 8).join(", ")}`] : ["Deepen existing knowledge with newer sources"];
}

export function injectProjectContext(
  originalPrompt: string,
  projectKnowledgeDir: string
): { modifiedPrompt: string; knownFacts: string[]; focusAreas: string[] } {
  const knownFacts = readKnowledgeDir(projectKnowledgeDir);
  if (!knownFacts.length) return { modifiedPrompt: originalPrompt, knownFacts: [], focusAreas: [] };

  const summary = summarizeFacts(knownFacts);
  const focusAreas = deriveFocusAreas(originalPrompt, knownFacts);

  const contextBlock = [
    "\n\n---",
    "**Prior knowledge (do not re-research these):**",
    ...summary.map(f => `- ${f}`),
    "",
    `**Focus on what we DON'T know:** ${focusAreas.join("; ")}`,
    "---\n",
  ].join("\n");

  return { modifiedPrompt: originalPrompt + contextBlock, knownFacts: summary, focusAreas };
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  if (args.length < 2) { console.error("Usage: context-injector.ts <prompt> <knowledge-dir>"); process.exit(1); }
  console.log(JSON.stringify(injectProjectContext(args[0], args[1]), null, 2));
}
