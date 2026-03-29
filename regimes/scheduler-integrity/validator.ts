/**
 * scheduler-integrity validator — Checks scheduler.yaml compliance across projects.
 */

import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join } from "path";
import type { RegimeValidation, RegimeIssue } from "../lib/types";
import { validateCron } from "../../scheduler/lib/cron-parser";

export default function validate(
  projectPath: string,
  regimeConfig: Record<string, any>,
): RegimeValidation {
  const issues: RegimeIssue[] = [];
  const schedulerPath = join(projectPath, "scheduler.yaml");

  if (!existsSync(schedulerPath)) {
    // No scheduler.yaml is fine — not all projects need scheduled jobs
    return { compliant: true, issues: [], auto_fixable: false };
  }

  const content = readFileSync(schedulerPath, "utf-8");
  const requiredFields: string[] = regimeConfig.required_fields || [];
  const maxTimeout = regimeConfig.max_timeout || 3600;
  const minTimeout = regimeConfig.min_timeout || 10;
  const allowedTypes: string[] = regimeConfig.allowed_types || [];

  // Parse jobs (simplified — extract job blocks)
  const jobMatches = content.match(/- id:\s*(\S+)/g);
  if (!jobMatches) {
    return { compliant: true, issues: [], auto_fixable: false };
  }

  // Check each job
  const lines = content.split("\n");
  let currentJob: Record<string, string> = {};
  let jobCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("- id:")) {
      if (jobCount > 0) checkJob(currentJob, requiredFields, maxTimeout, minTimeout, allowedTypes, issues);
      currentJob = { id: trimmed.replace("- id:", "").trim() };
      jobCount++;
    } else if (jobCount > 0 && trimmed.match(/^\w+:/)) {
      const [key, ...rest] = trimmed.split(":");
      currentJob[key.trim()] = rest.join(":").trim().replace(/^["']|["']$/g, "");
    }
  }
  if (jobCount > 0) checkJob(currentJob, requiredFields, maxTimeout, minTimeout, allowedTypes, issues);

  return {
    compliant: issues.filter(i => i.severity === "critical").length === 0,
    issues,
    auto_fixable: false,
  };
}

function checkJob(
  job: Record<string, string>,
  requiredFields: string[],
  maxTimeout: number,
  minTimeout: number,
  allowedTypes: string[],
  issues: RegimeIssue[],
): void {
  const jobId = job.id || "unknown";

  // Required fields
  for (const field of requiredFields) {
    if (!job[field] || job[field] === "") {
      issues.push({
        severity: "critical",
        message: `Job ${jobId}: missing required field '${field}'`,
      });
    }
  }

  // Cron syntax
  if (job.schedule) {
    const cronError = validateCron(job.schedule);
    if (cronError) {
      issues.push({
        severity: "critical",
        message: `Job ${jobId}: invalid cron expression '${job.schedule}' — ${cronError}`,
      });
    }
  }

  // Timeout
  if (job.timeout) {
    const timeout = parseInt(job.timeout);
    if (timeout < minTimeout || timeout > maxTimeout) {
      issues.push({
        severity: "warning",
        message: `Job ${jobId}: timeout ${timeout}s outside range [${minTimeout}-${maxTimeout}]`,
      });
    }
  }

  // Type
  if (job.type && allowedTypes.length > 0 && !allowedTypes.includes(job.type)) {
    issues.push({
      severity: "critical",
      message: `Job ${jobId}: invalid type '${job.type}' (allowed: ${allowedTypes.join(", ")})`,
    });
  }
}
