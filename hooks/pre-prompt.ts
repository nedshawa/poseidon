#!/usr/bin/env bun
// pre-prompt.ts — Complexity scoring, auto-escalation, project context, mistake injection, project switching
// TRIGGER: UserPromptSubmit
import { readHookInput } from "./lib/hook-io";
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { getSettingsPath, PROJECTS_DIR } from "./lib/paths";
import { scoreComplexity, stripModeFlag } from "./handlers/complexity-scorer";
import type { ComplexityResult } from "./handlers/complexity-scorer";
import { getRelevantMistakes } from "./handlers/mistake-injector";

function loadSettings(): any {
  try { const p = getSettingsPath(); return existsSync(p) ? JSON.parse(readFileSync(p, "utf-8")) : {}; } catch { return {}; }
}
function saveSettings(s: any): void {
  try { writeFileSync(getSettingsPath(), JSON.stringify(s, null, 2) + "\n"); } catch {}
}
function updateMetaLastUsed(slug: string): void {
  try {
    const p = join(PROJECTS_DIR(), slug, "META.yaml");
    if (!existsSync(p)) return;
    let raw = readFileSync(p, "utf-8");
    const now = new Date().toISOString();
    raw = raw.match(/^last_used:/m) ? raw.replace(/^last_used:.*$/m, `last_used: "${now}"`) : raw.trimEnd() + `\nlast_used: "${now}"\n`;
    writeFileSync(p, raw);
  } catch {}
}
function loadProjectContext(id: string): string {
  try {
    const dir = join(PROJECTS_DIR(), id);
    const parts: string[] = [];
    for (const f of ["CONTEXT.md", "RULES.md"]) { const p = join(dir, f); if (existsSync(p)) parts.push(readFileSync(p, "utf-8").trim()); }
    return parts.join("\n\n");
  } catch { return ""; }
}
function getSortedProjects(): string[] {
  try {
    const dir = PROJECTS_DIR();
    if (!existsSync(dir)) return [];
    const entries: { slug: string; t: number }[] = [];
    for (const slug of readdirSync(dir)) {
      if (slug === ".template" || slug.startsWith(".")) continue;
      const d = join(dir, slug);
      try { if (!statSync(d).isDirectory()) continue; } catch { continue; }
      let t = 0;
      try {
        const meta = readFileSync(join(d, "META.yaml"), "utf-8");
        const s = meta.match(/status:\s*(\S+)/);
        if (s && (s[1] === "archived" || s[1] === "complete")) continue;
        const lu = meta.match(/last_used:\s*"?([^"\n]*)"?/);
        if (lu) t = new Date(lu[1]).getTime() || 0;
        if (!t) { const c = meta.match(/created:\s*"?([^"\n]*)"?/); if (c) t = new Date(c[1]).getTime() || 0; }
      } catch {}
      entries.push({ slug, t });
    }
    return entries.sort((a, b) => b.t - a.t).map((e) => e.slug);
  } catch { return []; }
}
function detectSwitch(prompt: string): string | null {
  const flag = prompt.match(/^--project\s+(\S+)/);
  if (flag) return flag[1];
  const sw = prompt.match(/switch\s+(?:to\s+)?project\s+(\S+)/i);
  if (sw) return sw[1];
  const num = prompt.trim().match(/^(\d+)$/);
  if (num) { const idx = parseInt(num[1]) - 1; const sorted = getSortedProjects(); return idx >= 0 && idx < sorted.length ? sorted[idx] : null; }
  return null;
}
function loadActiveProject(): { id: string; context: string } | null {
  try {
    const s = loadSettings();
    const id = s?.project?.active_project;
    return id ? { id, context: loadProjectContext(id) } : null;
  } catch { return null; }
}
function formatEscalation(r: ComplexityResult): string {
  return r.escalated ? `\n\u26a1 Escalated to Algorithm (complexity: ${r.score}, signals: ${r.signals.join(", ")})` : "";
}

async function main() {
  try {
    const input = await readHookInput();
    const rawPrompt = input.prompt || "";
    if (!rawPrompt.trim()) return;
    const parts: string[] = [];
    // Check for project switch
    const switchTo = detectSwitch(rawPrompt);
    if (switchTo) {
      const projDir = join(PROJECTS_DIR(), switchTo);
      if (existsSync(projDir)) {
        const settings = loadSettings();
        if (!settings.project) settings.project = {};
        settings.project.active_project = switchTo;
        saveSettings(settings);
        updateMetaLastUsed(switchTo);
        const ctx = loadProjectContext(switchTo);
        parts.push(`\ud83d\udd04 Switched to project: ${switchTo}`);
        if (ctx) parts.push(`Active Project: ${switchTo}\n${ctx}`);
        console.error(`[pre-prompt] Switched to project: ${switchTo}`);
      } else {
        parts.push(`\u26a0 Project "${switchTo}" not found in memory/projects/`);
        console.error(`[pre-prompt] Project switch failed: ${switchTo} not found`);
      }
    }
    // Strip flags
    let prompt = stripModeFlag(rawPrompt);
    if (switchTo) prompt = prompt.replace(/^--project\s+\S+\s*/, "").trim();
    // Load project context
    const project = switchTo ? { id: switchTo, context: loadProjectContext(switchTo) } : loadActiveProject();
    // Score complexity
    const result = scoreComplexity(rawPrompt, { activeProject: project?.id ?? undefined });
    parts.unshift(`Mode: ${result.mode} (score: ${result.score}, signals: [${result.signals.join(", ")}])`);
    const esc = formatEscalation(result);
    if (esc) parts.push(esc.trim());
    // Project context + mistakes for non-minimal, non-switch
    if (result.mode !== "MINIMAL" && !switchTo) {
      if (project?.context) parts.push(`Active Project: ${project.id}\n${project.context}`);
      try {
        const mistakes = getRelevantMistakes(prompt);
        if (mistakes.length > 0) {
          const top = mistakes.slice(0, 5);
          parts.push("Past learnings:\n" + top.map((m) => `- ${m}`).join("\n"));
          console.error(`[pre-prompt] Injected ${top.length} past learning(s)`);
        }
      } catch (err) { console.error(`[pre-prompt] Mistake injection error (non-blocking): ${err}`); }
    }
    console.log(`<system-reminder>\n${parts.join("\n\n")}\n</system-reminder>`);
    console.error(`[pre-prompt] ${result.mode} (score: ${result.score}, signals: [${result.signals.join(", ")}]) \u2014 ${rawPrompt.slice(0, 40)}...`);
  } catch (err) {
    console.error(`[pre-prompt] Error (non-blocking): ${err}`);
  }
}

main();
