#!/usr/bin/env bun
// session-end.ts — SessionEnd hook: generate rule candidates from failures, rebuild CLAUDE.md
// TRIGGER: SessionEnd

import { readHookInput } from "./lib/hook-io";
import type { HookInput } from "./lib/hook-io";
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, statSync } from "fs";
import { join } from "path";
import { FAILURES_DIR, CANDIDATES_DIR, RULES_DIR, poseidonPath } from "./lib/paths";

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

interface FailureEntry {
  path: string;
  timestamp: Date;
}

function getRecentFailures(): FailureEntry[] {
  const dir = FAILURES_DIR();
  if (!existsSync(dir)) return [];

  const cutoff = Date.now() - TWENTY_FOUR_HOURS;
  const entries: FailureEntry[] = [];

  try {
    for (const name of readdirSync(dir)) {
      const fullPath = join(dir, name);
      const stat = statSync(fullPath);
      if (stat.isDirectory() && stat.mtimeMs > cutoff) {
        entries.push({ path: fullPath, timestamp: new Date(stat.mtimeMs) });
      }
    }
  } catch {
    // non-blocking
  }

  return entries;
}

function hasExistingCandidate(failurePath: string): boolean {
  const dir = CANDIDATES_DIR();
  if (!existsSync(dir)) return false;

  try {
    for (const name of readdirSync(dir)) {
      const content = readFileSync(join(dir, name), "utf-8");
      if (content.includes(failurePath)) return true;
    }
  } catch {
    // non-blocking
  }
  return false;
}

function generateCandidate(failure: FailureEntry): void {
  const dir = CANDIDATES_DIR();
  mkdirSync(dir, { recursive: true });

  // Read the failure analysis
  const analysisPath = join(failure.path, "ERROR_ANALYSIS.md");
  if (!existsSync(analysisPath)) return;

  let analysis: string;
  try {
    analysis = readFileSync(analysisPath, "utf-8");
  } catch {
    return;
  }

  // Extract what user asked (between "## What the user asked" and next ##)
  const userAskedMatch = analysis.match(/## What the user asked\n([\s\S]*?)(?=\n##|$)/);
  const userAsked = userAskedMatch?.[1]?.trim() || "Unknown request";

  // Extract matched patterns
  const patternsMatch = analysis.match(/## Patterns matched\n([\s\S]*?)(?=\n##|$)/);
  const patterns = patternsMatch?.[1]?.trim() || "Unknown pattern";

  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const candidatePath = join(dir, `${stamp}.md`);

  const content = `---
status: pending
created: ${now.toISOString()}
failure_ref: ${failure.path}
---
# Rule Candidate

**Pattern:** When handling "${userAsked.split(/\s+/).slice(0, 6).join(" ")}..."
**Rule:** Avoid repeating this mistake. ${patterns}
**Evidence:** [${failure.path}](${failure.path})
`;

  writeFileSync(candidatePath, content);
  console.error(`[session-end] Rule candidate created: ${candidatePath}`);
}

function rebuildClaudeMdIfNeeded(): void {
  const rulesDir = RULES_DIR();
  if (!existsSync(rulesDir)) return;

  try {
    const ruleFiles = readdirSync(rulesDir).filter((f) => f.endsWith(".md"));
    if (ruleFiles.length === 0) return;

    // Check for a template
    const templatePath = poseidonPath("templates", "CLAUDE.md.template");
    if (!existsSync(templatePath)) {
      console.error("[session-end] No CLAUDE.md template found, skipping rebuild");
      return;
    }

    let template = readFileSync(templatePath, "utf-8");
    const rulesBlock: string[] = [];

    for (const file of ruleFiles) {
      const content = readFileSync(join(rulesDir, file), "utf-8");
      // Extract rule text after frontmatter
      const bodyMatch = content.match(/---[\s\S]*?---\n([\s\S]*)/);
      const body = bodyMatch?.[1]?.trim();
      if (body) rulesBlock.push(body);
    }

    if (rulesBlock.length > 0) {
      template = template.replace(
        "{{LEARNED_RULES}}",
        rulesBlock.join("\n\n")
      );
      const claudeMdPath = poseidonPath("CLAUDE.md");
      writeFileSync(claudeMdPath, template);
      console.error(`[session-end] CLAUDE.md rebuilt with ${rulesBlock.length} rules`);
    }
  } catch (err) {
    console.error(`[session-end] CLAUDE.md rebuild error: ${err}`);
  }
}

async function main() {
  try {
    const input = await readHookInput();
    console.error(`[session-end] Session ending (reason: ${input.reason || "unknown"})`);

    // Scan recent failures and generate candidates
    const failures = getRecentFailures();
    let candidatesCreated = 0;

    for (const failure of failures) {
      if (!hasExistingCandidate(failure.path)) {
        generateCandidate(failure);
        candidatesCreated++;
      }
    }

    // Rebuild CLAUDE.md if approved rules exist
    rebuildClaudeMdIfNeeded();

    console.error(
      `[session-end] Summary: ${failures.length} recent failures, ${candidatesCreated} new candidates`
    );
  } catch (err) {
    console.error(`[session-end] Error (non-blocking): ${err}`);
  }
}

main();
