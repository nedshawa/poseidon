#!/usr/bin/env bun
/**
 * llm-registry.ts — LLM abstraction layer for Poseidon
 *
 * Defines supported LLMs and their launch configurations.
 * Poseidon can wrap any LLM that has a CLI interface.
 */

import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";

const SCRIPT_DIR = dirname(import.meta.path.replace("file://", ""));
const POSEIDON_DIR = process.env.POSEIDON_DIR || join(SCRIPT_DIR, "..");

// ── LLM Config Interface ───────────────────────────────────────

export interface LLMConfig {
  name: string;
  command: string;
  args: string[];
  displayName: string;
  getVersion: () => string;
  supportsResume: boolean;
  supportsChannels: boolean;
  defaultContextSize: string;
  defaultPlan: string;
}

// ── Registry ────────────────────────────────────────────────────

export const LLM_REGISTRY: Record<string, LLMConfig> = {
  claude: {
    name: "claude",
    command: "claude",
    args: [],
    displayName: "Claude",
    getVersion: () => {
      try {
        return execSync("claude --version", { stdio: "pipe" }).toString().match(/[\d.]+/)?.[0] || "?";
      } catch {
        return "?";
      }
    },
    supportsResume: true,
    supportsChannels: true,
    defaultContextSize: "1M context",
    defaultPlan: "Claude Max",
  },

  gemini: {
    name: "gemini",
    command: "gemini",
    args: [],
    displayName: "Gemini",
    getVersion: () => {
      try {
        return execSync("gemini --version", { stdio: "pipe" }).toString().match(/[\d.]+/)?.[0] || "?";
      } catch {
        return "?";
      }
    },
    supportsResume: false,
    supportsChannels: false,
    defaultContextSize: "2M context",
    defaultPlan: "Gemini Advanced",
  },

  codex: {
    name: "codex",
    command: "codex",
    args: [],
    displayName: "Codex",
    getVersion: () => {
      try {
        return execSync("codex --version", { stdio: "pipe" }).toString().match(/[\d.]+/)?.[0] || "?";
      } catch {
        return "?";
      }
    },
    supportsResume: false,
    supportsChannels: false,
    defaultContextSize: "200K context",
    defaultPlan: "OpenAI Pro",
  },

  ollama: {
    name: "ollama",
    command: "ollama",
    args: ["run", "llama3"],
    displayName: "Ollama (llama3)",
    getVersion: () => {
      try {
        return execSync("ollama --version", { stdio: "pipe" }).toString().match(/[\d.]+/)?.[0] || "?";
      } catch {
        return "?";
      }
    },
    supportsResume: false,
    supportsChannels: false,
    defaultContextSize: "128K context",
    defaultPlan: "Local",
  },
};

// ── Lookup ──────────────────────────────────────────────────────

function readDefaultLLM(): string {
  try {
    const settingsPath = join(POSEIDON_DIR, "settings.json");
    if (!existsSync(settingsPath)) return "claude";
    const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    return settings?.wrapper?.default_llm || "claude";
  } catch {
    return "claude";
  }
}

export function getLLM(name?: string): LLMConfig {
  const llmName = name || readDefaultLLM();
  return LLM_REGISTRY[llmName] || LLM_REGISTRY.claude;
}

export function listLLMs(): string[] {
  return Object.keys(LLM_REGISTRY);
}
