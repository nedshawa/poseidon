/**
 * documentation/validator.ts — Validates project documentation compliance.
 *
 * Checks:
 * 1. MANIFEST.md exists in project root
 * 2. Required sections are present
 * 3. "Last Updated" date is within staleness window
 * 4. Change Log has at least one entry
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import type { RegimeValidator, RegimeValidation, RegimeIssue } from "../lib/types";

const validate: RegimeValidator = (projectPath, config): RegimeValidation => {
  const issues: RegimeIssue[] = [];

  // Check MANIFEST.md exists (primary required file)
  // Config may have required_files as array or we just check MANIFEST.md directly
  const manifestPath = join(projectPath, "MANIFEST.md");
  if (!existsSync(manifestPath)) {
    issues.push({
      severity: "critical",
      message: "Required file missing: MANIFEST.md",
      file: "MANIFEST.md",
      fix: "Create MANIFEST.md from regime template (regimes/documentation/template/MANIFEST.md)",
    });
    return {
      compliant: false,
      issues,
      auto_fixable: true,
    };
  }

  const content = readFileSync(manifestPath, "utf-8");

  // Check required sections
  const requiredSections: string[] = config.required_sections || [];
  for (const section of requiredSections) {
    // Match ## Section or ## Section Name (case-insensitive)
    const pattern = new RegExp(`^##\\s+.*${escapeRegex(section)}`, "mi");
    if (!pattern.test(content)) {
      issues.push({
        severity: "warning",
        message: `Missing required section: "${section}"`,
        file: "MANIFEST.md",
        fix: `Add a "## ${section}" section to MANIFEST.md`,
      });
    }
  }

  // Check freshness
  const freshness = config.freshness;
  if (freshness?.max_staleness_days) {
    const dateMatch = content.match(/\*\*Last Updated:\*\*\s*(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      const lastUpdated = new Date(dateMatch[1]);
      const now = new Date();
      const daysSince = Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince > freshness.max_staleness_days) {
        issues.push({
          severity: "warning",
          message: `MANIFEST.md is ${daysSince} days stale (max: ${freshness.max_staleness_days})`,
          file: "MANIFEST.md",
          fix: `Update the "Last Updated" date and review content for accuracy`,
        });
      }
    } else {
      issues.push({
        severity: "info",
        message: `MANIFEST.md has no "Last Updated" date field`,
        file: "MANIFEST.md",
        fix: `Add "**Last Updated:** YYYY-MM-DD" to MANIFEST.md header`,
      });
    }
  }

  // Check Change Log has entries
  const changeLogIdx = content.indexOf("## Change Log");
  if (changeLogIdx !== -1) {
    const changeLogContent = content.slice(changeLogIdx);
    // Look for table rows (| v... | date | summary |)
    const rows = changeLogContent.match(/^\|[^|]+\|[^|]+\|[^|]+\|/gm);
    // Filter out header and separator rows
    const dataRows = (rows || []).filter(
      (r) => !r.includes("Version") && !r.includes("---")
    );
    if (dataRows.length === 0) {
      issues.push({
        severity: "warning",
        message: "Change Log section has no entries",
        file: "MANIFEST.md",
        fix: "Add at least one entry to the Change Log table",
      });
    }
  }

  return {
    compliant: issues.filter((i) => i.severity !== "info").length === 0,
    issues,
    auto_fixable: issues.some((i) => i.severity === "critical"),
  };
};

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default validate;
