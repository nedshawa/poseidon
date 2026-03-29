/**
 * doc-integrity/validator.ts — Promotes existing doc-integrity.ts handler to a regime.
 *
 * Reuses the same deterministic checks:
 * 1. Backtick path references resolve to actual files
 * 2. docs/index.md lists all doc files
 * 3. Skill count claims match actual skill count
 * 4. algorithm/LATEST symlink is valid
 */

import { existsSync, readFileSync, readdirSync, lstatSync } from "fs";
import { join, relative } from "path";
import type { RegimeValidator, RegimeValidation, RegimeIssue } from "../lib/types";

const validate: RegimeValidator = (projectPath, _config): RegimeValidation => {
  const issues: RegimeIssue[] = [];

  const docsDir = join(projectPath, "docs");
  if (!existsSync(docsDir)) {
    return { compliant: true, issues: [], auto_fixable: false };
  }

  // Collect all .md files under docs/
  const mdFiles = collectMarkdown(docsDir);

  // Check 1: Backtick path references
  for (const file of mdFiles) {
    const content = readFileSync(file, "utf-8");
    const refs = extractPathRefs(content);
    for (const ref of refs) {
      const target = join(projectPath, ref);
      if (!existsSync(target)) {
        issues.push({
          severity: "warning",
          message: `Broken reference: \`${ref}\` in ${relative(projectPath, file)}`,
          file: relative(projectPath, file),
          fix: `Update or remove reference to \`${ref}\``,
        });
      }
    }
  }

  // Check 2: docs/index.md completeness
  const indexPath = join(docsDir, "index.md");
  if (existsSync(indexPath)) {
    const indexContent = readFileSync(indexPath, "utf-8");
    const actualDocs = mdFiles
      .map((f) => relative(docsDir, f))
      .filter((f) => f !== "index.md");
    for (const doc of actualDocs) {
      if (!indexContent.includes(doc)) {
        issues.push({
          severity: "info",
          message: `Doc "${doc}" exists but not listed in docs/index.md`,
          file: "docs/index.md",
          fix: `Add "${doc}" to the documentation index`,
        });
      }
    }
  }

  // Check 3: Skill count claims
  const skillsDir = join(projectPath, "skills");
  if (existsSync(skillsDir)) {
    const actualCount = countSkills(skillsDir);
    for (const file of mdFiles) {
      const content = readFileSync(file, "utf-8");
      const countMatch = content.match(/(\d+)\s+skills?/i);
      if (countMatch) {
        const claimed = parseInt(countMatch[1], 10);
        if (claimed > 3 && Math.abs(claimed - actualCount) > 1) {
          issues.push({
            severity: "warning",
            message: `${relative(projectPath, file)} claims ${claimed} skills but found ${actualCount}`,
            file: relative(projectPath, file),
            fix: `Update skill count from ${claimed} to ${actualCount}`,
          });
        }
      }
    }
  }

  // Check 4: algorithm/LATEST symlink
  const latestLink = join(projectPath, "algorithm", "LATEST");
  if (existsSync(latestLink)) {
    try {
      const stat = lstatSync(latestLink);
      if (stat.isSymbolicLink()) {
        // Verify the target is readable
        readFileSync(latestLink, "utf-8");
      }
    } catch {
      issues.push({
        severity: "warning",
        message: "algorithm/LATEST symlink target does not exist or is unreadable",
        file: "algorithm/LATEST",
        fix: "Re-create symlink: ln -sf v1.2.md algorithm/LATEST",
      });
    }
  }

  return {
    compliant: issues.filter((i) => i.severity === "critical").length === 0,
    issues,
    auto_fixable: false,
  };
};

function collectMarkdown(dir: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) results.push(...collectMarkdown(full));
    else if (entry.name.endsWith(".md")) results.push(full);
  }
  return results;
}

function extractPathRefs(content: string): string[] {
  const refs: string[] = [];
  const re = /`((?:docs|skills|hooks|algorithm|memory|regimes|tools)\/[\w./-]+)`/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) refs.push(m[1]);
  return refs;
}

function countSkills(skillsDir: string): number {
  let count = 0;
  for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
    if (entry.isDirectory() && existsSync(join(skillsDir, entry.name, "SKILL.md"))) {
      count++;
    }
  }
  return count;
}

export default validate;
