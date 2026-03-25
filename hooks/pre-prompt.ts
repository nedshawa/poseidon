#!/usr/bin/env bun
// pre-prompt.ts — Complexity scoring, auto-escalation, project context, mistake injection
// TRIGGER: UserPromptSubmit

import { readHookInput } from "./lib/hook-io";
import type { HookInput } from "./lib/hook-io";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { getSettingsPath, poseidonPath, PROJECTS_DIR } from "./lib/paths";
import { scoreComplexity, stripModeFlag } from "./handlers/complexity-scorer";
import type { ComplexityResult } from "./handlers/complexity-scorer";
import { getRelevantMistakes } from "./handlers/mistake-injector";

function loadActiveProject(): { id: string; context: string } | null {
  try {
    const settingsPath = getSettingsPath();
    if (!existsSync(settingsPath)) return null;

    const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    const projectId = settings?.project?.active_project;
    if (!projectId) return null;

    const projectDir = join(PROJECTS_DIR(), projectId);
    const parts: string[] = [];

    for (const file of ["CONTEXT.md", "RULES.md"]) {
      const path = join(projectDir, file);
      if (existsSync(path)) {
        parts.push(readFileSync(path, "utf-8").trim());
      }
    }

    return parts.length > 0
      ? { id: projectId, context: parts.join("\n\n") }
      : { id: projectId, context: "" };
  } catch {
    return null;
  }
}

function formatEscalation(result: ComplexityResult): string {
  if (!result.escalated) return "";
  return `\n⚡ Escalated to Algorithm (complexity: ${result.score}, signals: ${result.signals.join(", ")})`;
}

async function main() {
  try {
    const input = await readHookInput();
    const rawPrompt = input.prompt || "";

    if (!rawPrompt.trim()) return;

    // Strip mode flags before scoring (flags are handled inside scorer)
    const prompt = stripModeFlag(rawPrompt);

    // Load project context to pass to scorer
    const project = loadActiveProject();

    // Score complexity
    const result = scoreComplexity(rawPrompt, {
      activeProject: project?.id ?? undefined,
    });

    const parts: string[] = [
      `Mode: ${result.mode} (score: ${result.score}, signals: [${result.signals.join(", ")}])`,
    ];

    // Escalation notice
    const escalation = formatEscalation(result);
    if (escalation) parts.push(escalation.trim());

    // Load project context for non-minimal prompts
    if (result.mode !== "MINIMAL") {
      if (project?.context) {
        parts.push(`Active Project: ${project.id}\n${project.context}`);
      }

      // Inject relevant past learnings from verified rules
      try {
        const mistakes = getRelevantMistakes(prompt);
        if (mistakes.length > 0) {
          const top5 = mistakes.slice(0, 5);
          parts.push("Past learnings:\n" + top5.map((m) => `- ${m}`).join("\n"));
          console.error(`[pre-prompt] Injected ${top5.length} past learning(s)`);
        }
      } catch (err) {
        console.error(`[pre-prompt] Mistake injection error (non-blocking): ${err}`);
      }
    }

    console.log(`<system-reminder>\n${parts.join("\n\n")}\n</system-reminder>`);
    console.error(`[pre-prompt] ${result.mode} (score: ${result.score}, signals: [${result.signals.join(", ")}]) — ${rawPrompt.slice(0, 40)}...`);
  } catch (err) {
    // Never block prompt processing
    console.error(`[pre-prompt] Error (non-blocking): ${err}`);
  }
}

main();
