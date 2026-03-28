/** doc-integrity.ts — Deterministic document integrity checker.
 * No inference. Grep/stat based only.
 */
import { readdirSync, readFileSync, existsSync, lstatSync } from "fs";
import { join, relative } from "path";

export interface IntegrityIssue {
  file: string;
  type: "broken_ref" | "count_mismatch" | "stale_timestamp";
  detail: string;
  severity: "low" | "medium" | "high";
}

const SEVERITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

/** Recursively collect all .md files under a directory. */
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

/** Extract backtick-quoted file paths from markdown content. */
function extractPathRefs(content: string): string[] {
  const refs: string[] = [];
  const re = /`((?:docs|skills|hooks|algorithm|memory)\/[\w./-]+)`/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) refs.push(m[1]);
  return refs;
}

/** Count SKILL.md files under the skills directory. */
function countSkills(baseDir: string): number {
  const skillsDir = join(baseDir, "skills");
  if (!existsSync(skillsDir)) return 0;
  let count = 0;
  for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const skillFile = join(skillsDir, entry.name, "SKILL.md");
      if (existsSync(skillFile)) count++;
    }
  }
  return count;
}

/** Run all deterministic integrity checks against docs/. */
export function checkDocIntegrity(baseDir: string): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];
  const docsDir = join(baseDir, "docs");
  const mdFiles = collectMarkdown(docsDir);

  // 1. Check backtick path references
  for (const file of mdFiles) {
    const content = readFileSync(file, "utf-8");
    const refs = extractPathRefs(content);
    for (const ref of refs) {
      const target = join(baseDir, ref);
      if (!existsSync(target)) {
        issues.push({
          file: relative(baseDir, file),
          type: "broken_ref",
          detail: `Referenced path \`${ref}\` does not exist`,
          severity: "high",
        });
      }
    }
  }

  // 2. Check docs/index.md links against actual docs/ files
  const indexPath = join(docsDir, "index.md");
  if (existsSync(indexPath)) {
    const indexContent = readFileSync(indexPath, "utf-8");
    const actualDocs = new Set(mdFiles.map((f) => relative(docsDir, f)));
    for (const doc of actualDocs) {
      if (doc === "index.md") continue;
      if (!indexContent.includes(doc)) {
        issues.push({
          file: "docs/index.md",
          type: "broken_ref",
          detail: `Doc \`${doc}\` exists but is not listed in index`,
          severity: "medium",
        });
      }
    }
  }

  // 3. Skill count claims
  const skillCount = countSkills(baseDir);
  for (const file of mdFiles) {
    const content = readFileSync(file, "utf-8");
    const countMatch = content.match(/(\d+)\s+skills?/i);
    if (countMatch) {
      const claimed = parseInt(countMatch[1], 10);
      if (claimed > 3 && Math.abs(claimed - skillCount) > 1) {
        issues.push({
          file: relative(baseDir, file),
          type: "count_mismatch",
          detail: `Claims ${claimed} skills but found ${skillCount} SKILL.md files`,
          severity: "medium",
        });
      }
    }
  }

  // 4. Check algorithm/LATEST symlink
  const latestLink = join(baseDir, "algorithm", "LATEST");
  if (existsSync(latestLink)) {
    try {
      const stat = lstatSync(latestLink);
      if (stat.isSymbolicLink()) {
        const target = readFileSync(latestLink, "utf-8");
        // readlinkSync would be better but readFileSync on symlink follows it
        // Just check the target resolves
      }
    } catch {
      issues.push({
        file: "algorithm/LATEST",
        type: "broken_ref",
        detail: "LATEST symlink target does not exist",
        severity: "high",
      });
    }
  }

  // Sort by severity: high first
  issues.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  return issues;
}
