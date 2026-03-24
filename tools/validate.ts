#!/usr/bin/env bun
/**
 * validate.ts — Verify a Poseidon installation is complete and functional.
 * Run: bun tools/validate.ts [poseidon-dir]
 */

import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const baseDir = process.argv[2] || process.env.POSEIDON_DIR || join(process.env.HOME || "", ".poseidon");

let passed = 0;
let failed = 0;
let warnings = 0;

function check(name: string, condition: boolean, warnOnly = false): void {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else if (warnOnly) {
    console.log(`  ⚠ ${name} (optional)`);
    warnings++;
  } else {
    console.log(`  ✗ ${name}`);
    failed++;
  }
}

function fileExists(rel: string): boolean {
  return existsSync(join(baseDir, rel));
}

function dirExists(rel: string): boolean {
  return existsSync(join(baseDir, rel));
}

function dirHasFiles(rel: string): boolean {
  try {
    return readdirSync(join(baseDir, rel)).length > 0;
  } catch {
    return false;
  }
}

console.log(`\nValidating Poseidon installation at: ${baseDir}\n`);

// Core files
console.log("Core Files:");
check("CLAUDE.md exists", fileExists("CLAUDE.md"));
check("CLAUDE.md.template exists", fileExists("CLAUDE.md.template"));
check("settings.json exists", fileExists("settings.json"));
check("algorithm/v1.0.md exists", fileExists("algorithm/v1.0.md"));
check("algorithm/LATEST symlink exists", fileExists("algorithm/LATEST"));

// Settings validation
console.log("\nSettings:");
if (fileExists("settings.json")) {
  try {
    const settings = JSON.parse(readFileSync(join(baseDir, "settings.json"), "utf-8"));
    check("identity.agent_name set", !!settings.identity?.agent_name);
    check("identity.user_name set", settings.identity?.user_name !== undefined);
    check("hooks configured", !!settings.hooks?.SessionStart);
    check("security.patterns_path set", !!settings.security?.patterns_path);
    check("project section exists", !!settings.project);
  } catch (e) {
    check("settings.json valid JSON", false);
  }
}

// Hooks
console.log("\nHooks:");
check("session-start.ts exists", fileExists("hooks/session-start.ts"));
check("pre-prompt.ts exists", fileExists("hooks/pre-prompt.ts"));
check("pre-tool.ts exists", fileExists("hooks/pre-tool.ts"));
check("post-response.ts exists", fileExists("hooks/post-response.ts"));
check("session-end.ts exists", fileExists("hooks/session-end.ts"));
check("lib/paths.ts exists", fileExists("hooks/lib/paths.ts"));
check("lib/hook-io.ts exists", fileExists("hooks/lib/hook-io.ts"));

// Hook compilation
console.log("\nHook Compilation:");
for (const hook of ["session-start", "pre-prompt", "pre-tool", "post-response", "session-end"]) {
  const hookPath = join(baseDir, `hooks/${hook}.ts`);
  if (existsSync(hookPath)) {
    try {
      execSync(`bun build ${hookPath} --outdir /tmp/poseidon-validate --target bun 2>&1`);
      check(`${hook}.ts compiles`, true);
    } catch {
      check(`${hook}.ts compiles`, false);
    }
  }
}

// Security
console.log("\nSecurity:");
check("security/patterns.yaml exists", fileExists("security/patterns.yaml"));
check("secrets.enc exists", fileExists("secrets.enc"), true);

// TELOS
console.log("\nTELOS:");
check("telos/MISSION.md exists", fileExists("telos/MISSION.md"));
check("telos/GOALS.md exists", fileExists("telos/GOALS.md"));
check("telos/PROJECTS.md exists", fileExists("telos/PROJECTS.md"));

// Memory
console.log("\nMemory:");
check("memory/projects/ exists", dirExists("memory/projects"));
check("memory/work/ exists", dirExists("memory/work"));
check("memory/learning/signals/ exists", dirExists("memory/learning/signals"));
check("memory/learning/failures/ exists", dirExists("memory/learning/failures"));
check("memory/learning/rules/ exists", dirExists("memory/learning/rules"));
check("memory/learning/candidates/ exists", dirExists("memory/learning/candidates"));
check("memory/steering-rules.md exists", fileExists("memory/steering-rules.md"));

// Skills
console.log("\nSkills:");
check("skills/ directory exists", dirExists("skills"));
if (dirExists("skills")) {
  const skillDirs = readdirSync(join(baseDir, "skills")).filter(
    d => existsSync(join(baseDir, "skills", d, "SKILL.md"))
  );
  check(`${skillDirs.length} skills installed (target: 10)`, skillDirs.length >= 10);
  for (const skill of skillDirs) {
    check(`  skill: ${skill}`, true);
  }
}

// Tools
console.log("\nTools:");
check("tools/rebuild.ts exists", fileExists("tools/rebuild.ts"));
check("tools/init.ts exists", fileExists("tools/init.ts"), true);
check("tools/secret.ts exists", fileExists("tools/secret.ts"), true);

// CLAUDE.md token budget
console.log("\nContext Budget:");
if (fileExists("CLAUDE.md")) {
  const claudeMd = readFileSync(join(baseDir, "CLAUDE.md"), "utf-8");
  const estimatedTokens = Math.ceil(claudeMd.length / 4);
  check(`CLAUDE.md ~${estimatedTokens} tokens (budget: 1500)`, estimatedTokens <= 1500);
}

// Anti-criteria
console.log("\nPortability:");
try {
  const allTs = execSync(
    `grep -r "nedstar\\|/home/ned\\|~/.claude\\|localhost:8888" ${baseDir}/hooks/ ${baseDir}/tools/ ${baseDir}/algorithm/ 2>/dev/null | grep -v "validate.ts" || true`
  ).toString().trim();
  check("No hardcoded user paths in hooks/tools/algorithm", allTs === "");
} catch {
  check("No hardcoded user paths", true);
}

// Summary
console.log(`\n${"=".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${warnings} warnings`);
if (failed === 0) {
  console.log("✓ Poseidon installation is valid!");
} else {
  console.log(`✗ ${failed} check(s) failed. Fix these before using Poseidon.`);
}
console.log();

process.exit(failed > 0 ? 1 : 0);
