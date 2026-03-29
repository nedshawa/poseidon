#!/usr/bin/env bun
/**
 * skill-discovery.ts — 3-tier skill taxonomy with explicit matching
 *
 * Two matches only:
 *   1. UNIVERSAL MATCH — skill is universal, or a product skill that a universal
 *      skill depends on (requires: [skill-name])
 *   2. PROJECT MATCH — project explicitly lists the product skill in META.yaml
 *      products: [skill-name]
 *
 * No implicit domain matching. Loading is predictable — you always know
 * WHY a skill was loaded.
 *
 * @author Poseidon System
 * @version 2.0.0
 */

import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { poseidonPath, PROJECTS_DIR, SKILLS_DIR } from "../lib/paths";

export interface SkillEntry {
  name: string;
  tier: "universal" | "product" | "project";
  priority: number;
  requires: string[];
  description: string;
  match_reason: string; // WHY this skill was loaded
}

export interface SkillDiscoveryResult {
  project: string;
  universal: SkillEntry[];
  universal_deps: SkillEntry[];   // product skills loaded via dependency
  project_requested: SkillEntry[]; // product skills explicitly requested
  project_skills: SkillEntry[];    // skills in project's own skills/ dir
  unloaded: string[];              // product skills NOT loaded (for transparency)
  total_loaded: number;
  recommended_order: string[];
}

// ── Index Loading ────────────────────────────────────────────

interface RawSkillEntry {
  name: string;
  tier: string;
  priority: number;
  requires: string[];
  description: string;
}

function loadSkillIndex(): RawSkillEntry[] {
  const indexPath = join(SKILLS_DIR(), "skill-index.yaml");
  if (!existsSync(indexPath)) return [];

  try {
    const content = readFileSync(indexPath, "utf-8");
    const entries: RawSkillEntry[] = [];
    let current: Partial<RawSkillEntry> = {};

    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("- name:")) {
        if (current.name) entries.push(current as RawSkillEntry);
        current = { name: trimmed.replace("- name:", "").trim(), requires: [] };
      } else if (trimmed.startsWith("tier:")) {
        current.tier = trimmed.replace("tier:", "").trim();
      } else if (trimmed.startsWith("priority:")) {
        current.priority = parseInt(trimmed.replace("priority:", "").trim());
      } else if (trimmed.startsWith("requires:")) {
        const val = trimmed.replace("requires:", "").trim();
        current.requires = val.replace(/[\[\]]/g, "").split(",").map(s => s.trim()).filter(Boolean);
      } else if (trimmed.startsWith("description:")) {
        current.description = trimmed.replace("description:", "").trim().replace(/^"|"$/g, "");
      }
    }
    if (current.name) entries.push(current as RawSkillEntry);
    return entries;
  } catch {
    return [];
  }
}

// ── Project Config ───────────────────────────────────────────

