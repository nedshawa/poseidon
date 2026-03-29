#!/usr/bin/env bun
/**
 * doc-freshness.ts — Detect stale documentation and auto-generate change reports
 *
 * Counts actual system state (skills, handlers, tools, etc.) and compares
 * against documented claims. Outputs a freshness report and optional
 * changeset for versioning.
 *
 * Usage:
 *   bun tools/doc-freshness.ts                 Run freshness check
 *   bun tools/doc-freshness.ts --json          Output as JSON
 *   bun tools/doc-freshness.ts --bump          Auto-bump version based on changes
 *   bun tools/doc-freshness.ts --changelog     Generate CHANGELOG entry
 *   bun tools/doc-freshness.ts --help          Show help
 *
 * @author Poseidon System
 * @version 1.0.0
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "fs";
import { join, basename } from "path";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";

const POSEIDON_DIR = process.env.POSEIDON_DIR || process.cwd();

// ── Actual State Counter ────────────────────────────────────

interface SystemState {
  skills: number;
  skill_md: number;
  workflows: number;
  handlers: number;
  hooks: number;
  libs: number;
  docs: number;
  guides: number;
  tools: number;
  agents: number;
  rules: number;
  algorithm_version: string;
  package_version: string;
  security_patterns: number;
}

function countFiles(dir: string, pattern?: RegExp): number {
  if (!existsSync(dir)) return 0;
  let count = 0;
  function walk(d: string) {
    try {
      for (const entry of readdirSync(d)) {
        const full = join(d, entry);
        try {
          const stat = statSync(full);
          if (stat.isDirectory()) walk(full);
          else if (!pattern || pattern.test(entry)) count++;
        } catch {}
      }
    } catch {}
  }
  walk(dir);
  return count;
}

function getActualState(): SystemState {
  return {
    skills: readdirSync(join(POSEIDON_DIR, "skills")).filter(d => {
      try { return statSync(join(POSEIDON_DIR, "skills", d)).isDirectory(); } catch { return false; }
    }).length,
    skill_md: countFiles(join(POSEIDON_DIR, "skills"), /^SKILL\.md$/),
    workflows: (() => {
      // Count only .md files inside workflows/ directories
      let count = 0;
      function walkWorkflows(dir: string) {
        try {
          for (const entry of readdirSync(dir)) {
            const full = join(dir, entry);
            try {
              const stat = statSync(full);
              if (stat.isDirectory()) {
                if (entry.toLowerCase() === "workflows") {
                  // Count .md files in this workflows/ dir
                  count += readdirSync(full).filter(f => f.endsWith(".md")).length;
                } else {
                  walkWorkflows(full);
                }
              }
            } catch {}
          }
        } catch {}
      }
      walkWorkflows(join(POSEIDON_DIR, "skills"));
      return count;
    })(),
    handlers: (() => {
      try { return readdirSync(join(POSEIDON_DIR, "hooks", "handlers")).filter(f => f.endsWith(".ts")).length; } catch { return 0; }
    })(),
    hooks: (() => {
      try { return readdirSync(join(POSEIDON_DIR, "hooks")).filter(f => f.endsWith(".ts")).length; } catch { return 0; }
    })(),
    libs: (() => {
      try { return readdirSync(join(POSEIDON_DIR, "hooks", "lib")).filter(f => f.endsWith(".ts")).length; } catch { return 0; }
    })(),
    docs: (() => {
      try { return readdirSync(join(POSEIDON_DIR, "docs")).filter(f => f.endsWith(".md")).length; } catch { return 0; }
    })(),
    guides: countFiles(join(POSEIDON_DIR, "guides"), /\.md$/),
    tools: (() => {
      try {
        return readdirSync(join(POSEIDON_DIR, "tools")).filter(f => f.endsWith(".ts") || f.endsWith(".sh")).length;
      } catch { return 0; }
    })(),
    agents: (() => {
      try { return readdirSync(join(POSEIDON_DIR, "agents")).filter(f => f.endsWith(".yaml")).length; } catch { return 0; }
    })(),
    rules: (() => {
      try {
        const content = readFileSync(join(POSEIDON_DIR, "rules", "system.md"), "utf-8");
        return (content.match(/^\*\*/gm) || []).length;
      } catch { return 0; }
    })(),
    algorithm_version: (() => {
      try {
        const { readlinkSync } = require("fs");
        const target = readlinkSync(join(POSEIDON_DIR, "algorithm", "LATEST"));
        return basename(target, ".md");
      } catch { return "unknown"; }
    })(),
    package_version: (() => {
      try { return JSON.parse(readFileSync(join(POSEIDON_DIR, "package.json"), "utf-8")).version; } catch { return "unknown"; }
    })(),
    security_patterns: (() => {
      try {
        const content = readFileSync(join(POSEIDON_DIR, "security", "patterns.yaml"), "utf-8");
        return (content.match(/pattern:/g) || []).length;
      } catch { return 0; }
    })(),
  };
}

