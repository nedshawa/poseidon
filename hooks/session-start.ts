#!/usr/bin/env bun
// session-start.ts — Load context at session start
// TRIGGER: SessionStart

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import {
  getBaseDir,
  getSettingsPath,
  poseidonPath,
  TELOS_DIR,
  STEERING_RULES_PATH,
  PROJECTS_DIR,
} from "./lib/paths";

interface Settings {
  project?: { active_project?: string };
  [key: string]: any;
}

function safeRead(path: string): string | null {
  try {
    if (!existsSync(path)) return null;
    return readFileSync(path, "utf-8");
  } catch {
    return null;
  }
}

function loadSettings(): Settings {
  const raw = safeRead(getSettingsPath());
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function loadTelosFiles(): string {
  const telosDir = TELOS_DIR();
  const files = ["MISSION.md", "GOALS.md", "PROJECTS.md"];
  const sections: string[] = [];

  for (const file of files) {
    const content = safeRead(join(telosDir, file));
    if (content) {
      sections.push(`## ${file.replace(".md", "")}\n${content.trim()}`);
    }
  }

  return sections.length > 0
    ? `# TELOS\n${sections.join("\n\n")}`
    : "";
}

function loadProjectContext(projectId: string): string {
  const projectDir = join(PROJECTS_DIR(), projectId);
  const sections: string[] = [];

  const contextFiles = ["CONTEXT.md", "RULES.md"];
  for (const file of contextFiles) {
    const content = safeRead(join(projectDir, file));
    if (content) {
      sections.push(`## ${file.replace(".md", "")}\n${content.trim()}`);
    }
  }

  return sections.length > 0
    ? `# Active Project: ${projectId}\n${sections.join("\n\n")}`
    : "";
}

function loadSteeringRules(): string {
  const content = safeRead(STEERING_RULES_PATH());
  return content ? `# Steering Rules\n${content.trim()}` : "";
}

try {
  const settings = loadSettings();
  const parts: string[] = [];

  // 1. TELOS
  const telos = loadTelosFiles();
  if (telos) parts.push(telos);

  // 2. Active project
  const activeProject = settings.project?.active_project;
  if (activeProject) {
    const projectCtx = loadProjectContext(activeProject);
    if (projectCtx) parts.push(projectCtx);
  }

  // 3. Steering rules
  const steering = loadSteeringRules();
  if (steering) parts.push(steering);

  // 4. Learning Score
  try {
    const { computeMetrics, formatScoreDisplay } = require("./handlers/learning-metrics");
    const metrics = computeMetrics();
    const scoreDisplay = formatScoreDisplay(metrics);
    if (scoreDisplay) parts.push(`# Learning Intelligence\n${scoreDisplay}`);
  } catch (err) {
    console.error(`[session-start] Learning metrics skipped: ${err}`);
  }

  // 5. Output system-reminder
  if (parts.length > 0) {
    const reminder = parts.join("\n\n---\n\n");
    console.log(`<system-reminder>\n${reminder}\n</system-reminder>`);
  }

  // Log status to stderr
  const loaded: string[] = [];
  if (telos) loaded.push("telos");
  if (activeProject) loaded.push(`project:${activeProject}`);
  if (steering) loaded.push("steering-rules");
  console.error(`[session-start] Loaded: ${loaded.join(", ") || "nothing"} from ${getBaseDir()}`);
} catch (err) {
  // Never block session startup
  console.error(`[session-start] Error (non-blocking): ${err}`);
}
