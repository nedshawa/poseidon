#!/usr/bin/env bun
/**
 * preferences-loader.ts — Load project-level skill preferences
 *
 * Reads YAML files from memory/projects/{id}/preferences/ and returns
 * structured preference data that skills can use to adapt their behavior.
 *
 * @author Poseidon System
 * @version 1.0.0
 */

import { existsSync, readFileSync, readdirSync } from "fs";
import { join, basename } from "path";
import { PROJECTS_DIR } from "../lib/paths";

export interface SkillPreference {
  skill: string;
  settings: Record<string, any>;
}

export interface ProjectPreferences {
  project: string;
  preferences: SkillPreference[];
  raw: Record<string, string>; // skill name → raw YAML content
}

/**
 * Load all skill preferences for a project.
 * Returns empty preferences if the project has no preferences/ directory.
 */
export function loadProjectPreferences(projectId: string): ProjectPreferences {
  const prefsDir = join(PROJECTS_DIR(), projectId, "preferences");
  const result: ProjectPreferences = {
    project: projectId,
    preferences: [],
    raw: {},
  };

  if (!existsSync(prefsDir)) return result;

  try {
    const files = readdirSync(prefsDir).filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));

    for (const file of files) {
      const skillName = basename(file, file.endsWith(".yaml") ? ".yaml" : ".yml");
      const content = readFileSync(join(prefsDir, file), "utf-8").trim();
      if (!content) continue;

      // Simple YAML parser — handles flat key: value pairs
      const settings: Record<string, any> = {};
      for (const line of content.split("\n")) {
        if (line.startsWith("#") || !line.trim()) continue;
        const match = line.match(/^(\w[\w_-]*)\s*:\s*(.+)$/);
        if (match) {
          const key = match[1].trim();
          let val: any = match[2].trim();
          // Parse arrays: [a, b, c]
          if (val.startsWith("[") && val.endsWith("]")) {
            val = val.slice(1, -1).split(",").map((v: string) => v.trim());
          }
          // Parse booleans
          else if (val === "true") val = true;
          else if (val === "false") val = false;
          // Parse numbers
          else if (/^\d+$/.test(val)) val = parseInt(val);
          settings[key] = val;
        }
      }

      result.preferences.push({ skill: skillName, settings });
      result.raw[skillName] = content;
    }
  } catch {}

  return result;
}

/**
 * Format preferences for system-reminder injection.
 * Returns markdown that Claude can read to understand project preferences.
 */
export function formatPreferencesForInjection(prefs: ProjectPreferences): string {
  if (prefs.preferences.length === 0) return "";

  const lines: string[] = [
    `## Project Skill Preferences (${prefs.project})`,
    "",
    "These preferences customize how skills behave for THIS project.",
    "When invoking a skill listed below, adapt your behavior according to the preferences.",
    "",
  ];

  for (const pref of prefs.preferences) {
    lines.push(`### ${pref.skill}`);
    for (const [key, val] of Object.entries(pref.settings)) {
      const display = Array.isArray(val) ? val.join(", ") : String(val);
      lines.push(`- **${key}:** ${display}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Get preferences for a specific skill in the active project.
 */
export function getSkillPreference(
  projectId: string,
  skillName: string
): Record<string, any> | null {
  const prefs = loadProjectPreferences(projectId);
  const match = prefs.preferences.find((p) => p.skill === skillName);
  return match ? match.settings : null;
}
