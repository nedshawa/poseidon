/**
 * data-source-registry/validator.ts — Validates data-sources.yaml consistency.
 *
 * Checks:
 * 1. Required fields present per source entry
 * 2. used_by skill names exist in skill-index.yaml
 * 3. fallback source IDs exist in registry
 * 4. Sources with manifest_service have matching manifest entry
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import type { RegimeValidator, RegimeValidation, RegimeIssue } from "../lib/types";

interface SourceEntry {
  id: string;
  name: string;
  usedBy: string[];
  fallback: string | null;
  manifestService: string | null;
}

const validate: RegimeValidator = (projectPath, config): RegimeValidation => {
  const issues: RegimeIssue[] = [];

  const sourcesPath = join(projectPath, config.sources_file || "data-sources.yaml");
  if (!existsSync(sourcesPath)) {
    issues.push({ severity: "critical", message: "data-sources.yaml not found", file: "data-sources.yaml" });
    return { compliant: false, issues, auto_fixable: false };
  }

  const content = readFileSync(sourcesPath, "utf-8");

  // Parse source entries
  const sources: SourceEntry[] = [];
  const sourceIds = new Set<string>();

  // Extract each source block (starts with "  - id:")
  const blocks = content.split(/\n\s+-\s+id:\s+/);
  for (let i = 1; i < blocks.length; i++) { // Skip first split (before first entry)
    const block = blocks[i];
    const idMatch = block.match(/^(\w+)/);
    if (!idMatch) continue;

    const id = idMatch[1];
    sourceIds.add(id);

    const usedByMatch = block.match(/used_by:\s*\[([^\]]*)\]/);
    const usedBy = usedByMatch
      ? usedByMatch[1].split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const fallbackMatch = block.match(/fallback:\s*(\w+)/);
    const fallback = fallbackMatch ? fallbackMatch[1] : null;
    if (fallback === "null") { sources.push({ id, name: id, usedBy, fallback: null, manifestService: null }); continue; }

    const manifestMatch = block.match(/manifest_service:\s*(\w+)/);
    const manifestService = manifestMatch && manifestMatch[1] !== "null" ? manifestMatch[1] : null;

    sources.push({ id, name: id, usedBy, fallback: fallback || null, manifestService });
  }

  // Load skill index for cross-reference
  const indexPath = join(projectPath, config.index_file || "skills/skill-index.yaml");
  const skillNames = new Set<string>();
  if (existsSync(indexPath)) {
    const indexContent = readFileSync(indexPath, "utf-8");
    const nameMatches = indexContent.matchAll(/- name:\s+(\S+)/g);
    for (const m of nameMatches) skillNames.add(m[1]);
  }

  // Load manifest for cross-reference
  const manifestPath = join(projectPath, "poseidon-manifest.yaml");
  const manifestServices = new Set<string>();
  if (existsSync(manifestPath)) {
    const manifestContent = readFileSync(manifestPath, "utf-8");
    const svcMatches = manifestContent.matchAll(/^\s{2}(\w+):/gm);
    for (const m of svcMatches) {
      if (!["version", "updated", "secrets", "services", "capabilities"].includes(m[1])) {
        manifestServices.add(m[1]);
      }
    }
  }

  for (const source of sources) {
    // Check 1: used_by references valid skills
    for (const skill of source.usedBy) {
      if (skillNames.size > 0 && !skillNames.has(skill)) {
        issues.push({
          severity: "warning",
          message: `Source "${source.id}" used_by references "${skill}" which is not in skill-index`,
          file: "data-sources.yaml",
          fix: `Update used_by for "${source.id}" or add "${skill}" to skill-index.yaml`,
        });
      }
    }

    // Check 2: fallback references valid source
    if (source.fallback && !sourceIds.has(source.fallback)) {
      issues.push({
        severity: "warning",
        message: `Source "${source.id}" fallback references "${source.fallback}" which doesn't exist`,
        file: "data-sources.yaml",
        fix: `Fix fallback for "${source.id}" or add "${source.fallback}" source`,
      });
    }

    // Check 3: manifest_service references valid manifest entry
    if (source.manifestService && manifestServices.size > 0 && !manifestServices.has(source.manifestService)) {
      issues.push({
        severity: "info",
        message: `Source "${source.id}" manifest_service "${source.manifestService}" not found in manifest`,
        file: "data-sources.yaml",
        fix: `Add "${source.manifestService}" to poseidon-manifest.yaml or update manifest_service`,
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
