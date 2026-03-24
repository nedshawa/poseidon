#!/usr/bin/env bun
// pre-prompt.ts — Mode classification and project context per prompt
// TRIGGER: UserPromptSubmit

import { readHookInput } from "./lib/hook-io";
import type { HookInput } from "./lib/hook-io";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { getSettingsPath, poseidonPath, PROJECTS_DIR } from "./lib/paths";
import { getRelevantMistakes } from "./handlers/mistake-injector";

// Mode classification patterns
const MINIMAL_PATTERNS = [
  /^\s*(hi|hello|hey|thanks|thank you|ok|okay|yes|no|sure|got it|nice|cool|great|good|yep|nope|ack)\s*[.!]?\s*$/i,
  /^\s*\d{1,2}\s*$/, // ratings 1-10
  /^\s*(rate|rating):?\s*\d{1,2}\s*$/i,
];

const ALGORITHM_KEYWORDS = [
  "build", "create", "research", "investigate", "design", "refactor",
  "fix", "implement", "deploy", "audit", "analyze", "architect",
  "migrate", "debug", "troubleshoot", "optimize", "write",
];

function classifyMode(prompt: string): "MINIMAL" | "ALGORITHM" | "NATIVE" {
  const trimmed = prompt.trim();

  // MINIMAL: greetings, ratings, single-word acknowledgments
  if (MINIMAL_PATTERNS.some((p) => p.test(trimmed))) return "MINIMAL";
  if (trimmed.split(/\s+/).length <= 2 && trimmed.length < 20) return "MINIMAL";

  // ALGORITHM: complex tasks
  const lower = trimmed.toLowerCase();

  // Multi-sentence or long prompts suggest complexity
  const sentences = trimmed.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  if (sentences.length >= 3) return "ALGORITHM";

  // References to files/code
  if (/\.(ts|js|py|yaml|json|md|rs|go|sh)\b/.test(lower)) return "ALGORITHM";
  if (/```/.test(trimmed)) return "ALGORITHM";

  // Algorithm keywords
  if (ALGORITHM_KEYWORDS.some((kw) => lower.includes(kw))) return "ALGORITHM";

  // Everything else
  return "NATIVE";
}

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

async function main() {
  try {
    const input = await readHookInput();
    const prompt = input.prompt || "";

    if (!prompt.trim()) return;

    const mode = classifyMode(prompt);
    const parts: string[] = [`Mode: ${mode}`];

    // Load project context for non-minimal prompts
    if (mode !== "MINIMAL") {
      const project = loadActiveProject();
      if (project?.context) {
        parts.push(`Active Project: ${project.id}\n${project.context}`);
      }

      // Inject relevant past learnings from verified rules
      try {
        const mistakes = getRelevantMistakes(prompt);
        if (mistakes.length > 0) {
          parts.push("Past learnings:\n" + mistakes.map((m) => `- ${m}`).join("\n"));
          console.error(`[pre-prompt] Injected ${mistakes.length} past learning(s)`);
        }
      } catch (err) {
        console.error(`[pre-prompt] Mistake injection error (non-blocking): ${err}`);
      }
    }

    console.log(`<system-reminder>\n${parts.join("\n\n")}\n</system-reminder>`);
    console.error(`[pre-prompt] Classified as ${mode} (${prompt.slice(0, 40)}...)`);
  } catch (err) {
    // Never block prompt processing
    console.error(`[pre-prompt] Error (non-blocking): ${err}`);
  }
}

main();
