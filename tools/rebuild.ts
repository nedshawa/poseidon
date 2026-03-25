#!/usr/bin/env bun
/**
 * rebuild.ts — Generate CLAUDE.md from template + settings + steering rules.
 * Run: bun tools/rebuild.ts
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const baseDir = process.env.POSEIDON_DIR || join(process.env.HOME || "", ".poseidon");

function rebuild(): void {
  const templatePath = join(baseDir, "CLAUDE.md.template");
  const settingsPath = join(baseDir, "settings.json");
  const outputPath = join(baseDir, "CLAUDE.md");
  const steeringRulesPath = join(baseDir, "memory", "steering-rules.md");

  if (!existsSync(templatePath)) {
    console.error("ERROR: CLAUDE.md.template not found at", templatePath);
    process.exit(1);
  }

  if (!existsSync(settingsPath)) {
    console.error("ERROR: settings.json not found at", settingsPath);
    process.exit(1);
  }

  const template = readFileSync(templatePath, "utf-8");
  const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));

  // Load 3-tier steering rules
  const rulesParts: string[] = [];
  // Tier 1: System rules (constitutional)
  const systemRulesPath = join(baseDir, "rules", "system.md");
  if (existsSync(systemRulesPath)) {
    rulesParts.push(readFileSync(systemRulesPath, "utf-8").trim());
  }
  // Tier 2: User rules (personal)
  const userRulesPath = join(baseDir, "rules", "user.md");
  if (existsSync(userRulesPath)) {
    const userContent = readFileSync(userRulesPath, "utf-8").trim();
    if (userContent && !userContent.includes("Add your personal rules below")) {
      rulesParts.push(userContent);
    }
  }
  // Tier 3: Learned rules (auto-generated from error intelligence)
  if (existsSync(steeringRulesPath)) {
    const learned = readFileSync(steeringRulesPath, "utf-8").trim();
    if (learned && !learned.includes("No steering rules yet")) {
      rulesParts.push(learned);
    }
  }
  const steeringRules = rulesParts.length > 0
    ? rulesParts.join("\n\n---\n\n")
    : "*No learned rules yet. System rules are loaded at session start.*";

  // Interpolate template variables
  const identity = settings.identity || {};
  let output = template
    .replace(/\{\{AGENT_NAME\}\}/g, identity.agent_name || "Poseidon")
    .replace(/\{\{USER_NAME\}\}/g, identity.user_name || "User")
    .replace(/\{\{COMMUNICATION_STYLE\}\}/g, identity.communication_style || "direct")
    .replace(/\{\{STEERING_RULES\}\}/g, steeringRules);

  writeFileSync(outputPath, output);

  // Token estimate (rough: ~4 chars per token)
  const estimatedTokens = Math.ceil(output.length / 4);
  console.log(`Generated CLAUDE.md (${output.length} chars, ~${estimatedTokens} tokens)`);

  if (estimatedTokens > 1500) {
    console.warn(`WARNING: CLAUDE.md exceeds 1500 token budget (~${estimatedTokens} tokens)`);
  }
}

rebuild();
