/**
 * memory-ownership/validator.ts — Validates memory ownership boundaries.
 *
 * Checks:
 * 1. Required project structure files exist (META.yaml)
 * 2. USER-owned files exist and are non-empty where expected
 * 3. SYSTEM files (CONTEXT.md) aren't stale beyond reasonable threshold
 * 4. Learning directory structure is intact
 */

import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import type { RegimeValidator, RegimeValidation, RegimeIssue } from "../lib/types";

const validate: RegimeValidator = (projectPath, config): RegimeValidation => {
  const issues: RegimeIssue[] = [];

  const projectsDir = join(projectPath, "memory", "projects");
  if (!existsSync(projectsDir)) {
    return { compliant: true, issues: [], auto_fixable: false };
  }

  const requiredStructure: string[] = config.required_structure || ["META.yaml"];
  const userFiles: string[] = config.user_files || ["GOALS.md", "DECISIONS.md", "RULES.md", "META.yaml"];

  // Check each project directory
  const entries = readdirSync(projectsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const projDir = join(projectsDir, entry.name);
    const projName = entry.name;

    // Check required structure files exist
    for (const reqFile of requiredStructure) {
      const filePath = join(projDir, reqFile);
      if (!existsSync(filePath)) {
        issues.push({
          severity: "warning",
          message: `Project "${projName}" missing required file: ${reqFile}`,
          file: `memory/projects/${projName}/${reqFile}`,
          fix: `Create ${reqFile} from project template`,
        });
      }
    }

    // Check USER files exist (they should have been created from template)
    for (const userFile of userFiles) {
      const filePath = join(projDir, userFile);
      if (!existsSync(filePath)) {
        // USER files should exist even if empty
        issues.push({
          severity: "info",
          message: `Project "${projName}" missing USER file: ${userFile}`,
          file: `memory/projects/${projName}/${userFile}`,
          fix: `Create empty ${userFile} (USER files must exist even if empty)`,
        });
      }
    }

    // Check CONTEXT.md (SYSTEM) staleness — if it exists, warn if >30 days old
    const contextPath = join(projDir, "CONTEXT.md");
    if (existsSync(contextPath)) {
      try {
        const stat = statSync(contextPath);
        const daysSince = Math.floor((Date.now() - stat.mtimeMs) / (1000 * 60 * 60 * 24));
        if (daysSince > 30) {
          issues.push({
            severity: "info",
            message: `Project "${projName}" CONTEXT.md is ${daysSince} days old`,
            file: `memory/projects/${projName}/CONTEXT.md`,
            fix: "CONTEXT.md will auto-refresh on next session with this project",
          });
        }
      } catch {}
    }
  }

  // Check learning directory structure is intact
  const learningDir = join(projectPath, config.learning_dir || "memory/learning");
  if (existsSync(learningDir)) {
    const expectedDirs = ["failures", "rules", "candidates", "signals", "regimes"];
    for (const dir of expectedDirs) {
      const dirPath = join(learningDir, dir);
      if (!existsSync(dirPath)) {
        issues.push({
          severity: "info",
          message: `Learning directory missing: memory/learning/${dir}/`,
          file: `memory/learning/${dir}`,
          fix: `Directory will be created automatically when needed`,
        });
      }
    }

    // Check signals/ratings.jsonl exists (append-only file)
    const ratingsPath = join(learningDir, "signals", "ratings.jsonl");
    if (existsSync(join(learningDir, "signals")) && !existsSync(ratingsPath)) {
      issues.push({
        severity: "info",
        message: "ratings.jsonl not found in learning/signals/",
        file: "memory/learning/signals/ratings.jsonl",
        fix: "File will be created on first rating",
      });
    }
  }

  return {
    compliant: issues.filter((i) => i.severity === "critical").length === 0,
    issues,
    auto_fixable: false,
  };
};

export default validate;
