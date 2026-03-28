#!/usr/bin/env bun
/**
 * Research Persistence — auto-saves research results to the active project's knowledge base.
 * Writes timestamped markdown files with synthesized findings, sources, and metadata.
 */
import { mkdirSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

function toKebab(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildMarkdown(topic: string, synthesized: string, sources: string[]): string {
  const lines: string[] = [
    `# Research: ${topic}`,
    "",
    `## Date`,
    todayStamp(),
    "",
    `## Synthesized Findings`,
    "",
    synthesized,
    "",
    `## Sources`,
    "",
    ...sources.map((s, i) => `${i + 1}. ${s}`),
    "",
    `## Metadata`,
    "",
    `- **Generated**: ${new Date().toISOString()}`,
    `- **Topic**: ${topic}`,
    `- **Source count**: ${sources.length}`,
    "",
  ];
  return lines.join("\n");
}

export function persistResearchToProject(
  projectDir: string,
  topic: string,
  synthesizedResults: string,
  sources: string[]
): string {
  const researchDir = join(projectDir, "knowledge", "research");
  if (!existsSync(researchDir)) mkdirSync(researchDir, { recursive: true });

  const filename = `${todayStamp()}_${toKebab(topic)}.md`;
  const filepath = join(researchDir, filename);
  const content = buildMarkdown(topic, synthesizedResults, sources);

  writeFileSync(filepath, content, "utf-8");
  return filepath;
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  if (args.length < 3) { console.error("Usage: research-persistence.ts <project-dir> <topic> <results> [sources...]"); process.exit(1); }
  const [projectDir, topic, results, ...sources] = args;
  const path = persistResearchToProject(projectDir, topic, results, sources);
  console.log(JSON.stringify({ saved: path }, null, 2));
}
