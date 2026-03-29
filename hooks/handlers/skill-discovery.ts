#!/usr/bin/env bun
/**
 * skill-discovery.ts — 3-tier skill taxonomy with relevance scoring
 *
 * Reads skill-index.yaml + project domain → returns priority-ordered
 * skill recommendations. Faster than directory scanning because it
 * uses pre-computed index with domain filtering.
 *
 * Tiers:
 *   universal  — always available, every project
 *   product    — available when project domain matches
 *   project    — in memory/projects/{id}/skills/ (project-created)
 *
 * @author Poseidon System
 * @version 1.0.0
 */

import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { poseidonPath, PROJECTS_DIR, SKILLS_DIR } from "../lib/paths";

export interface SkillEntry {
  name: string;
  tier: "universal" | "product" | "project";
  domains: string[];
  priority: number;
  description: string;
  source: string; // "global" or project name
}

export interface SkillDiscoveryResult {
  project: string;
  domain: string;
  universal: SkillEntry[];
  product: SkillEntry[];
  project_skills: SkillEntry[];
  total: number;
  recommended_order: string[]; // names sorted by relevance
}

/**
 * Load the skill index from skill-index.yaml
 */
function loadSkillIndex(): SkillEntry[] {
  const indexPath = join(SKILLS_DIR(), "skill-index.yaml");
  if (!existsSync(indexPath)) return [];

  try {
    const content = readFileSync(indexPath, "utf-8");
    const entries: SkillEntry[] = [];

    // Simple YAML list parser for our structure
    let current: Partial<SkillEntry> = {};
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("- name:")) {
        if (current.name) entries.push({ ...current, source: "global" } as SkillEntry);
        current = { name: trimmed.replace("- name:", "").trim() };
      } else if (trimmed.startsWith("tier:")) {
        current.tier = trimmed.replace("tier:", "").trim() as any;
      } else if (trimmed.startsWith("domains:")) {
        const domainsStr = trimmed.replace("domains:", "").trim();
        current.domains = domainsStr.replace(/[\[\]]/g, "").split(",").map(d => d.trim());
      } else if (trimmed.startsWith("priority:")) {
        current.priority = parseInt(trimmed.replace("priority:", "").trim());
      } else if (trimmed.startsWith("description:")) {
        current.description = trimmed.replace("description:", "").trim().replace(/^"|"$/g, "");
      }
    }
    if (current.name) entries.push({ ...current, source: "global" } as SkillEntry);

    return entries;
  } catch {
    return [];
  }
}

/**
 * Load project-specific skills from memory/projects/{id}/skills/
 */
function loadProjectSkills(projectId: string): SkillEntry[] {
  const projectSkillsDir = join(PROJECTS_DIR(), projectId, "skills");
  if (!existsSync(projectSkillsDir)) return [];

  const entries: SkillEntry[] = [];
  try {
    for (const dir of readdirSync(projectSkillsDir)) {
      const skillDir = join(projectSkillsDir, dir);
      const skillMd = join(skillDir, "SKILL.md");
      if (!statSync(skillDir).isDirectory() || !existsSync(skillMd)) continue;

      // Read SKILL.md frontmatter for description
      const content = readFileSync(skillMd, "utf-8");
      const descMatch = content.match(/description:\s*>?-?\s*\n?\s*(.*?)(?:\n---|$)/s);
      const desc = descMatch ? descMatch[1].trim().substring(0, 100) : dir;

      entries.push({
        name: dir,
        tier: "project",
        domains: [projectId],
        priority: 100, // Project skills always highest priority for their project
        description: desc,
        source: projectId,
      });
    }
  } catch {}

  return entries;
}

/**
 * Get project domain from META.yaml
 */
function getProjectDomain(projectId: string): string {
  try {
    const metaPath = join(PROJECTS_DIR(), projectId, "META.yaml");
    if (!existsSync(metaPath)) return "general";
    const content = readFileSync(metaPath, "utf-8");
    const match = content.match(/domain:\s*"?(\S+)"?/);
    return match ? match[1] : "general";
  } catch {
    return "general";
  }
}

/**
 * Discover skills for a project, scored and ordered by relevance.
 */
export function discoverSkills(projectId: string): SkillDiscoveryResult {
  const domain = getProjectDomain(projectId);
  const index = loadSkillIndex();
  const projectSkills = loadProjectSkills(projectId);

  // Split by tier
  const universal = index.filter(s => s.tier === "universal");
  const product = index.filter(s => {
    if (s.tier !== "product") return false;
    // Match if project domain is in skill's domains, or skill has "all"
    return s.domains.includes("all") || s.domains.includes(domain);
  });

  // Combine and sort by priority (highest first)
  const all = [...projectSkills, ...universal, ...product].sort((a, b) => b.priority - a.priority);

  return {
    project: projectId,
    domain,
    universal,
    product,
    project_skills: projectSkills,
    total: all.length,
    recommended_order: all.map(s => s.name),
  };
}

/**
 * Format skill discovery for system-reminder injection.
 * Shows categorized, priority-ordered skills to guide Claude's selection.
 */
export function formatSkillDiscovery(result: SkillDiscoveryResult): string {
  if (result.total === 0) return "";

  const lines: string[] = [
    `## Skill Discovery (${result.project}, domain: ${result.domain})`,
    "",
  ];

  // Project skills (highest priority)
  if (result.project_skills.length > 0) {
    lines.push("**Project Skills** (this project only, highest priority):");
    for (const s of result.project_skills) {
      lines.push(`  - **${s.name}** — ${s.description}`);
    }
    lines.push("");
  }

  // Universal (always available)
  lines.push(`**Universal Skills** (${result.universal.length}, always available):`);
  const topUniversal = result.universal.slice(0, 10);
  for (const s of topUniversal) {
    lines.push(`  - **${s.name}** (p:${s.priority}) — ${s.description}`);
  }
  if (result.universal.length > 10) {
    lines.push(`  - ... and ${result.universal.length - 10} more`);
  }
  lines.push("");

  // Product-specific (domain matched)
  if (result.product.length > 0) {
    lines.push(`**Domain Skills** (matched: ${result.domain}):`);
    for (const s of result.product) {
      lines.push(`  - **${s.name}** (p:${s.priority}) — ${s.description}`);
    }
    lines.push("");
  }

  lines.push(`**Recommended order** (top 5): ${result.recommended_order.slice(0, 5).join(", ")}`);

  return lines.join("\n");
}