// ── Documented State Scanner ────────────────────────────────

interface DocumentedClaim {
  file: string;
  line: number;
  claim: string;
  field: string;
  value: number | string;
}

function scanDocumentedClaims(): DocumentedClaim[] {
  const claims: DocumentedClaim[] = [];
  const docsDir = join(POSEIDON_DIR, "docs");
  const guidesDir = join(POSEIDON_DIR, "guides");
  const template = join(POSEIDON_DIR, "CLAUDE.md.template");

  const filesToScan = [
    ...(() => { try { return readdirSync(docsDir).filter(f => f.endsWith(".md")).map(f => join(docsDir, f)); } catch { return []; } })(),
    ...(() => { try { return readdirSync(guidesDir).filter(f => f.endsWith(".md")).map(f => join(guidesDir, f)); } catch { return []; } })(),
    template,
  ].filter(existsSync);

  const patterns: [RegExp, string][] = [
    [/(\d+)\s+skills?/gi, "skills"],
    [/(\d+)\s+SKILL\.md/gi, "skill_md"],
    [/(\d+)\s+workflows?/gi, "workflows"],
    [/(\d+)\s+handlers?/gi, "handlers"],
    [/(\d+)\s+hooks?/gi, "hooks"],
    [/(\d+)\s+(?:CLI\s+)?tools?/gi, "tools"],
    [/(\d+)\s+(?:named\s+)?agents?/gi, "agents"],
    [/(\d+)\s+(?:constitutional\s+|steering\s+)?rules?/gi, "rules"],
    [/(\d+)\s+guides?/gi, "guides"],
    [/(\d+)\s+docs?(?:umentation)?/gi, "docs"],
    [/(\d+)\s+(?:security\s+)?patterns?/gi, "security_patterns"],
  ];

  for (const file of filesToScan) {
    try {
      const content = readFileSync(file, "utf-8");
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Skip code blocks
        if (line.trim().startsWith("```") || line.trim().startsWith("#!")) continue;
        for (const [pattern, field] of patterns) {
          pattern.lastIndex = 0;
          let match;
          while ((match = pattern.exec(line)) !== null) {
            const value = parseInt(match[1]);
            if (value > 0 && value < 1000) { // Sanity check
              claims.push({
                file: file.replace(POSEIDON_DIR + "/", ""),
                line: i + 1,
                claim: line.trim().substring(0, 80),
                field,
                value,
              });
            }
          }
        }
      }
    } catch {}
  }

  return claims;
}

// ── Comparison ──────────────────────────────────────────────

interface FreshnessIssue {
  field: string;
  documented: number | string;
  actual: number | string;
  file: string;
  line: number;
  severity: "stale" | "ok";
}

