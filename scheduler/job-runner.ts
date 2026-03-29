#!/usr/bin/env bun
/**
 * job-runner.ts — Thin execution wrapper for scheduled jobs.
 *
 * Called by systemd service units. Handles:
 *   1. Secret injection via stdin pipe
 *   2. Buffered stdout/stderr capture
 *   3. Output scrubbing for leaked secrets
 *   4. Structured JSONL run logging
 *
 * Usage: bun scheduler/job-runner.ts --config-b64 <base64-encoded-job-config>
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { logRun, writeRunLog, ensureLogDirs } from "./lib/log-manager";

// ── Parse config from CLI args ──────────────────────────────

const configIdx = process.argv.indexOf("--config-b64");
if (configIdx === -1 || !process.argv[configIdx + 1]) {
  console.error("Usage: bun scheduler/job-runner.ts --config-b64 <base64>");
  process.exit(1);
}

interface JobConfig {
  job_id: string;
  project_id: string;
  command: string;
  type: string;
  working_dir: string;
  timeout: number;
  secrets_required: string[];
  concurrency: string;
}

const config: JobConfig = JSON.parse(
  Buffer.from(process.argv[configIdx + 1], "base64").toString("utf-8")
);

const poseidonDir = process.env.POSEIDON_DIR || join(require("os").homedir(), ".poseidon");
const logsDir = join(poseidonDir, "logs");
const stateDir = join(poseidonDir, "scheduler", "state");
const runId = `run-${new Date().toISOString().replace(/[:.]/g, "").slice(0, 15)}`;

ensureLogDirs(logsDir);

// ── Concurrency check via lock file ─────────────────────────

const lockDir = join(stateDir, "locks");
if (!existsSync(lockDir)) {
  const { mkdirSync } = require("fs");
  mkdirSync(lockDir, { recursive: true });
}

const lockPath = join(lockDir, `${config.job_id.replace(":", "_")}.lock`);

if (config.concurrency === "forbid" && existsSync(lockPath)) {
  // Check if lock is stale (older than timeout + 60s buffer)
  try {
    const lockAge = Date.now() - require("fs").statSync(lockPath).mtimeMs;
    if (lockAge < (config.timeout + 60) * 1000) {
      console.error(`Job ${config.job_id} is already running (lock exists). Skipping.`);
      logRun(stateDir, {
        ts: new Date().toISOString(),
        job_id: config.job_id,
        run_id: runId,
        project_id: config.project_id,
        status: "skipped",
        exit_code: -1,
        duration_ms: 0,
        stdout_bytes: 0,
        stderr_bytes: 0,
        error: "Skipped: previous run still in progress (concurrency=forbid)",
        retry_attempt: 0,
        trigger: "schedule",
      });
      process.exit(0);
    }
  } catch { /* stale lock, proceed */ }
}

// Write lock
require("fs").writeFileSync(lockPath, String(process.pid));

// ── Load secrets from age store ─────────────────────────────

async function loadSecrets(required: string[]): Promise<Record<string, string>> {
  if (required.length === 0) return {};

  const secrets: Record<string, string> = {};
  try {
    // Dynamic import to avoid hard dependency
    const { SecretClient } = await import(join(poseidonDir, "hooks", "handlers", "secret-client"));
    const client = new SecretClient();

    for (const name of required) {
      try {
        const value = await client.read("scheduler", name);
        if (value) secrets[name] = value;
      } catch {
        // Try reading from the general secrets path
        try {
          const value = await client.read("api_keys", name.toLowerCase());
          if (value) secrets[name] = value;
        } catch { /* secret not found — job may fail */ }
      }
    }
  } catch (e: any) {
    console.error(`[job-runner] Warning: Could not load secrets: ${e.message}`);
  }

  return secrets;
}

// ── Scrub secrets from output ───────────────────────────────

