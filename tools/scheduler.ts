#!/usr/bin/env bun
/**
 * scheduler.ts — CLI tool for Poseidon's master scheduler.
 *
 * Commands:
 *   list [--project <id>]    List all registered jobs
 *   status                   Show timer status via systemctl
 *   validate                 Validate all project scheduler.yaml files
 *   generate                 Generate systemd timer+service units
 *   fire <job-id>            Trigger a job immediately
 *   enable <job-id>          Enable a job's systemd timer
 *   disable <job-id>         Disable a job's systemd timer
 *   history [job-id]         Show run history
 *
 * Usage: bun tools/scheduler.ts <command> [options]
 */

import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import { poseidonPath, PROJECTS_DIR, LOGS_DIR } from "../hooks/lib/paths";
import type { Job, QualifiedJob, ValidationResult, ValidationError, ProjectSchedulerFile } from "../scheduler/lib/types";
import { JOB_DEFAULTS } from "../scheduler/lib/types";
import { validateCron, nextFire, cronToOnCalendar } from "../scheduler/lib/cron-parser";
import { writeUnits, unitName } from "../scheduler/lib/unit-generator";
import { readHistory } from "../scheduler/lib/log-manager";

// ── Colors ──────────────────────────────────────────────────

const RESET = "\x1b[0m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

// ── Helpers ─────────────────────────────────────────────────

function getBaseDir(): string {
  return process.env.POSEIDON_DIR || poseidonPath();
}

function loadProjectJobs(): QualifiedJob[] {
  const projectsDir = PROJECTS_DIR();
  if (!existsSync(projectsDir)) return [];

  const jobs: QualifiedJob[] = [];

  for (const projectSlug of readdirSync(projectsDir)) {
    if (projectSlug.startsWith(".")) continue;
    const projectDir = join(projectsDir, projectSlug);
    try { if (!statSync(projectDir).isDirectory()) continue; } catch { continue; }

    const schedulerPath = join(projectDir, "scheduler.yaml");
    if (!existsSync(schedulerPath)) continue;

    try {
      const content = readFileSync(schedulerPath, "utf-8");
      const parsed = parseSchedulerYaml(content);
      if (!parsed.jobs || !Array.isArray(parsed.jobs)) continue;

      for (const rawJob of parsed.jobs) {
        const job = applyDefaults(rawJob);
        jobs.push({
          ...job,
          project_id: projectSlug,
          qualified_id: `${projectSlug}:${job.id}`,
          source_file: schedulerPath,
        });
      }
    } catch (e: any) {
      console.error(`${RED}Error loading ${schedulerPath}: ${e.message}${RESET}`);
    }
  }

  return jobs;
}

function applyDefaults(raw: Partial<Job>): Job {
  return {
    id: raw.id || "unnamed",
    name: raw.name || raw.id || "Unnamed Job",
    enabled: raw.enabled ?? (JOB_DEFAULTS.enabled as boolean),
    schedule: raw.schedule || "@daily",
    timezone: raw.timezone || (JOB_DEFAULTS.timezone as string),
    type: raw.type || "script",
    command: raw.command || "",
    working_dir: raw.working_dir,
    timeout: raw.timeout ?? (JOB_DEFAULTS.timeout as number),
    owner: raw.owner || "unknown",
    purpose: raw.purpose || "",
    sla: raw.sla,
    depends_on: raw.depends_on || [],
    resources: raw.resources || [],
    retry: { ...(JOB_DEFAULTS.retry as any), ...(raw.retry || {}) },
    on_failure: raw.on_failure || "notify",
    notify_on: raw.notify_on || ["failure"],
    notify_channels: raw.notify_channels || [],
    secrets_required: raw.secrets_required || [],
    concurrency: raw.concurrency || "forbid",
    persistent: raw.persistent ?? true,
  };
}