function compare(actual: SystemState, claims: DocumentedClaim[]): FreshnessIssue[] {
  const issues: FreshnessIssue[] = [];
  const stateMap: Record<string, number> = {
    skills: actual.skills,
    skill_md: actual.skill_md,
    workflows: actual.workflows,
    handlers: actual.handlers,
    hooks: actual.hooks,
    tools: actual.tools,
    agents: actual.agents,
    rules: actual.rules,
    guides: actual.guides,
    docs: actual.docs,
    security_patterns: actual.security_patterns,
  };

  for (const claim of claims) {
    const actualVal = stateMap[claim.field];
    if (actualVal === undefined) continue;
    const claimedVal = typeof claim.value === "number" ? claim.value : parseInt(claim.value as string);
    if (isNaN(claimedVal)) continue;

    issues.push({
      field: claim.field,
      documented: claimedVal,
      actual: actualVal,
      file: claim.file,
      line: claim.line,
      severity: claimedVal !== actualVal ? "stale" : "ok",
    });
  }

  return issues;
}

// ── Version Bumping ─────────────────────────────────────────

interface VersionBump {
  current: string;
  next: string;
  type: "patch" | "minor" | "major";
  reason: string;
}

function calculateVersionBump(issues: FreshnessIssue[], actual: SystemState): VersionBump {
  const current = actual.package_version;
  const stale = issues.filter(i => i.severity === "stale");

  // Determine bump type
  let type: "patch" | "minor" | "major" = "patch";
  let reason = "documentation updates";

  // Check for new capabilities (minor)
  const handlerDelta = stale.find(i => i.field === "handlers");
  const toolDelta = stale.find(i => i.field === "tools");
  const skillDelta = stale.find(i => i.field === "skills");

  if (handlerDelta && (handlerDelta.actual as number) > (handlerDelta.documented as number)) {
    type = "minor";
    reason = `new handlers: ${handlerDelta.documented} → ${handlerDelta.actual}`;
  }
  if (toolDelta && (toolDelta.actual as number) > (toolDelta.documented as number)) {
    type = "minor";
    reason = `new tools: ${toolDelta.documented} → ${toolDelta.actual}`;
  }
  if (skillDelta && (skillDelta.actual as number) > (skillDelta.documented as number)) {
    type = "minor";
    reason = `new skills: ${skillDelta.documented} → ${skillDelta.actual}`;
  }

  // Bump version
  const parts = current.split(".").map(Number);
  let next: string;
  if (type === "major") {
    next = `${parts[0] + 1}.0.0`;
  } else if (type === "minor") {
    next = `${parts[0]}.${parts[1] + 1}.0`;
  } else {
    next = `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
  }

  return { current, next, type, reason };
}

// ── Changelog Generation ────────────────────────────────────

function generateChangelog(actual: SystemState, bump: VersionBump): string {
  const date = new Date().toISOString().split("T")[0];
  return `## ${bump.next} (${date})

**Type:** ${bump.type} — ${bump.reason}

### System State
| Metric | Count |
|--------|-------|
| Skills | ${actual.skills} (${actual.skill_md} SKILL.md) |
| Workflows | ${actual.workflows} |
| Handlers | ${actual.handlers} |
| Hooks | ${actual.hooks} |
| Tools | ${actual.tools} |
| Docs | ${actual.docs} |
| Guides | ${actual.guides} |
| Agents | ${actual.agents} |
| Rules | ${actual.rules} |
| Security Patterns | ${actual.security_patterns} |
| Algorithm | ${actual.algorithm_version} |

`;
}

// ── Main ────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.includes("--help")) {
  console.log(`
${BOLD}doc-freshness${RESET} — Detect stale documentation and manage versioning

${BOLD}Usage:${RESET}
  bun tools/doc-freshness.ts              Freshness check (text)
  bun tools/doc-freshness.ts --json       Freshness check (JSON)
  bun tools/doc-freshness.ts --bump       Auto-bump version
  bun tools/doc-freshness.ts --changelog  Generate CHANGELOG entry
  bun tools/doc-freshness.ts --state      Show current system state
  bun tools/doc-freshness.ts --help       Show help
`);
  process.exit(0);
}

const actual = getActualState();

if (args.includes("--state")) {
  console.log(`\n${BOLD}${CYAN}═══ Poseidon System State ═══${RESET}`);
  console.log(`  Skills:      ${actual.skills} dirs, ${actual.skill_md} SKILL.md`);
  console.log(`  Workflows:   ${actual.workflows}`);
  console.log(`  Handlers:    ${actual.handlers}`);
  console.log(`  Hooks:       ${actual.hooks}`);
  console.log(`  Libs:        ${actual.libs}`);
  console.log(`  Docs:        ${actual.docs}`);
  console.log(`  Guides:      ${actual.guides}`);
  console.log(`  Tools:       ${actual.tools}`);
  console.log(`  Agents:      ${actual.agents}`);
  console.log(`  Rules:       ${actual.rules}`);
  console.log(`  Patterns:    ${actual.security_patterns}`);
  console.log(`  Algorithm:   ${actual.algorithm_version}`);
  console.log(`  Version:     ${actual.package_version}`);
  console.log();
  process.exit(0);
}

const claims = scanDocumentedClaims();
const issues = compare(actual, claims);
const stale = issues.filter(i => i.severity === "stale");
const bump = calculateVersionBump(issues, actual);

if (args.includes("--json")) {
  console.log(JSON.stringify({ actual, stale_count: stale.length, issues: stale, bump }, null, 2));
  process.exit(0);
}

if (args.includes("--changelog")) {
  console.log(generateChangelog(actual, bump));
  process.exit(0);
}

if (args.includes("--bump")) {
  // Update package.json
  const pkgPath = join(POSEIDON_DIR, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  pkg.version = bump.next;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  // Append to CHANGELOG.md
  const changelogPath = join(POSEIDON_DIR, "CHANGELOG.md");
  const entry = generateChangelog(actual, bump);
  if (existsSync(changelogPath)) {
    const existing = readFileSync(changelogPath, "utf-8");
    writeFileSync(changelogPath, entry + existing);
  } else {
    writeFileSync(changelogPath, `# Poseidon Changelog\n\n${entry}`);
  }

  console.log(`${GREEN}Version bumped: ${bump.current} → ${bump.next} (${bump.type})${RESET}`);
  console.log(`${GREEN}CHANGELOG.md updated${RESET}`);
  process.exit(0);
}

