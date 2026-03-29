#!/usr/bin/env bun
/**
 * manifest-loader.ts — Read and query the Poseidon capability manifest
 *
 * Single source of truth for what this Poseidon instance can do.
 * All hooks, skills, and agents call this to check what's enabled.
 *
 * @author Poseidon System
 * @version 1.0.0
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";

const POSEIDON_DIR = process.env.POSEIDON_DIR || join(dirname(import.meta.path.replace("file://", "")), "..", "..");
const MANIFEST_PATH = join(POSEIDON_DIR, "poseidon-manifest.yaml");

// ── Types ────────────────────────────────────────────────────

export interface ServiceConfig {
  enabled: boolean;
  category: string;
  agent_type?: string;
  purpose: string;
  requires_key: boolean;
  endpoint?: string;
}

export interface ManifestCapabilities {
  research_agents: string[];
  research_tier_max: "quick" | "standard" | "extensive" | "deep";
  voice_enabled: boolean;
  notifications_enabled: boolean;
  finance_enabled: boolean;
  design_enabled: boolean;
}

export interface PoseidonManifest {
  version: string;
  updated: string;
  secrets_backend: string;
  services: Record<string, ServiceConfig>;
  capabilities: ManifestCapabilities;
}

// ── Cache (1 minute TTL) ─────────────────────────────────────

let _cache: { manifest: PoseidonManifest; at: number } | null = null;

// ── YAML Parser (simple, handles our format) ─────────────────

function parseManifest(content: string): PoseidonManifest {
  const services: Record<string, ServiceConfig> = {};
  let currentService = "";
  let secretsBackend = "age";
  let version = "1.0";
  let updated = "";

  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith("#") || !trimmed) continue;

    // Top-level fields
    if (/^version:\s*"?(.+)"?$/.test(trimmed)) {
      version = trimmed.match(/^version:\s*"?(.+?)"?\s*$/)?.[1] || "1.0";
    }
    if (/^updated:\s*"?(.+)"?$/.test(trimmed)) {
      updated = trimmed.match(/^updated:\s*"?(.+?)"?\s*$/)?.[1] || "";
    }
    if (/^\s+backend:\s*(\w+)/.test(line) && lines[i - 1]?.trim() === "secrets:") {
      secretsBackend = trimmed.match(/backend:\s*(\w+)/)?.[1] || "age";
    }

    // Service entries (indented under services:)
    // Detect service name: 2-space indent, name followed by colon
    if (/^  \w/.test(line) && line.includes(":") && !line.includes("backend:") && !line.includes("config:") && !line.includes("age:") && !line.includes("capabilities:")) {
      const nameMatch = line.match(/^\s{2}(\w[\w_]*)\s*:/);
      if (nameMatch && !["research_agents", "research_tier_max", "voice_enabled", "notifications_enabled", "finance_enabled", "design_enabled", "secrets", "services", "capabilities", "config"].includes(nameMatch[1])) {
        currentService = nameMatch[1];
        if (!services[currentService]) {
          services[currentService] = { enabled: false, category: "", purpose: "", requires_key: true };
        }
      }
    }

    // Service properties (4-space indent)
    if (currentService && /^\s{4}\w/.test(line)) {
      const propMatch = trimmed.match(/^(\w+):\s*(.+)$/);
      if (propMatch) {
        const [, key, val] = propMatch;
        const svc = services[currentService];
        if (key === "enabled") svc.enabled = val.trim() === "true";
        else if (key === "category") svc.category = val.trim();
        else if (key === "agent_type") svc.agent_type = val.trim();
        else if (key === "purpose") svc.purpose = val.replace(/^"|"$/g, "").trim();
        else if (key === "requires_key") svc.requires_key = val.trim() === "true";
        else if (key === "endpoint") svc.endpoint = val.replace(/^"|"$/g, "").trim();
      }
    }
  }

  // Compute derived capabilities
  const enabledResearch = Object.entries(services)
    .filter(([_, s]) => s.enabled && s.category === "research")
    .map(([name]) => name);

  const researchCount = enabledResearch.length;
  const research_tier_max: ManifestCapabilities["research_tier_max"] =
    researchCount >= 4 ? "extensive" : researchCount >= 3 ? "standard" : "quick";

  const capabilities: ManifestCapabilities = {
    research_agents: enabledResearch,
    research_tier_max,
    voice_enabled: Object.values(services).some(s => s.enabled && s.category === "voice"),
    notifications_enabled: Object.values(services).some(s => s.enabled && s.category === "notifications"),
    finance_enabled: Object.values(services).some(s => s.enabled && s.category === "finance"),
    design_enabled: Object.values(services).some(s => s.enabled && s.category === "design"),
  };

  return { version, updated, secrets_backend: secretsBackend, services, capabilities };
}

// ── Public API ───────────────────────────────────────────────

/**
 * Load the manifest (cached for 1 minute).
 */