/** Minimal YAML parser for scheduler.yaml files (handles our specific schema) */
function parseSchedulerYaml(content: string): ProjectSchedulerFile {
  const lines = content.split("\n");
  const result: ProjectSchedulerFile = { version: "1.0", jobs: [] };
  let currentJob: Record<string, any> | null = null;
  let currentSection = "";
  let currentArray: string[] | null = null;
  let currentArrayKey = "";

  for (const line of lines) {
    const raw = line.trimEnd();
    if (!raw || raw.trimStart().startsWith("#")) continue;
    const trimmed = raw.trimStart();
    const indent = raw.length - trimmed.length;

    // Top-level keys
    if (indent === 0) {
      if (trimmed.startsWith("version:")) {
        result.version = cleanYamlValue(trimmed.split(":").slice(1).join(":"));
      } else if (trimmed === "jobs:") {
        currentSection = "jobs";
      }
      continue;
    }

    if (currentSection !== "jobs") continue;

    // New job item
    if (trimmed.startsWith("- ")) {
      if (currentJob) {
        if (currentArray && currentArrayKey) {
          currentJob[currentArrayKey] = currentArray;
        }
        result.jobs.push(currentJob as Partial<Job>);
      }
      currentJob = {};
      currentArray = null;
      currentArrayKey = "";
      const kv = trimmed.slice(2).match(/^(\w+):\s*(.*)/);
      if (kv) currentJob[kv[1]] = parseYamlValue(kv[2]);
      continue;
    }

    if (!currentJob) continue;

    // Array items within a job
    if (trimmed.startsWith("- ") || (indent >= 6 && trimmed.match(/^\s*-\s/))) {
      const val = trimmed.replace(/^\s*-\s*/, "").trim();
      if (currentArray) {
        currentArray.push(cleanYamlValue(val));
      }
      continue;
    }

    // Nested object (retry, etc.)
    const kvMatch = trimmed.match(/^\s*(\w+):\s*(.*)/);
    if (kvMatch) {
      const key = kvMatch[1];
      const val = kvMatch[2].trim();

      if (val === "" || val === "[]") {
        // Start of array or empty
        if (val === "[]") {
          currentJob[key] = [];
        } else {
          currentArray = [];
          currentArrayKey = key;
        }
      } else if (indent >= 6 && currentJob.retry && typeof currentJob.retry === "object") {
        // Nested under retry
        (currentJob.retry as Record<string, any>)[key] = parseYamlValue(val);
      } else if (indent >= 4 && currentArrayKey && currentArray === null) {
        // Nested object field
        if (!currentJob[currentArrayKey]) currentJob[currentArrayKey] = {};
        (currentJob[currentArrayKey] as Record<string, any>)[key] = parseYamlValue(val);
      } else {
        if (currentArray && currentArrayKey) {
          currentJob[currentArrayKey] = currentArray;
          currentArray = null;
          currentArrayKey = "";
        }
        if (key === "retry") {
          currentJob.retry = {};
          currentArrayKey = "retry";
        } else {
          currentJob[key] = parseYamlValue(val);
        }
      }
    }
  }

  // Flush last job
  if (currentJob) {
    if (currentArray && currentArrayKey) {
      currentJob[currentArrayKey] = currentArray;
    }
    result.jobs.push(currentJob as Partial<Job>);
  }

  return result;
}

