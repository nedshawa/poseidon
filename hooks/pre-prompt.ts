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

// ── Secret Detection & Auto-Store ───────────────────────────────
// Detects API keys in the user's natural prompt, stores them securely,
// and injects a note telling Poseidon the key was captured.
// The user just talks naturally — "here's my FMP key: abc123..."

import { poseidonPath } from "./lib/paths";
import { appendFileSync } from "fs";
import { execSync as execSyncImport } from "child_process";
import { randomBytes } from "crypto";
import { homedir } from "os";

const KEY_PATTERNS = [
  { re: /sk-[a-zA-Z0-9]{20,}/, service: "openai" },
  { re: /sk-ant-[a-zA-Z0-9\-]{20,}/, service: "anthropic" },
  { re: /ghp_[a-zA-Z0-9]{36}/, service: "github" },
  { re: /gho_[a-zA-Z0-9]{36}/, service: "github" },
  { re: /pplx-[a-zA-Z0-9]{20,}/, service: "perplexity" },
  { re: /AKIA[0-9A-Z]{16}/, service: "aws" },
  { re: /xoxb-[a-zA-Z0-9\-]{20,}/, service: "slack" },
];

// Detect any service name mentioned near the key
const SERVICE_HINTS: Record<string, string[]> = {
  openai: ["openai", "gpt", "chatgpt"],
  anthropic: ["anthropic", "claude"],
  fmp: ["fmp", "financial modeling", "financialmodelingprep"],
  perplexity: ["perplexity", "pplx"],
  gemini: ["gemini", "google ai"],
  github: ["github", "gh"],
  elevenlabs: ["elevenlabs", "eleven labs", "11labs"],
  deepgram: ["deepgram"],
  twilio: ["twilio"],
};

function detectSecretInPrompt(prompt: string): { service: string; key: string; field: string } | null {
  const lower = prompt.toLowerCase();

  // Check for known key patterns anywhere in the prompt
  for (const { re, service } of KEY_PATTERNS) {
    const match = prompt.match(re);
    if (match) return { service, key: match[0], field: "api_key" };
  }

  // Check for long alphanumeric strings (32+ chars) that look like API keys
  // Only if the prompt mentions "key", "api", "token", "secret", "onboard"
  if (/key|api|token|secret|onboard|credential/i.test(lower)) {
    const longKey = prompt.match(/[a-zA-Z0-9_\-]{32,}/);
    if (longKey) {
      // Try to detect service from context
      let detectedService = "_unknown";
      for (const [svc, hints] of Object.entries(SERVICE_HINTS)) {
        if (hints.some(h => lower.includes(h))) { detectedService = svc; break; }
      }
      return { service: detectedService, key: longKey[0], field: "api_key" };
    }
  }

  return null;
}

function storeSecretQuietly(service: string, field: string, key: string): string {
  try {
    const home = homedir();
    const keyPath = (() => {
      try {
        const s = JSON.parse(readFileSync(getSettingsPath(), "utf-8"));
        return s?.security?.age_key_path || join(home, ".config", "poseidon", "age-key.txt");
      } catch { return join(home, ".config", "poseidon", "age-key.txt"); }
    })();

    const encPath = poseidonPath("secrets.enc");
    const shmDir = existsSync("/dev/shm") ? "/dev/shm" : "/tmp";
    const tmpFile = join(shmDir, `poseidon-key-${randomBytes(6).toString("hex")}.json`);

    if (existsSync(keyPath) && existsSync(encPath)) {
      try { execSyncImport(`age -d -i "${keyPath}" "${encPath}" > "${tmpFile}"`, { stdio: "pipe" }); }
      catch { writeFileSync(tmpFile, "{}"); }

      const secrets = JSON.parse(readFileSync(tmpFile, "utf-8"));
      secrets[service] = { ...(secrets[service] || {}), [field]: key };
      writeFileSync(tmpFile, JSON.stringify(secrets, null, 2));

      const keyContent = readFileSync(keyPath, "utf-8");
      const pubMatch = keyContent.match(/public key: (age1\w+)/);
      if (pubMatch) {
        execSyncImport(`age -r "${pubMatch[1]}" -o "${encPath}" "${tmpFile}"`, { stdio: "pipe" });
      }
      try { execSyncImport(`shred -u "${tmpFile}" 2>/dev/null`, { stdio: "ignore" }); } catch {}
      try { require("fs").unlinkSync(tmpFile); } catch {}

      return `✓ ${service}/${field} stored (encrypted)`;
    } else {
      const envPath = poseidonPath(".env");
      const envKey = `${service.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_${field.toUpperCase()}`;
      appendFileSync(envPath, `${envKey}=${key}\n`);
      return `✓ ${service}/${field} stored in .env (no encryption — run bun tools/secret.ts init)`;
    }
  } catch (err: any) {
    return `✗ Failed to store: ${err.message}`;
  }
}

async function main() {
  try {
    const input = await readHookInput();
    const rawPrompt = input.prompt || "";
    if (!rawPrompt.trim()) return;

    // ── SECRET AUTO-CAPTURE (detects keys, stores them, warns Poseidon) ──
    let secretNote = "";
    const detected = detectSecretInPrompt(rawPrompt);
    if (detected) {
      const result = storeSecretQuietly(detected.service, detected.field, detected.key);
      const masked = detected.key.slice(0, 4) + "..." + detected.key.slice(-4);
      secretNote = `🔐 SECRET AUTO-CAPTURED: ${result}\n` +
        `The user's message contained an API key (${masked}) which has been stored securely.\n` +
        `DO NOT repeat the full key in your response. Refer to it as "${detected.service} API key" only.\n` +
        `DO NOT include the key in any tool calls, logs, or output.\n` +
        `Confirm to the user: their ${detected.service} key has been stored at ${detected.service}/${detected.field}.`;
      console.error(`[pre-prompt] Secret detected and stored: ${detected.service}/${detected.field} (${masked})`);
    }

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
    // Inject secret note at the TOP if a key was detected
    if (secretNote) parts.unshift(secretNote);
    console.log(`<system-reminder>\n${parts.join("\n\n")}\n</system-reminder>`);
    console.error(`[pre-prompt] ${result.mode} (score: ${result.score}, signals: [${result.signals.join(", ")}]) \u2014 ${rawPrompt.slice(0, 40)}...`);
  } catch (err) {
    console.error(`[pre-prompt] Error (non-blocking): ${err}`);
  }
}

main();