// Default: freshness report
console.log(`\n${BOLD}${CYAN}═══ Documentation Freshness Check ═══${RESET}`);
console.log(`${DIM}Scanning ${claims.length} documented claims against actual state${RESET}\n`);

if (stale.length === 0) {
  console.log(`  ${GREEN}✓ All documented numbers match actual state${RESET}\n`);
} else {
  console.log(`  ${RED}${stale.length} stale claims found:${RESET}\n`);
  for (const issue of stale) {
    const arrow = (issue.actual as number) > (issue.documented as number) ? "↑" : "↓";
    console.log(`  ${YELLOW}${issue.field}${RESET}: documented ${RED}${issue.documented}${RESET} → actual ${GREEN}${issue.actual}${RESET} ${arrow}`);
    console.log(`    ${DIM}${issue.file}:${issue.line}${RESET}`);
  }
}

console.log(`\n  ${BOLD}Version:${RESET} ${actual.package_version}`);
if (stale.length > 0) {
  console.log(`  ${BOLD}Suggested bump:${RESET} ${bump.current} → ${CYAN}${bump.next}${RESET} (${bump.type}: ${bump.reason})`);
  console.log(`\n  Run ${CYAN}bun tools/doc-freshness.ts --bump${RESET} to apply.\n`);
} else {
  console.log(`  ${GREEN}Documentation is current. No version bump needed.${RESET}\n`);
}
