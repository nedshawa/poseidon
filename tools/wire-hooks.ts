#!/usr/bin/env bun
/**
 * wire-hooks.ts — Wire Poseidon hooks into Claude Code's settings.json
 * Usage: bun tools/wire-hooks.ts [--claude-settings ~/.claude/settings.json]
 *
 * Adds Poseidon hooks alongside existing hooks without removing them.
 * Safe to run multiple times — checks for existing Poseidon hooks before adding.
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";

const args = process.argv.slice(2);
const claudeSettingsPath = args.includes("--claude-settings")
  ? args[args.indexOf("--claude-settings") + 1]
  : join(homedir(), ".claude", "settings.json");

const poseidonDir = process.env.POSEIDON_DIR || join(homedir(), ".poseidon");

if (!existsSync(claudeSettingsPath)) {
  console.error(`Claude Code settings not found at ${claudeSettingsPath}`);
  console.error("Run Claude Code at least once to create it, then re-run this script.");
  process.exit(1);
}

// Backup
const backupPath = `${claudeSettingsPath}.bak.${Date.now()}`;
copyFileSync(claudeSettingsPath, backupPath);
console.log(`Backed up to ${backupPath}`);

const settings = JSON.parse(readFileSync(claudeSettingsPath, "utf-8"));

// Check if already wired
const settingsStr = JSON.stringify(settings);
if (settingsStr.includes(poseidonDir + "/hooks/")) {
  console.log("Poseidon hooks already wired. Nothing to do.");
  process.exit(0);
}

// Ensure env
settings.env = settings.env || {};
settings.env.POSEIDON_DIR = poseidonDir;

// Ensure hooks object
settings.hooks = settings.hooks || {};

const bun = "bun";
const h = (file: string) => ({ type: "command", command: `${bun} ${poseidonDir}/hooks/${file}`, timeout: 600 });

// Helper: add a hook to an event, creating the array if needed
function addHook(event: string, hook: any, matcher?: string) {
  settings.hooks[event] = settings.hooks[event] || [];
  if (matcher) {
    // Find existing matcher group or create one
    let group = settings.hooks[event].find((g: any) => g.matcher === matcher);
    if (!group) {
      group = { matcher, hooks: [] };
      settings.hooks[event].push(group);
    }
    group.hooks.push(hook);
  } else {
    // Add to first group or create one
    if (settings.hooks[event].length === 0) {
      settings.hooks[event].push({ hooks: [] });
    }
    settings.hooks[event][0].hooks.push(hook);
  }
}

// Wire Poseidon hooks
addHook("SessionStart", h("session-start.ts"));
addHook("UserPromptSubmit", h("pre-prompt.ts"));
addHook("PreToolUse", h("pre-tool.ts"), "Bash");
addHook("PreToolUse", h("pre-tool.ts"), "Edit");
addHook("PreToolUse", h("pre-tool.ts"), "Write");
addHook("PreToolUse", h("pre-tool.ts"), "Read");
addHook("PostToolUse", h("error-capture.ts"), "Bash");
addHook("PostToolUse", h("error-capture.ts"), "WebSearch");
addHook("Stop", h("post-response.ts"));
addHook("SessionEnd", h("session-end.ts"));

// Wire status line
settings.statusLine = {
  type: "command",
  command: join(poseidonDir, "tools", "statusline.sh"),
};

// Write atomically
const tmpPath = claudeSettingsPath + ".tmp";
writeFileSync(tmpPath, JSON.stringify(settings, null, 2) + "\n");
const { renameSync } = require("fs");
renameSync(tmpPath, claudeSettingsPath);

console.log(`Poseidon hooks wired into ${claudeSettingsPath}`);
console.log(`POSEIDON_DIR set to ${poseidonDir}`);
console.log("\nRestart Claude Code to activate.");
