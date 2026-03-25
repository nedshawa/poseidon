#!/usr/bin/env bun
/**
 * channels.ts — Start Poseidon with configured communication channels.
 * Usage: bun tools/channels.ts [--list] [--start] [--status]
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const baseDir = process.env.POSEIDON_DIR || join(process.env.HOME || "", ".poseidon");
const settingsPath = join(baseDir, "settings.json");

interface Settings { channels?: { enabled?: string[] }; [k: string]: unknown }

/** Map channel names to Claude Code channel plugin identifiers */
const CHANNEL_MAP: Record<string, string> = {
  telegram: "plugin:telegram@claude-plugins-official",
  discord: "plugin:discord@claude-plugins-official",
  slack: "plugin:slack@claude-plugins-official",
  voice: "plugin:voice@claude-plugins-official",
};

function loadSettings(): Settings {
  if (!existsSync(settingsPath)) {
    console.error(`Settings not found: ${settingsPath}`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(settingsPath, "utf-8"));
}

function getEnabledChannels(): string[] {
  const settings = loadSettings();
  const enabled = settings.channels?.enabled ?? [];
  return enabled.filter((ch) => ch !== "terminal");
}

function listChannels(): void {
  const settings = loadSettings();
  const enabled = settings.channels?.enabled ?? ["terminal"];
  console.log("Configured channels:");
  for (const ch of enabled) {
    const mapped = CHANNEL_MAP[ch];
    console.log(`  ${ch}${mapped ? ` → ${mapped}` : " (built-in)"}`);
  }
  if (enabled.length === 0) {
    console.log("  (none — terminal only)");
  }
}

function buildStartCommand(): string {
  const flags = getEnabledChannels().map((ch) => CHANNEL_MAP[ch]).filter(Boolean);
  return ["claude", ...flags.map((p) => `--channel ${p}`)].join(" ");
}

function checkStatus(): void {
  try {
    execSync("tmux has-session -t poseidon 2>/dev/null", { stdio: "pipe" });
    console.log("Poseidon is running (tmux session: poseidon)");
  } catch {
    console.log("Poseidon is not running");
  }
}

const arg = process.argv[2];
if (arg === "--list") listChannels();
else if (arg === "--start") console.log(buildStartCommand());
else if (arg === "--status") checkStatus();
else {
  console.log("Usage: bun tools/channels.ts [--list] [--start] [--status]");
  console.log("  --list    Show enabled channels from settings.json");
  console.log("  --start   Print the claude command with channel flags");
  console.log("  --status  Check if poseidon tmux session is running");
}
