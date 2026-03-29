/**
 * capabilities-manifest/validator.ts — Validates poseidon-manifest.yaml consistency.
 *
 * Checks:
 * 1. Enabled services with requires_key have secrets available
 * 2. research_agents list entries are enabled services
 * 3. Capability flags align with enabled services
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import type { RegimeValidator, RegimeValidation, RegimeIssue } from "../lib/types";

const validate: RegimeValidator = (projectPath, config): RegimeValidation => {
  const issues: RegimeIssue[] = [];

  const manifestPath = join(projectPath, config.manifest_file || "poseidon-manifest.yaml");
  if (!existsSync(manifestPath)) {
    issues.push({ severity: "critical", message: "poseidon-manifest.yaml not found", file: "poseidon-manifest.yaml" });
    return { compliant: false, issues, auto_fixable: false };
  }

  const content = readFileSync(manifestPath, "utf-8");

  // Parse services: extract name, enabled, requires_key
  const services: { name: string; enabled: boolean; requiresKey: boolean; category: string }[] = [];
  const serviceBlocks = content.split(/\n  \w+:/g);
  const serviceNames = content.match(/\n  (\w+):/g) || [];

  // Simpler parsing: find each service block under "services:"
  const servicesSection = content.slice(content.indexOf("services:"));
  const capabilitiesIdx = content.indexOf("capabilities:");
  const servicesContent = capabilitiesIdx > 0
    ? content.slice(content.indexOf("services:"), capabilitiesIdx)
    : content.slice(content.indexOf("services:"));

  // Extract service entries
  const serviceRegex = /^\s{2}(\w+):\n((?:\s{4}\w+:.*\n?)*)/gm;
  let match: RegExpExecArray | null;
  while ((match = serviceRegex.exec(servicesContent)) !== null) {
    const name = match[1];
    const block = match[2];
    const enabled = /enabled:\s*true/.test(block);
    const requiresKey = /requires_key:\s*true/.test(block);
    const categoryMatch = block.match(/category:\s*(\w+)/);
    services.push({
      name,
      enabled,
      requiresKey,
      category: categoryMatch?.[1] || "unknown",
    });
  }

  // Check 1: Enabled services requiring keys — verify secrets exist
  // We can't decrypt secrets.enc, but we can check if it exists and is non-empty
  const secretsPath = join(projectPath, config.secrets_file || "secrets.enc");
  const hasSecrets = existsSync(secretsPath);

  for (const svc of services) {
    if (svc.enabled && svc.requiresKey && !hasSecrets) {
      issues.push({
        severity: "warning",
        message: `Service "${svc.name}" is enabled and requires a key, but no secrets.enc found`,
        file: "poseidon-manifest.yaml",
        fix: `Either disable ${svc.name} or add its API key via secret onboarding`,
      });
    }
  }

  // Check 2: research_agents list matches enabled services
  const researchAgentsMatch = content.match(/research_agents:\s*\n((?:\s+-\s+\w+\n?)*)/);
  if (researchAgentsMatch) {
    const agentLines = researchAgentsMatch[1].match(/- (\w+)/g) || [];
    const agents = agentLines.map((a) => a.replace("- ", ""));

    for (const agent of agents) {
      const svc = services.find((s) => s.name === agent);
      if (!svc) {
        issues.push({
          severity: "warning",
          message: `research_agents lists "${agent}" but no matching service definition found`,
          file: "poseidon-manifest.yaml",
          fix: `Add "${agent}" service definition or remove from research_agents`,
        });
      } else if (!svc.enabled) {
        issues.push({
          severity: "info",
          message: `research_agents lists "${agent}" but service is disabled`,
          file: "poseidon-manifest.yaml",
          fix: `Enable "${agent}" or remove from research_agents list`,
        });
      }
    }
  }

  // Check 3: Capability flags vs enabled services
  const financeEnabled = /finance_enabled:\s*true/.test(content);
  const hasFinanceService = services.some((s) => s.category === "finance" && s.enabled);
  if (financeEnabled && !hasFinanceService) {
    issues.push({
      severity: "info",
      message: "finance_enabled is true but no finance services are enabled",
      file: "poseidon-manifest.yaml",
      fix: "Enable a finance service (e.g., fmp) or set finance_enabled: false",
    });
  }

  const voiceEnabled = /voice_enabled:\s*true/.test(content);
  const hasVoiceService = services.some((s) => s.category === "voice" && s.enabled);
  if (voiceEnabled && !hasVoiceService) {
    issues.push({
      severity: "info",
      message: "voice_enabled is true but no voice services are enabled",
      file: "poseidon-manifest.yaml",
      fix: "Enable a voice service (e.g., elevenlabs) or set voice_enabled: false",
    });
  }

  return {
    compliant: issues.filter((i) => i.severity === "critical").length === 0,
    issues,
    auto_fixable: false,
  };
};

export default validate;
