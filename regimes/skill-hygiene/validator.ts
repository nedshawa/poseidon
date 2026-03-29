/**
 * skill-hygiene/validator.ts — Validates skill structure compliance.
 *
 * Checks per skill directory:
 * 1. SKILL.md exists with YAML frontmatter (name + description)
 * 2. Description contains "USE WHEN" clause
 * 3. Body contains "NOT for" scope boundary
 * 4. Body contains "Examples" section
 * 5. No directory nesting beyond max depth
 * 6. SKILL.md under max line count
 * 7. Directory name matches naming pattern
 */

import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";
import type { RegimeValidator, RegimeValidation, RegimeIssue } from "../lib/types";

const validate: RegimeValidator = (projectPath, config): RegimeValidation => {
  const issues: RegimeIssue[] = [];

  const skillDir = join(projectPath, config.skill_dir || "skills");
  if (!existsSync(skillDir)) {
    // No skills directory — nothing to check, compliant by default
    return { compliant: true, issues: [], auto_fixable: false };
  }

  const maxLines = config.max_skill_lines || 500;
  const maxDepth = config.max_nesting_depth || 2;
  const namingPattern = new RegExp(config.naming_pattern || "^[a-z][a-z0-9-]*$");
  const requiredYamlFields: string[] = config.required_yaml_fields || ["name", "description"];
  const requiredSections: string[] = config.required_sections || [];

  // Iterate over each skill directory
  const skillDirs = readdirSync(skillDir, { withFileTypes: true })
    .filter((d) => d.isDirectory());

  for (const dir of skillDirs) {
    const skillPath = join(skillDir, dir.name);
    const skillName = dir.name;

    // Skip special files
    if (skillName.startsWith(".") || skillName === "node_modules") continue;

    // Check naming convention
    if (!namingPattern.test(skillName)) {
      issues.push({
        severity: "warning",
        message: `Skill directory "${skillName}" doesn't match naming pattern: ${config.naming_pattern}`,
        file: `skills/${skillName}`,
        fix: `Rename to lowercase-hyphen format`,
      });
    }

    // Check SKILL.md exists
    const skillMdPath = join(skillPath, "SKILL.md");
    if (!existsSync(skillMdPath)) {
      issues.push({
        severity: "critical",
        message: `Missing SKILL.md in skills/${skillName}/`,
        file: `skills/${skillName}/SKILL.md`,
        fix: `Create SKILL.md with YAML frontmatter and required sections`,
      });
      continue; // Skip further checks for this skill
    }

    const content = readFileSync(skillMdPath, "utf-8");
    const lines = content.split("\n");

    // Check line count
    if (lines.length > maxLines) {
      issues.push({
        severity: "warning",
        message: `skills/${skillName}/SKILL.md is ${lines.length} lines (max: ${maxLines})`,
        file: `skills/${skillName}/SKILL.md`,
        fix: `Move detailed content to workflows/ or reference files`,
      });
    }

    // Check YAML frontmatter
    if (content.startsWith("---")) {
      const endIdx = content.indexOf("---", 3);
      if (endIdx !== -1) {
        const frontmatter = content.slice(3, endIdx);
        for (const field of requiredYamlFields) {
          if (!new RegExp(`^${field}:`, "m").test(frontmatter)) {
            issues.push({
              severity: "critical",
              message: `Missing YAML field "${field}" in skills/${skillName}/SKILL.md`,
              file: `skills/${skillName}/SKILL.md`,
              fix: `Add "${field}:" to YAML frontmatter`,
            });
          }
        }
      } else {
        issues.push({
          severity: "critical",
          message: `Malformed YAML frontmatter in skills/${skillName}/SKILL.md`,
          file: `skills/${skillName}/SKILL.md`,
          fix: `Ensure frontmatter is enclosed in --- delimiters`,
        });
      }
    } else {
      issues.push({
        severity: "critical",
        message: `No YAML frontmatter in skills/${skillName}/SKILL.md`,
        file: `skills/${skillName}/SKILL.md`,
        fix: `Add YAML frontmatter with name and description fields`,
      });
    }

    // Check required sections in body
    for (const section of requiredSections) {
      if (section === "USE WHEN") {
        // USE WHEN should be in the description field, not as a section header
        if (!content.includes("USE WHEN")) {
          issues.push({
            severity: "warning",
            message: `Missing "USE WHEN" trigger clause in skills/${skillName}/SKILL.md`,
            file: `skills/${skillName}/SKILL.md`,
            fix: `Add "USE WHEN trigger1, trigger2" to the description field`,
          });
        }
      } else if (section === "NOT for") {
        if (!/NOT for|NOT FOR|Not for/m.test(content)) {
          issues.push({
            severity: "warning",
            message: `Missing scope boundary ("NOT for:") in skills/${skillName}/SKILL.md`,
            file: `skills/${skillName}/SKILL.md`,
            fix: `Add a "NOT for:" section defining what the skill doesn't handle`,
          });
        }
      } else if (section === "Examples") {
        if (!/## Examples|### Example/m.test(content)) {
          issues.push({
            severity: "info",
            message: `No Examples section in skills/${skillName}/SKILL.md`,
            file: `skills/${skillName}/SKILL.md`,
            fix: `Add 2-3 usage examples`,
          });
        }
      } else if (section === "Workflow Routing") {
        if (!/Workflow Routing|workflow.*routing/mi.test(content)) {
          issues.push({
            severity: "info",
            message: `No Workflow Routing table in skills/${skillName}/SKILL.md`,
            file: `skills/${skillName}/SKILL.md`,
            fix: `Add a workflow routing table mapping request patterns to workflow files`,
          });
        }
      }
    }

    // Check nesting depth
    checkNestingDepth(skillPath, skillPath, maxDepth, 0, issues, skillName);
  }

  return {
    compliant: issues.filter((i) => i.severity === "critical").length === 0,
    issues,
    auto_fixable: false,
  };
};

function checkNestingDepth(
  dir: string,
  skillRoot: string,
  maxDepth: number,
  currentDepth: number,
  issues: RegimeIssue[],
  skillName: string
): void {
  if (currentDepth > maxDepth) {
    issues.push({
      severity: "warning",
      message: `Nesting too deep at ${relative(skillRoot, dir)} (max: ${maxDepth} levels)`,
      file: `skills/${skillName}/${relative(skillRoot, dir)}`,
      fix: `Flatten directory structure — use compound names instead of subdirectories`,
    });
    return; // Don't recurse further
  }

  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith(".")) {
        checkNestingDepth(
          join(dir, entry.name),
          skillRoot,
          maxDepth,
          currentDepth + 1,
          issues,
          skillName
        );
      }
    }
  } catch {}
}

export default validate;
