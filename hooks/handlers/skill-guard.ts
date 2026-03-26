/** skill-guard.ts — PreToolUse guard for Skill tool calls. */
import { existsSync, readdirSync } from "fs";
import { SKILLS_DIR } from "../lib/paths";

export interface GuardDecision {
  allow: boolean;
  reason?: string;
}

/**
 * Validate a Skill tool invocation.
 * Checks that the skill name corresponds to an existing skill directory.
 */
export function guardSkillExecution(skillName: string): GuardDecision {
  if (!skillName || typeof skillName !== "string") {
    return { allow: false, reason: "Skill name is empty or invalid" };
  }

  const skillsDir = SKILLS_DIR();
  if (!existsSync(skillsDir)) {
    return { allow: false, reason: `Skills directory not found: ${skillsDir}` };
  }

  try {
    const available = readdirSync(skillsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name.toLowerCase());

    // Match skill name case-insensitively, also handle fully-qualified names (e.g. "namespace:skill")
    const baseName = skillName.includes(":") ? skillName.split(":").pop()! : skillName;

    if (!available.includes(baseName.toLowerCase())) {
      return {
        allow: false,
        reason: `Skill "${skillName}" not found. Available: ${available.join(", ")}`,
      };
    }
  } catch (err) {
    return { allow: false, reason: `Failed to read skills directory: ${err}` };
  }

  return { allow: true };
}