export function loadManifest(): PoseidonManifest {
  const now = Date.now();
  if (_cache && now - _cache.at < 60_000) return _cache.manifest;

  if (!existsSync(MANIFEST_PATH)) {
    // Return minimal default if no manifest exists
    const defaults: PoseidonManifest = {
      version: "1.0", updated: "", secrets_backend: "age",
      services: { claude_websearch: { enabled: true, category: "research", agent_type: "ClaudeResearcher", purpose: "Scholarly synthesis", requires_key: false } },
      capabilities: { research_agents: ["claude_websearch"], research_tier_max: "quick", voice_enabled: false, notifications_enabled: false, finance_enabled: false, design_enabled: false },
    };
    _cache = { manifest: defaults, at: now };
    return defaults;
  }

  try {
    const content = readFileSync(MANIFEST_PATH, "utf-8");
    const manifest = parseManifest(content);
    _cache = { manifest, at: now };
    return manifest;
  } catch {
    _cache = null;
    return { version: "1.0", updated: "", secrets_backend: "age", services: {}, capabilities: { research_agents: [], research_tier_max: "quick", voice_enabled: false, notifications_enabled: false, finance_enabled: false, design_enabled: false } };
  }
}

/**
 * Check if a specific service is enabled.
 */
export function isServiceEnabled(serviceName: string): boolean {
  const manifest = loadManifest();
  return manifest.services[serviceName]?.enabled ?? false;
}

/**
 * Get all enabled services for a category.
 */
export function getEnabledServices(category: string): string[] {
  const manifest = loadManifest();
  return Object.entries(manifest.services)
    .filter(([_, s]) => s.enabled && s.category === category)
    .map(([name]) => name);
}

/**
 * Get enabled research agent types (for dispatching).
 */
export function getEnabledResearchAgents(): { name: string; agent_type: string; purpose: string }[] {
  const manifest = loadManifest();
  return Object.entries(manifest.services)
    .filter(([_, s]) => s.enabled && s.category === "research" && s.agent_type)
    .map(([name, s]) => ({ name, agent_type: s.agent_type!, purpose: s.purpose }));
}

/**
 * Get the secrets backend configuration.
 */
export function getSecretsBackend(): string {
  return loadManifest().secrets_backend;
}

/**
 * Get derived capabilities for quick checks.
 */
export function getCapabilities(): ManifestCapabilities {
  return loadManifest().capabilities;
}

/**
 * Enable a service in the manifest (writes to disk).
 */
export function enableService(serviceName: string): boolean {
  if (!existsSync(MANIFEST_PATH)) return false;
  try {
    let content = readFileSync(MANIFEST_PATH, "utf-8");
    // Find the service block and set enabled: true
    const regex = new RegExp(`(\\s{2}${serviceName}:[\\s\\S]*?enabled:\\s*)false`, "m");
    if (regex.test(content)) {
      content = content.replace(regex, "$1true");
      content = content.replace(/^updated:.*/m, `updated: "${new Date().toISOString()}"`);
      writeFileSync(MANIFEST_PATH, content);
      _cache = null; // Invalidate cache
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Format manifest for system-reminder injection.
 */
export function formatManifestForInjection(): string {
  const m = loadManifest();
  const cap = m.capabilities;

  const lines: string[] = [
    "## Enabled Capabilities",
    "",
    `**Secrets:** ${m.secrets_backend} backend`,
    `**Research agents:** ${cap.research_agents.join(", ") || "none"} (max tier: ${cap.research_tier_max})`,
  ];

  if (cap.voice_enabled) lines.push("**Voice:** enabled");
  if (cap.notifications_enabled) lines.push("**Notifications:** enabled");
  if (cap.finance_enabled) lines.push("**Finance data:** enabled");
  if (cap.design_enabled) lines.push("**Design tools:** enabled");

  // List disabled services (so AI knows NOT to attempt them)
  const disabled = Object.entries(m.services)
    .filter(([_, s]) => !s.enabled)
    .map(([name]) => name);
  if (disabled.length > 0) {
    lines.push("");
    lines.push(`**NOT available (do not attempt):** ${disabled.join(", ")}`);
  }

  return lines.join("\n");
}
