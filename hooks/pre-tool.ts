#!/usr/bin/env bun
// pre-tool.ts — Security validation for all tool calls
// TRIGGER: PreToolUse (matcher: Bash, Edit, Write, Read)

import { readHookInput, allowTool, blockTool, askUser } from "./lib/hook-io";
import type { HookInput } from "./lib/hook-io";
import { readFileSync, existsSync, mkdirSync, appendFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { poseidonPath, SECURITY_DIR, LOGS_DIR } from "./lib/paths";
import { guardAgentExecution } from "./handlers/agent-guard";
import { guardSkillExecution } from "./handlers/skill-guard";

interface PatternRule { pattern: string; reason: string; }
interface SecurityPatterns {
  bash: { trusted: PatternRule[]; blocked: PatternRule[]; confirm: PatternRule[]; alert: PatternRule[] };
  paths: { zeroAccess: string[]; readOnly: string[]; confirmWrite: string[]; noDelete: string[] };
}

function parsePatterns(yaml: string): SecurityPatterns {
  const r: SecurityPatterns = {
    bash: { trusted: [], blocked: [], confirm: [], alert: [] },
    paths: { zeroAccess: [], readOnly: [], confirmWrite: [], noDelete: [] },
  };
  let section = "", list = "", item: Partial<PatternRule> = {};
  for (const line of yaml.split("\n")) {
    const t = line.trimEnd();
    if (!t || t.startsWith("#") || t.startsWith("version") || t.startsWith("philosophy")) continue;
    if (/^bash:/.test(t)) { section = "bash"; list = ""; continue; }
    if (/^paths:/.test(t)) { section = "paths"; list = ""; continue; }
    const sub = t.match(/^\s{2}(\w+):/);
    if (sub) { list = sub[1]; item = {}; continue; }
    if (section === "bash" && list) {
      const pm = t.match(/^\s+-\s+pattern:\s+"(.+)"$/);
      if (pm) { item = { pattern: pm[1] }; continue; }
      const rm = t.match(/^\s+reason:\s+"(.+)"$/);
      if (rm && item.pattern) {
        item.reason = rm[1];
        const arr = (r.bash as any)[list];
        if (Array.isArray(arr)) arr.push({ ...item } as PatternRule);
        item = {}; continue;
      }
    }
    if (section === "paths" && list) {
      const pm = t.match(/^\s+-\s+"(.+)"$/);
      if (pm) { const arr = (r.paths as any)[list]; if (Array.isArray(arr)) arr.push(pm[1]); }
    }
  }
  return r;
}

function matchesGlob(filePath: string, pattern: string): boolean {
  const expanded = pattern.replace(/^~/, homedir());
  const re = expanded
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "\0").replace(/\*/g, "[^/]*").replace(/\0/g, ".*");
  return new RegExp(`^${re}$`).test(filePath);
}

function log(level: string, tool: string, detail: string): void {
  try {
    const dir = LOGS_DIR();
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const entry = JSON.stringify({ ts: new Date().toISOString(), level, tool, detail });
    appendFileSync(join(dir, "security.jsonl"), entry + "\n");
  } catch { /* logging must never block */ }
}

const HARDCODED_BLOCKED = [
  /rm\s+-rf\s+\//,
  /:()\s*\{\s*:\|:&\s*\}\s*;:/,
  /mkfs\./,
  /dd\s+if=\/dev\/(zero|random|urandom)\s+of=\/dev\/sd/,
  /chmod\s+777/,
  /echo\s+\$.*(_KEY|_TOKEN|_SECRET|_PASSWORD)/,
  /cat.*\.vault-token/,
  /curl.*-d.*\$.*(_KEY|_TOKEN|_SECRET)/,
];

function loadPatterns(): SecurityPatterns | null {
  for (const loc of [poseidonPath("security", "patterns.yaml"), join(SECURITY_DIR(), "patterns.yaml")]) {
    try { if (existsSync(loc)) return parsePatterns(readFileSync(loc, "utf-8")); } catch {}
  }
  return null;
}