function getProjectProducts(projectId: string): string[] {
  try {
    const metaPath = join(PROJECTS_DIR(), projectId, "META.yaml");
    if (!existsSync(metaPath)) return [];
    const content = readFileSync(metaPath, "utf-8");
    const match = content.match(/products:\s*\[([^\]]*)\]/);
    if (!match) return [];
    return match[1].split(",").map(s => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function loadProjectSkills(projectId: string): SkillEntry[] {
  const projectSkillsDir = join(PROJECTS_DIR(), projectId, "skills");
  if (!existsSync(projectSkillsDir)) return [];

  const entries: SkillEntry[] = [];
  try {
    for (const dir of readdirSync(projectSkillsDir)) {
      if (dir.startsWith(".")) continue;
      const skillDir = join(projectSkillsDir, dir);
      const skillMd = join(skillDir, "SKILL.md");
      if (!existsSync(skillDir) || !statSync(skillDir).isDirectory()) continue;
      if (!existsSync(skillMd)) continue;

      const content = readFileSync(skillMd, "utf-8");
      const descMatch = content.match(/description:\s*>?-?\s*\n?\s*(.*?)(?:\n---|$)/s);
      entries.push({
        name: dir,
        tier: "project",
        priority: 100,
        requires: [],
        description: descMatch ? descMatch[1].trim().substring(0, 80) : dir,
        match_reason: "project-local skill",
      });
    }
  } catch {}
  return entries;
}

// ── Discovery Engine ─────────────────────────────────────────

export function discoverSkills(projectId: string): SkillDiscoveryResult {
  const index = loadSkillIndex();
  const requestedProducts = getProjectProducts(projectId);
  const projectSkills = loadProjectSkills(projectId);

  // Step 1: Universal skills (always loaded)
  const universal: SkillEntry[] = index
    .filter(s => s.tier === "universal")
    .map(s => ({ ...s, match_reason: "universal — always available" }));

  // Step 2: Resolve universal dependencies → product skills loaded as deps
  const depNames = new Set<string>();
  for (const skill of universal) {
    for (const dep of skill.requires) {
      depNames.add(dep);
    }
  }

  const universalDeps: SkillEntry[] = index
    .filter(s => s.tier === "product" && depNames.has(s.name))
    .map(s => {
      const dependedBy = universal.filter(u => u.requires.includes(s.name)).map(u => u.name);
      return {
        ...s,
        match_reason: `universal-dep — required by: ${dependedBy.join(", ")}`,
      };
    });

  // Step 3: Project-requested product skills
  const alreadyLoaded = new Set([
    ...universal.map(s => s.name),
    ...universalDeps.map(s => s.name),
  ]);

  const projectRequested: SkillEntry[] = index
    .filter(s => s.tier === "product" && requestedProducts.includes(s.name) && !alreadyLoaded.has(s.name))
    .map(s => ({ ...s, match_reason: `project-requested — in META.yaml products[]` }));

  // Step 4: Identify unloaded product skills (transparency)
  const loadedNames = new Set([
    ...universal.map(s => s.name),
    ...universalDeps.map(s => s.name),
    ...projectRequested.map(s => s.name),
    ...projectSkills.map(s => s.name),
  ]);

  const unloaded = index
    .filter(s => s.tier === "product" && !loadedNames.has(s.name))
    .map(s => s.name);

  // Combine and sort by priority
  const all = [...projectSkills, ...universal, ...universalDeps, ...projectRequested]
    .sort((a, b) => b.priority - a.priority);

  return {
    project: projectId,
    universal,
    universal_deps: universalDeps,
    project_requested: projectRequested,
    project_skills: projectSkills,
    unloaded,
    total_loaded: all.length,
    recommended_order: all.map(s => s.name),
  };
}

// ── Formatting ───────────────────────────────────────────────

export function formatSkillDiscovery(result: SkillDiscoveryResult): string {
  if (result.total_loaded === 0) return "";

  const lines: string[] = [
    `## Skill Discovery (${result.project})`,
    "",
  ];

  // Project skills (highest priority)
  if (result.project_skills.length > 0) {
    lines.push("**🔷 Project Skills** (this project only, priority 100):");
    for (const s of result.project_skills) {
      lines.push(`  - **${s.name}** — ${s.description}`);
    }
    lines.push("");
  }

  // Universal
  lines.push(`**🔵 Universal** (${result.universal.length} skills, always available):`);
  const top = result.universal.sort((a, b) => b.priority - a.priority).slice(0, 8);
  for (const s of top) {
    lines.push(`  - **${s.name}** (p:${s.priority}) — ${s.description}`);
  }
  if (result.universal.length > 8) {
    lines.push(`  - ... and ${result.universal.length - 8} more universal skills`);
  }
  lines.push("");

  // Universal dependencies (product skills loaded because universal needs them)
  if (result.universal_deps.length > 0) {
    lines.push("**🟡 Universal Dependencies** (product skills loaded by dependency):");
    for (const s of result.universal_deps) {
      lines.push(`  - **${s.name}** — ${s.match_reason}`);
    }
    lines.push("");
  }

  // Project-requested product skills
  if (result.project_requested.length > 0) {
    lines.push("**🟢 Project-Requested** (explicitly in META.yaml products[]):");
    for (const s of result.project_requested) {
      lines.push(`  - **${s.name}** (p:${s.priority}) — ${s.description}`);
    }
    lines.push("");
  }

  // Unloaded (transparency — user knows what's available but not loaded)
  if (result.unloaded.length > 0) {
    lines.push(`**⚪ Available but not loaded** (add to META.yaml products[] to enable):`);
    lines.push(`  ${result.unloaded.join(", ")}`);
    lines.push("");
  }

  lines.push(`**Total loaded:** ${result.total_loaded} | **Top 5:** ${result.recommended_order.slice(0, 5).join(", ")}`);

  return lines.join("\n");
}
