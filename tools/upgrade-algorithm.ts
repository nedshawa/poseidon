#!/usr/bin/env bun
/**
 * upgrade-algorithm.ts - Upgrade the Poseidon algorithm version
 *
 * Usage:
 *   bun tools/upgrade-algorithm.ts <command> [options]
 *
 * Commands:
 *   status              Show current algorithm version and stats
 *   create <version>    Create a new algorithm version from current + patches
 *   diff <v1> <v2>      Show differences between two versions
 *   rollback            Revert LATEST to previous version
 *
 * Options:
 *   --dry-run           Show what would change without modifying files
 *   --help              Show this help
 *
 * @author Poseidon System
 * @version 1.0.0
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, symlinkSync, unlinkSync, lstatSync } from "fs";
import { join, basename } from "path";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";

function findAlgorithmDir(): string {
  const candidates = [
    join(process.cwd(), "algorithm"),
    join(process.env.HOME || "", ".poseidon/algorithm"),
    join(process.env.HOME || "", "poseidon/algorithm"),
  ];
  for (const path of candidates) {
    if (existsSync(path)) return path;
  }
  console.error(`${RED}Algorithm directory not found.${RESET}`);
  process.exit(1);
}

function getCurrentVersion(dir: string): string {
  const latestPath = join(dir, "LATEST");
  if (!existsSync(latestPath)) return "unknown";
  try {
    const { readlinkSync } = require("fs");
    const target = readlinkSync(latestPath);
    return basename(target).replace(/\.md$/, "");
  } catch {
    // Not a symlink, read as file
    try {
      const content = readFileSync(latestPath, "utf-8").trim();
      return basename(content).replace(/\.md$/, "");
    } catch {
      return "unknown";
    }
  }
}

function listVersions(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.match(/^v\d+\.\d+\.md$/))
    .sort((a, b) => {
      const va = a.match(/v(\d+)\.(\d+)/);
      const vb = b.match(/v(\d+)\.(\d+)/);
      if (!va || !vb) return 0;
      const majorDiff = parseInt(va[1]) - parseInt(vb[1]);
      if (majorDiff !== 0) return majorDiff;
      return parseInt(va[2]) - parseInt(vb[2]);
    });
}

function getAlgorithmStats(content: string): { lines: number; phases: number; rules: number; hasReflection: boolean; hasMinCap: boolean } {
  const lines = content.split("\n").length;
  const phases = (content.match(/━━━/g) || []).length;
  const rules = (content.match(/^\s*-\s+\*\*/gm) || []).length;
  const hasReflection = content.includes("algorithm-reflections.jsonl");
  const hasMinCap = content.includes("Min Capabilities");
  return { lines, phases, rules, hasReflection, hasMinCap };
}

// --- Main ---

const args = process.argv.slice(2);
const command = args[0];
const dryRun = args.includes("--dry-run");

if (!command || command === "--help") {
  console.log(`
${BOLD}upgrade-algorithm${RESET} — Manage Poseidon algorithm versions

${BOLD}Usage:${RESET}
  bun tools/upgrade-algorithm.ts status
  bun tools/upgrade-algorithm.ts create v1.2
  bun tools/upgrade-algorithm.ts diff v1.0 v1.1
  bun tools/upgrade-algorithm.ts rollback

${BOLD}Options:${RESET}
  --dry-run    Show what would change without modifying
  --help       Show this help
`);
  process.exit(0);
}

const algoDir = findAlgorithmDir();