function cleanYamlValue(val: string): string {
  return val.replace(/^["']|["']$/g, "").trim();
}

function parseYamlValue(val: string): any {
  const cleaned = cleanYamlValue(val);
  if (cleaned === "true") return true;
  if (cleaned === "false") return false;
  if (cleaned === "[]") return [];
  if (/^\d+$/.test(cleaned)) return parseInt(cleaned);
  if (/^\d+\.\d+$/.test(cleaned)) return parseFloat(cleaned);
  return cleaned;
}

// ── Validation ──────────────────────────────────────────────

function validateJob(job: QualifiedJob): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!job.id) errors.push({ field: "id", message: "Job ID is required", job_id: job.qualified_id });
  if (!job.schedule) errors.push({ field: "schedule", message: "Schedule is required", job_id: job.qualified_id });
  if (!job.command) errors.push({ field: "command", message: "Command is required", job_id: job.qualified_id });
  if (!job.owner) errors.push({ field: "owner", message: "Owner is required", job_id: job.qualified_id });
  if (!job.purpose) errors.push({ field: "purpose", message: "Purpose is required", job_id: job.qualified_id });

  // Cron syntax
  const cronError = validateCron(job.schedule);
  if (cronError) errors.push({ field: "schedule", message: `Invalid cron: ${cronError}`, job_id: job.qualified_id });

  // Timeout range
  if (job.timeout < 10 || job.timeout > 3600) {
    errors.push({ field: "timeout", message: `Timeout must be 10-3600s, got ${job.timeout}`, job_id: job.qualified_id });
  }

  // Type
  if (!["script", "skill", "tool", "webhook"].includes(job.type)) {
    errors.push({ field: "type", message: `Invalid type: ${job.type}`, job_id: job.qualified_id });
  }

  // Command existence (for script/tool types)
  if (job.type === "tool") {
    const toolPath = join(getBaseDir(), "tools", job.command);
    if (!existsSync(toolPath)) warnings.push(`Tool not found: ${job.command}`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ── Commands ────────────────────────────────────────────────

function cmdList(projectFilter?: string): void {
  const jobs = loadProjectJobs();
  const filtered = projectFilter ? jobs.filter(j => j.project_id === projectFilter) : jobs;

  if (filtered.length === 0) {
    console.log(`${DIM}  No scheduled jobs found.${RESET}`);
    return;
  }

  console.log(`\n${BOLD}${CYAN}🕐 Poseidon Scheduler — Registered Jobs${RESET}\n`);

  const header = `  ${BOLD}${"Job ID".padEnd(28)}${"Schedule".padEnd(16)}${"Type".padEnd(10)}${"Status".padEnd(10)}${"Owner".padEnd(12)}${RESET}`;
  console.log(header);
  console.log(`  ${"─".repeat(76)}`);

  for (const job of filtered) {
    const status = job.enabled ? `${GREEN}active${RESET}` : `${DIM}disabled${RESET}`;
    const next = job.enabled ? nextFire(job.schedule) : null;
    const nextStr = next ? ` (next: ${timeAgo(next)})` : "";

    console.log(
      `  ${job.qualified_id.padEnd(28)}${job.schedule.padEnd(16)}${job.type.padEnd(10)}${(job.enabled ? "active" : "disabled").padEnd(10)}${job.owner.padEnd(12)}${DIM}${nextStr}${RESET}`
    );
  }

  console.log(`\n  ${DIM}Total: ${filtered.length} jobs${RESET}\n`);
}

function cmdValidate(): void {
  const jobs = loadProjectJobs();
  console.log(`\n${BOLD}${CYAN}⚖️  Poseidon Scheduler — Validation${RESET}\n`);

  let totalErrors = 0;
  let totalWarnings = 0;

  for (const job of jobs) {
    const result = validateJob(job);
    if (result.valid && result.warnings.length === 0) {
      console.log(`  ${GREEN}✓${RESET} ${job.qualified_id}`);
    } else {
      for (const err of result.errors) {
        console.log(`  ${RED}✗${RESET} ${job.qualified_id}: ${err.field} — ${err.message}`);
        totalErrors++;
      }
      for (const warn of result.warnings) {
        console.log(`  ${YELLOW}⚠${RESET} ${job.qualified_id}: ${warn}`);
        totalWarnings++;
      }
    }
  }

  console.log(`\n  ${totalErrors > 0 ? RED : GREEN}${jobs.length} jobs, ${totalErrors} errors, ${totalWarnings} warnings${RESET}\n`);

  if (totalErrors > 0) process.exit(1);
}

function cmdGenerate(): void {
  const jobs = loadProjectJobs();
  const enabledJobs = jobs.filter(j => j.enabled);
  const baseDir = getBaseDir();

  console.log(`\n${BOLD}${CYAN}⚙️  Generating systemd units for ${enabledJobs.length} jobs${RESET}\n`);

  // Validate first
  let hasErrors = false;
  for (const job of enabledJobs) {
    const result = validateJob(job);
    if (!result.valid) {
      for (const err of result.errors) {
        console.log(`  ${RED}✗${RESET} ${job.qualified_id}: ${err.message}`);
      }
      hasErrors = true;
    }
  }
  if (hasErrors) {
    console.log(`\n  ${RED}Fix validation errors before generating units.${RESET}\n`);
    process.exit(1);
  }

  for (const job of enabledJobs) {
    try {
      const result = writeUnits(job, baseDir);
      console.log(`  ${GREEN}✓${RESET} ${job.qualified_id}`);
      console.log(`    ${DIM}Timer:   ${result.timerPath}${RESET}`);
      console.log(`    ${DIM}Service: ${result.servicePath}${RESET}`);
    } catch (e: any) {
      console.log(`  ${RED}✗${RESET} ${job.qualified_id}: ${e.message}`);
    }
  }

  console.log(`\n  ${DIM}Run 'systemctl --user daemon-reload' to load new units.${RESET}`);
  console.log(`  ${DIM}Then 'bun tools/scheduler.ts enable <job-id>' to start timers.${RESET}\n`);
}

function cmdStatus(): void {
  console.log(`\n${BOLD}${CYAN}🕐 Poseidon Scheduler — Timer Status${RESET}\n`);
  try {
    const output = execSync("systemctl --user list-timers 'poseidon-sched-*' --no-pager 2>/dev/null", { encoding: "utf-8" });
    if (output.trim()) {
      console.log(output);
    } else {
      console.log(`  ${DIM}No Poseidon scheduler timers active.${RESET}\n`);
    }
  } catch {
    console.log(`  ${DIM}No Poseidon scheduler timers active.${RESET}\n`);
  }
}

function cmdFire(jobId: string): void {
  const jobs = loadProjectJobs();
  const job = jobs.find(j => j.qualified_id === jobId || j.id === jobId);

  if (!job) {
    console.error(`${RED}Job not found: ${jobId}${RESET}`);
    console.error(`Available: ${jobs.map(j => j.qualified_id).join(", ")}`);
    process.exit(1);
  }

  console.log(`\n${BOLD}🔥 Firing ${job.qualified_id} immediately${RESET}\n`);

  const name = unitName(job);
  try {
    execSync(`systemctl --user start ${name}.service`, { stdio: "inherit" });
    console.log(`\n  ${GREEN}✓${RESET} Job triggered via systemd. Check logs with: bun tools/scheduler.ts history ${job.qualified_id}\n`);
  } catch {
    // Fallback: run directly
    console.log(`  ${YELLOW}systemd unit not found, running directly...${RESET}\n`);
    const baseDir = getBaseDir();
    const configB64 = Buffer.from(JSON.stringify({
      job_id: job.qualified_id,
      project_id: job.project_id,
      command: job.command,
      type: job.type,
      working_dir: job.working_dir,
      timeout: job.timeout,
      secrets_required: job.secrets_required,
      concurrency: job.concurrency,
    })).toString("base64");

    try {
      execSync(`bun ${join(baseDir, "scheduler", "job-runner.ts")} --config-b64 ${configB64}`, {
        stdio: "inherit",
        env: { ...process.env, POSEIDON_DIR: baseDir },
      });
      console.log(`\n  ${GREEN}✓${RESET} Job completed.\n`);
    } catch (e: any) {
      console.log(`\n  ${RED}✗${RESET} Job failed. Check logs.\n`);
    }
  }
}

function cmdEnable(jobId: string): void {
  const jobs = loadProjectJobs();
  const job = jobs.find(j => j.qualified_id === jobId || j.id === jobId);
  if (!job) { console.error(`${RED}Job not found: ${jobId}${RESET}`); process.exit(1); }

  const name = unitName(job);
  try {
    execSync(`systemctl --user enable --now ${name}.timer`, { stdio: "inherit" });
    console.log(`${GREEN}✓${RESET} Timer ${name}.timer enabled and started.`);
  } catch (e: any) {
    console.error(`${RED}Failed to enable timer. Did you run 'bun tools/scheduler.ts generate' first?${RESET}`);
  }
}

function cmdDisable(jobId: string): void {
  const jobs = loadProjectJobs();
  const job = jobs.find(j => j.qualified_id === jobId || j.id === jobId);
  if (!job) { console.error(`${RED}Job not found: ${jobId}${RESET}`); process.exit(1); }

  const name = unitName(job);
  try {
    execSync(`systemctl --user disable --now ${name}.timer`, { stdio: "inherit" });
    console.log(`${GREEN}✓${RESET} Timer ${name}.timer disabled and stopped.`);
  } catch (e: any) {
    console.error(`${RED}Failed to disable timer.${RESET}`);
  }
}

function cmdHistory(jobFilter?: string): void {
  const stateDir = join(getBaseDir(), "scheduler", "state");
  const history = readHistory(stateDir, 20, jobFilter);

  console.log(`\n${BOLD}${CYAN}📋 Run History${jobFilter ? ` — ${jobFilter}` : ""}${RESET}\n`);

  if (history.length === 0) {
    console.log(`  ${DIM}No run history found.${RESET}\n`);
    return;
  }

  console.log(`  ${BOLD}${"Run ID".padEnd(28)}${"Job".padEnd(24)}${"Status".padEnd(10)}${"Duration".padEnd(12)}${"Exit".padEnd(6)}${RESET}`);
  console.log(`  ${"─".repeat(80)}`);

  for (const run of history) {
    const statusColor = run.status === "success" ? GREEN : run.status === "skipped" ? YELLOW : RED;
    const duration = `${(run.duration_ms / 1000).toFixed(1)}s`;

    console.log(
      `  ${run.run_id.padEnd(28)}${run.job_id.padEnd(24)}${statusColor}${run.status.padEnd(10)}${RESET}${duration.padEnd(12)}${run.exit_code}`
    );
  }

  console.log();
}

function timeAgo(date: Date): string {
  const diff = date.getTime() - Date.now();
  if (diff < 0) return "overdue";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

// ── Main ────────────────────────────────────────────────────

function printHelp(): void {
  console.log(`
${BOLD}scheduler${RESET} — Poseidon master scheduler CLI

${BOLD}USAGE${RESET}
  bun tools/scheduler.ts <command> [options]

${BOLD}COMMANDS${RESET}
  list [--project <id>]    List all registered jobs
  validate                 Validate all project scheduler.yaml files
  generate                 Generate systemd timer+service units
  status                   Show systemd timer status
  fire <job-id>            Trigger a job immediately
  enable <job-id>          Enable a job's systemd timer
  disable <job-id>         Disable a job's systemd timer
  history [job-id]         Show run history

${BOLD}EXAMPLES${RESET}
  bun tools/scheduler.ts list
  bun tools/scheduler.ts validate
  bun tools/scheduler.ts generate
  bun tools/scheduler.ts fire alpha:daily-refresh
  bun tools/scheduler.ts enable alpha:daily-refresh
  bun tools/scheduler.ts history alpha:daily-refresh
`);
}

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case "list":
    cmdList(args.includes("--project") ? args[args.indexOf("--project") + 1] : undefined);
    break;
  case "validate":
    cmdValidate();
    break;
  case "generate":
    cmdGenerate();
    break;
  case "status":
    cmdStatus();
    break;
  case "fire":
    if (!args[1]) { console.error("Usage: scheduler.ts fire <job-id>"); process.exit(1); }
    cmdFire(args[1]);
    break;
  case "enable":
    if (!args[1]) { console.error("Usage: scheduler.ts enable <job-id>"); process.exit(1); }
    cmdEnable(args[1]);
    break;
  case "disable":
    if (!args[1]) { console.error("Usage: scheduler.ts disable <job-id>"); process.exit(1); }
    cmdDisable(args[1]);
    break;
  case "history":
    cmdHistory(args[1]);
    break;
  case "--help":
  case "-h":
  case "help":
  case undefined:
    printHelp();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(1);
}
