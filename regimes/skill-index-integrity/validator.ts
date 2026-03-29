/**
 * skill-index-integrity/validator.ts — Validates skill-index.yaml matches actual skill directories.
 *
 * Checks:
 * 1. Every skill directory has a matching index entry
 * 2. No orphaned index entries (skill deleted but index remains)
 * 3. Required index fields present per entry
 * 4. `requires` dependencies reference existing skills
 */

import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import type { RegimeValidator, RegimeValidation, RegimeIssue } from "../lib/types";

const validate: RegimeValidator = (projectPath, config): RegimeValidation => {
  const issues: RegimeIssue[] = [];

  const indexPath = join(projectPath, config.index_file || "skills/skill-index.yaml");
  const skillsDir = join(projectPath, config.skills_dir || "skills");

  if (!existsSync(indexPath)) {
    issues.push({ severity: "critical", message: "skill-index.yaml not found", file: config.index_file });
    return { compliant: false, issues, auto_fixable: false };
  }
  if (!existsSync(skillsDir)) {
    return { compliant: true, issues: [], auto_fixable: false };
  }

  const indexContent = readFileSync(indexPath, "utf-8");

  // Extract skill names from index (lines matching "  - name: skillname")
  const indexedSkills = new Set<string>();
  const indexEntries: { name: string; requires: string[]; line: number }[] = [];
  const lines = indexContent.split("\n");
  let currentSkill: { name: string; requires: string[]; line: number } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const nameMatch = lines[i].match(/^\s+-\s+name:\s+(\S+)/);
    if (nameMatch) {
      if (currentSkill) indexEntries.push(currentSkill);
      currentSkill = { name: nameMatch[1], requires: [], line: i + 1 };
      indexedSkills.add(nameMatch[1]);
    }
    const reqMatch = lines[i].match(/^\s+requires:\s*\[([^\]]*)\]/);
    if (reqMatch && currentSkill) {
      currentSkill.requires = reqMatch[1]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  if (currentSkill) indexEntries.push(currentSkill);

  // Get actual skill directories (those containing SKILL.md)
  const actualSkills = new Set<string>();
  try {
    for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
      if (entry.name === "skill-index.yaml") continue; // Skip the index file itself
      const skillMd = join(skillsDir, entry.name, "SKILL.md");
      if (existsSync(skillMd)) {
        actualSkills.add(entry.name);
      }
    }
  } catch {}

  // Check 1: Every actual skill dir has an index entry
  for (const skill of actualSkills) {
    if (!indexedSkills.has(skill)) {
      issues.push({
        severity: "warning",
        message: `Skill "${skill}" has SKILL.md but no entry in skill-index.yaml`,
        file: `skills/${skill}/SKILL.md`,
        fix: `Add "${skill}" entry to skill-index.yaml`,
      });
    }
  }

  // Check 2: No orphaned index entries
  for (const entry of indexEntries) {
    if (!actualSkills.has(entry.name)) {
      issues.push({
        severity: "warning",
        message: `Index entry "${entry.name}" (line ${entry.line}) has no matching skill directory`,
        file: config.index_file,
        fix: `Remove orphaned entry or create skills/${entry.name}/SKILL.md`,
      });
    }
  }

  // Check 3: Required fields (check via content — name is already parsed, check others)
  const requiredFields: string[] = config.required_index_fields || ["name", "tier", "priority", "description"];
  for (const entry of indexEntries) {
    // Find the block for this skill in the raw content
    const startIdx = indexContent.indexOf(`- name: ${entry.name}`);
    if (startIdx === -1) continue;
    const nextEntryIdx = indexContent.indexOf("\n  - name:", startIdx + 1);
    const block = nextEntryIdx === -1
      ? indexContent.slice(startIdx)
      : indexContent.slice(startIdx, nextEntryIdx);

    for (const field of requiredFields) {
      if (field === "name") continue; // Already parsed
      if (!new RegExp(`^\\s+${field}:`, "m").test(block)) {
        issues.push({
          severity: "info",
          message: `Index entry "${entry.name}" missing field: ${field}`,
          file: config.index_file,
          fix: `Add "${field}:" to the "${entry.name}" entry in skill-index.yaml`,
        });
      }
    }
  }

  // Check 4: requires dependencies exist
  for (const entry of indexEntries) {
    for (const dep of entry.requires) {
      if (!indexedSkills.has(dep)) {
        issues.push({
          severity: "warning",
          message: `Skill "${entry.name}" requires "${dep}" which doesn't exist in index`,
          file: config.index_file,
          fix: `Add "${dep}" to index or remove from ${entry.name}'s requires`,
        });
      }
    }
  }

  return {
    compliant: issues.filter((i) => i.severity === "critical").length === 0,
    issues,
    auto_fixable: false,
  };
};

export default validate;