if (command === "status") {
  const versions = listVersions(algoDir);
  const current = getCurrentVersion(algoDir);

  console.log(`\n${BOLD}${CYAN}═══ Algorithm Status ═══${RESET}`);
  console.log(`  ${BOLD}Current:${RESET}  ${GREEN}${current}${RESET}`);
  console.log(`  ${BOLD}Versions:${RESET} ${versions.length}`);

  for (const v of versions) {
    const path = join(algoDir, v);
    const content = readFileSync(path, "utf-8");
    const stats = getAlgorithmStats(content);
    const isCurrent = v === `${current}.md`;
    const marker = isCurrent ? ` ${GREEN}← LATEST${RESET}` : "";
    console.log(
      `    ${v.replace(".md", "").padEnd(8)} ${DIM}${stats.lines} lines, ${stats.phases} phases, ${stats.rules} rules${RESET}${
        stats.hasReflection ? ` ${GREEN}✓reflection${RESET}` : ""
      }${stats.hasMinCap ? ` ${GREEN}✓minCap${RESET}` : ""}${marker}`
    );
  }
  console.log();
} else if (command === "create") {
  const newVersion = args[1];
  if (!newVersion || !newVersion.match(/^v\d+\.\d+$/)) {
    console.error(`${RED}Usage: create v1.2${RESET}`);
    process.exit(1);
  }

  const newPath = join(algoDir, `${newVersion}.md`);
  if (existsSync(newPath)) {
    console.error(`${RED}Version ${newVersion} already exists.${RESET}`);
    process.exit(1);
  }

  // Copy current version as starting point
  const current = getCurrentVersion(algoDir);
  const currentPath = join(algoDir, `${current}.md`);
  if (!existsSync(currentPath)) {
    console.error(`${RED}Current version file not found: ${currentPath}${RESET}`);
    process.exit(1);
  }

  const content = readFileSync(currentPath, "utf-8");
  const updated = content.replace(
    /## Poseidon Algorithm v\d+\.\d+/,
    `## Poseidon Algorithm ${newVersion}`
  );

  if (dryRun) {
    console.log(`${YELLOW}[dry-run]${RESET} Would create ${newPath}`);
    console.log(`${YELLOW}[dry-run]${RESET} Would update LATEST → ${newVersion}.md`);
  } else {
    writeFileSync(newPath, updated);
    const latestPath = join(algoDir, "LATEST");
    try { unlinkSync(latestPath); } catch {}
    symlinkSync(`${newVersion}.md`, latestPath);
    console.log(`${GREEN}Created ${newVersion} and updated LATEST.${RESET}`);
  }
} else if (command === "diff") {
  const v1 = args[1];
  const v2 = args[2];
  if (!v1 || !v2) {
    console.error(`${RED}Usage: diff v1.0 v1.1${RESET}`);
    process.exit(1);
  }

  const p1 = join(algoDir, `${v1}.md`);
  const p2 = join(algoDir, `${v2}.md`);

  if (!existsSync(p1) || !existsSync(p2)) {
    console.error(`${RED}One or both version files not found.${RESET}`);
    process.exit(1);
  }

  const s1 = getAlgorithmStats(readFileSync(p1, "utf-8"));
  const s2 = getAlgorithmStats(readFileSync(p2, "utf-8"));

  console.log(`\n${BOLD}${CYAN}═══ Algorithm Diff: ${v1} → ${v2} ═══${RESET}\n`);
  console.log(`  ${BOLD}Lines:${RESET}       ${s1.lines} → ${s2.lines} (${s2.lines > s1.lines ? "+" : ""}${s2.lines - s1.lines})`);
  console.log(`  ${BOLD}Phases:${RESET}      ${s1.phases} → ${s2.phases}`);
  console.log(`  ${BOLD}Rules:${RESET}       ${s1.rules} → ${s2.rules} (${s2.rules > s1.rules ? "+" : ""}${s2.rules - s1.rules})`);
  console.log(`  ${BOLD}Reflection:${RESET}  ${s1.hasReflection ? "✓" : "✗"} → ${s2.hasReflection ? GREEN + "✓" + RESET : RED + "✗" + RESET}`);
  console.log(`  ${BOLD}MinCap:${RESET}      ${s1.hasMinCap ? "✓" : "✗"} → ${s2.hasMinCap ? GREEN + "✓" + RESET : RED + "✗" + RESET}`);
  console.log();
} else if (command === "rollback") {
  const versions = listVersions(algoDir);
  if (versions.length < 2) {
    console.error(`${RED}Only one version exists — cannot rollback.${RESET}`);
    process.exit(1);
  }

  const current = getCurrentVersion(algoDir);
  const currentIdx = versions.indexOf(`${current}.md`);
  const previous = currentIdx > 0 ? versions[currentIdx - 1] : versions[versions.length - 2];

  if (dryRun) {
    console.log(`${YELLOW}[dry-run]${RESET} Would rollback LATEST from ${current} to ${previous.replace(".md", "")}`);
  } else {
    const latestPath = join(algoDir, "LATEST");
    try { unlinkSync(latestPath); } catch {}
    symlinkSync(previous, latestPath);
    console.log(`${GREEN}Rolled back LATEST to ${previous.replace(".md", "")}.${RESET}`);
  }
} else {
  console.error(`${RED}Unknown command: ${command}${RESET}`);
  process.exit(1);
}