function matchPathRules(filePath: string, patterns: SecurityPatterns, tool: string): void {
  const shortPath = filePath.split("/").slice(-2).join("/");
  for (const p of patterns.paths.zeroAccess) {
    if (matchesGlob(filePath, p)) {
      log("BLOCKED", tool, `Zero-access: ${filePath}`);
      console.error(`\u2699 PreTool \u2502 ${tool} \u2502 \ud83d\udea8 BLOCKED \u2502 zero-access: ${shortPath}`);
      blockTool(`Cannot access protected path: ${filePath}`);
    }
  }
  if (tool === "Read") {
    console.error(`\u2699 PreTool \u2502 ${tool} \u2502 \u2713 allowed${shortPath ? " \u2502 path: " + shortPath : ""}`);
    allowTool(); return;
  }
  for (const p of patterns.paths.readOnly) {
    if (matchesGlob(filePath, p)) {
      log("BLOCKED", tool, `Read-only: ${filePath}`);
      console.error(`\u2699 PreTool \u2502 ${tool} \u2502 \ud83d\udea8 BLOCKED \u2502 read-only: ${shortPath}`);
      blockTool(`Cannot write to read-only path: ${filePath}`);
    }
  }
  for (const p of patterns.paths.confirmWrite) {
    if (matchesGlob(filePath, p)) {
      log("CONFIRM", tool, `Confirm-write: ${filePath}`);
      console.error(`\u2699 PreTool \u2502 ${tool} \u2502 \u26a0 confirm \u2502 path: ${shortPath}`);
      askUser(`Requires confirmation to modify: ${filePath}`); return;
    }
  }
  console.error(`\u2699 PreTool \u2502 ${tool} \u2502 \u2713 allowed${shortPath ? " \u2502 path: " + shortPath : ""}`);
  allowTool();
}

function validateBash(input: HookInput, patterns: SecurityPatterns): void {
  const cmd = input.tool_input?.command || "";
  const cleaned = cmd.replace(/^(\s*\w+=\S+\s+)*/, ""); // strip env prefixes
  for (const r of patterns.bash.trusted)
    if (new RegExp(r.pattern).test(cleaned)) {
      console.error(`\u2699 PreTool \u2502 Bash \u2502 \u2713 allowed`);
      allowTool(); return;
    }
  for (const r of patterns.bash.blocked)
    if (new RegExp(r.pattern).test(cmd)) {
      log("BLOCKED", "Bash", `${r.reason}: ${cmd.slice(0, 120)}`);
      console.error(`\u2699 PreTool \u2502 Bash \u2502 \ud83d\udea8 BLOCKED \u2502 ${r.reason}`);
      blockTool(`${r.reason}`);
    }
  for (const r of patterns.bash.confirm)
    if (new RegExp(r.pattern).test(cmd)) {
      log("CONFIRM", "Bash", `${r.reason}: ${cmd.slice(0, 120)}`);
      console.error(`\u2699 PreTool \u2502 Bash \u2502 \u26a0 confirm \u2502 ${cmd.slice(0, 60)}`);
      askUser(`Security: ${r.reason}\nCommand: ${cmd.slice(0, 200)}`); return;
    }
  for (const r of patterns.bash.alert)
    if (new RegExp(r.pattern).test(cmd)) log("ALERT", "Bash", `${r.reason}: ${cmd.slice(0, 120)}`);
  console.error(`\u2699 PreTool \u2502 Bash \u2502 \u2713 allowed`);
  allowTool();
}

async function main() {
  try {
    const input = await readHookInput();
    const tool = input.tool_name || "";

    // Agent/Skill guards
    if (tool === "Task" || tool === "Agent") {
      const result = guardAgentExecution(tool, input.tool_input);
      if (!result.allow) {
        blockTool(result.reason || "Agent execution blocked");
        return;
      }
    }
    if (tool === "Skill") {
      const skillName = input.tool_input?.skill || input.tool_input?.name || "";
      const result = guardSkillExecution(skillName);
      if (!result.allow) {
        blockTool(result.reason || "Skill execution blocked");
        return;
      }
    }

    if (!["Bash", "Edit", "Write", "Read"].includes(tool)) {
      console.error(`\u2699 PreTool \u2502 ${tool} \u2502 \u2713 allowed`);
      allowTool(); return;
    }
    const patterns = loadPatterns();
    if (!patterns) {
      // Fail-closed: use hardcoded blocked patterns for Bash commands
      if (tool === "Bash") {
        const cmd = input.tool_input?.command || "";
        for (const re of HARDCODED_BLOCKED) {
          if (re.test(cmd)) {
            log("BLOCKED", "Bash", `Hardcoded block: ${cmd.slice(0, 120)}`);
            console.error(`\u2699 PreTool \u2502 Bash \u2502 \ud83d\udea8 BLOCKED \u2502 hardcoded safety pattern`);
            blockTool("Command blocked by hardcoded safety pattern");
            return;
          }
        }
      }
      console.error(`\u2699 PreTool \u2502 ${tool} \u2502 \u2713 allowed \u2502 no patterns.yaml (hardcoded check passed)`);
      allowTool(); return;
    }
    if (tool === "Bash") validateBash(input, patterns);
    else matchPathRules(input.tool_input?.file_path || input.tool_input?.path || "", patterns, tool);
  } catch (err) {
    console.error(`\u2699 PreTool \u2502 error: ${err}`);
    allowTool();
  }
}

main();