function scrubOutput(text: string, secrets: Record<string, string>): string {
  let scrubbed = text;
  for (const [name, value] of Object.entries(secrets)) {
    if (value && value.length > 8) {
      scrubbed = scrubbed.replace(new RegExp(escapeRegex(value), "g"), `[REDACTED:${name}]`);
    }
  }
  // Also scrub common patterns
  scrubbed = scrubbed.replace(/(?:sk-|ghp_|pplx-|AKIA)[A-Za-z0-9_\-]{20,}/g, "[REDACTED:detected_key]");
  return scrubbed;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── Build command args ──────────────────────────────────────

function buildCommandArgs(config: JobConfig): string[] {
  switch (config.type) {
    case "skill":
      return ["bun", join(poseidonDir, "tools", "skill-runner.ts"), config.command];
    case "tool":
      return ["bun", join(poseidonDir, "tools", config.command)];
    case "script":
    default: {
      // Shell-aware split respecting quotes
      const args: string[] = [];
      let current = "";
      let inQuote = "";
      for (const ch of config.command) {
        if (ch === '"' || ch === "'") {
          if (inQuote === ch) { inQuote = ""; continue; }
          if (!inQuote) { inQuote = ch; continue; }
        }
        if (ch === " " && !inQuote) {
          if (current) args.push(current);
          current = "";
          continue;
        }
        current += ch;
      }
      if (current) args.push(current);
      return args;
    }
  }
}

// ── Execute ─────────────────────────────────────────────────

async function run(): Promise<void> {
  const startTime = Date.now();
  const secrets = await loadSecrets(config.secrets_required);
  const commandArgs = buildCommandArgs(config);

  console.error(`[job-runner] Running ${config.job_id}: ${commandArgs.join(" ")}`);

  const hasSecrets = Object.keys(secrets).length > 0;

  const proc = Bun.spawn(commandArgs, {
    cwd: config.working_dir,
    stdin: hasSecrets ? "pipe" : "ignore",
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      POSEIDON_JOB_ID: config.job_id,
      POSEIDON_PROJECT: config.project_id,
      POSEIDON_RUN_ID: runId,
    },
  });

  // Inject secrets via stdin pipe
  if (hasSecrets && proc.stdin) {
    proc.stdin.write(JSON.stringify(secrets) + "\n");
    proc.stdin.flush();
    proc.stdin.end();
  }

  // Set up timeout
  const timeoutId = setTimeout(() => {
    proc.kill("SIGTERM");
    setTimeout(() => {
      try { proc.kill("SIGKILL"); } catch { /* already dead */ }
    }, 5000);
  }, config.timeout * 1000);

  // Wait for completion
  const exitCode = await proc.exited;
  clearTimeout(timeoutId);

  const durationMs = Date.now() - startTime;

  // Buffer stdout/stderr completely before scrubbing
  const stdoutText = await new Response(proc.stdout).text();
  const stderrText = await new Response(proc.stderr).text();

  // Scrub secrets from output
  const scrubbedStdout = scrubOutput(stdoutText, secrets);
  const scrubbedStderr = scrubOutput(stderrText, secrets);

  // Classify status
  let status: "success" | "failure" | "timeout" | "killed" = "success";
  if (exitCode === 124 || exitCode === 137 || exitCode === 143) {
    status = "timeout";
  } else if (exitCode !== 0) {
    status = "failure";
  }

  // Write per-run log
  writeRunLog(
    logsDir,
    config.job_id,
    runId,
    { command: commandArgs.join(" "), project: config.project_id, timeout: config.timeout },
    scrubbedStdout,
    scrubbedStderr,
    exitCode,
    durationMs,
  );

  // Write structured JSONL entry
  logRun(stateDir, {
    ts: new Date().toISOString(),
    job_id: config.job_id,
    run_id: runId,
    project_id: config.project_id,
    status,
    exit_code: exitCode,
    duration_ms: durationMs,
    stdout_bytes: scrubbedStdout.length,
    stderr_bytes: scrubbedStderr.length,
    error: status !== "success" ? scrubbedStderr.slice(0, 500) : undefined,
    retry_attempt: 0,
    trigger: "schedule",
  });

  // Clean up lock
  try { require("fs").unlinkSync(lockPath); } catch { /* already gone */ }

  // Forward exit code
  process.exit(exitCode);
}

run().catch((e) => {
  console.error(`[job-runner] Fatal: ${e.message}`);
  try { require("fs").unlinkSync(lockPath); } catch {}
  logRun(stateDir, {
    ts: new Date().toISOString(),
    job_id: config.job_id,
    run_id: runId,
    project_id: config.project_id,
    status: "failure",
    exit_code: 1,
    duration_ms: 0,
    stdout_bytes: 0,
    stderr_bytes: 0,
    error: e.message,
    retry_attempt: 0,
    trigger: "schedule",
  });
  process.exit(1);
});
