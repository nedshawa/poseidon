/**
 * project-metadata/validator.ts — Validates META.yaml fields in project memory.
 *
 * Checks:
 * 1. Required fields populated (name, status, created)
 * 2. Status in valid enum
 * 3. Domain in valid enum
 * 4. Products entries exist in skill-index.yaml
 */

import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import type { RegimeValidator, RegimeValidation, RegimeIssue } from "../lib/types";

const validate: RegimeValidator = (projectPath, config): RegimeValidation => {
  const issues: RegimeIssue[] = [];

  const projectsDir = join(projectPath, "memory", "projects");
  if (!existsSync(projectsDir)) {
    return { compliant: true, issues: [], auto_fixable: false };
  }

  // Load skill index for products cross-reference
  const indexPath = join(projectPath, config.index_file || "skills/skill-index.yaml");
  const skillNames = new Set<string>();
  if (existsSync(indexPath)) {
    const indexContent = readFileSync(indexPath, "utf-8");
    const nameMatches = indexContent.matchAll(/- name:\s+(\S+)/g);
    for (const m of nameMatches) skillNames.add(m[1]);
  }

  const validStatuses = new Set(config.valid_statuses || ["active", "paused", "complete", "archived"]);
  const validDomains = new Set(config.valid_domains || ["general", "finance", "security", "tech", "content", "creative", "personal", "development", "data"]);
  const requiredFields: string[] = config.required_fields || ["name", "status", "created"];

  // Iterate project directories
  const entries = readdirSync(projectsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;

    const metaPath = join(projectsDir, entry.name, "META.yaml");
    if (!existsSync(metaPath)) {
      issues.push({
        severity: "warning",
        message: `Project "${entry.name}" has no META.yaml`,
        file: `memory/projects/${entry.name}/META.yaml`,
        fix: "Create META.yaml from project template",
      });
      continue;
    }

    const content = readFileSync(metaPath, "utf-8");

    // Check required fields
    for (const field of requiredFields) {
      const fieldMatch = content.match(new RegExp(`^${field}:\\s*(.+)`, "m"));
      if (!fieldMatch || !fieldMatch[1].trim() || fieldMatch[1].trim() === '""') {
        issues.push({
          severity: "warning",
          message: `Project "${entry.name}" META.yaml: "${field}" is empty or missing`,
          file: `memory/projects/${entry.name}/META.yaml`,
          fix: `Set a value for "${field}" in META.yaml`,
        });
      }
    }

    // Check status enum
    const statusMatch = content.match(/^status:\s*(\S+)/m);
    if (statusMatch) {
      const status = statusMatch[1].trim();
      if (!validStatuses.has(status)) {
        issues.push({
          severity: "warning",
          message: `Project "${entry.name}" has invalid status: "${status}"`,
          file: `memory/projects/${entry.name}/META.yaml`,
          fix: `Set status to one of: ${[...validStatuses].join(", ")}`,
        });
      }
    }

    // Check domain enum
    const domainMatch = content.match(/^domain:\s*(\S+)/m);
    if (domainMatch) {
      const domain = domainMatch[1].trim();
      if (!validDomains.has(domain)) {
        issues.push({
          severity: "info",
          message: `Project "${entry.name}" has non-standard domain: "${domain}"`,
          file: `memory/projects/${entry.name}/META.yaml`,
          fix: `Set domain to one of: ${[...validDomains].join(", ")}`,
        });
      }
    }

    // Check products reference valid skills
    const productsMatch = content.match(/^products:\s*\[([^\]]*)\]/m);
    if (productsMatch && productsMatch[1].trim()) {
      const products = productsMatch[1].split(",").map((s) => s.trim()).filter(Boolean);
      for (const product of products) {
        if (skillNames.size > 0 && !skillNames.has(product)) {
          issues.push({
            severity: "warning",
            message: `Project "${entry.name}" requests product "${product}" not in skill-index`,
            file: `memory/projects/${entry.name}/META.yaml`,
            fix: `Remove "${product}" from products or add it to skill-index.yaml`,
          });
        }
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
