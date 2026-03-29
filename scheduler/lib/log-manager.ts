/**
 * log-manager.ts — Structured JSONL logging for scheduler job runs.
 */

import { appendFileSync, mkdirSync, existsSync, readdirSync, statSync, unlinkSync, readFileSync } from "fs";
import { join, dirname } from "path";
import type { RunResult } from "./types";

export function ensureLogDirs(logsDir: string): void {
  const schedulerLogs = join(logsDir, "scheduler");
  const runsDir = join(schedulerLogs, "runs");
  if (!existsSync(schedulerLogs)) mkdirSync(schedulerLogs, { recursive: true });
  if (!existsSync(runsDir)) mkdirSync(runsDir, { recursive: true });
}

/** Append a run result to the history JSONL */
export function logRun(stateDir: string, result: RunResult): void {
  const historyPath = join(stateDir, "run-history.jsonl");
  const dir = dirname(historyPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  appendFileSync(historyPath, JSON.stringify(result) + "\n");
}

/** Write per-run output capture log */
export function writeRunLog(
  logsDir: string,
  jobId: string,
  runId: string,
  meta: { command: string; project: string; timeout: number },
  stdout: string,
  stderr: string,
  exitCode: number,
  durationMs: number,
): string {
  const jobDir = join(logsDir, "scheduler", "runs", jobId.replace(":", "_"));
  if (!existsSync(jobDir)) mkdirSync(jobDir, { recursive: true });

  const logPath = join(jobDir, `${runId}.log`);
  const status = exitCode === 0 ? "SUCCESS" : "FAILURE";

  const content = `═══ JOB RUN: ${jobId} ═══
Run ID:    ${runId}
Started:   ${new Date().toISOString()}
Command:   ${meta.command}
Project:   ${meta.project}
Timeout:   ${meta.timeout}s

═══ STDOUT ═══
${stdout || "(empty)"}

═══ STDERR ═══
${stderr || "(empty)"}

═══ RESULT ═══
Exit code: ${exitCode}
Duration:  ${(durationMs / 1000).toFixed(3)}s
Status:    ${status}
`;

  const { writeFileSync: wfs } = require("fs");
  wfs(logPath, content);
  return logPath;
}

/** Read recent run history entries */
export function readHistory(stateDir: string, limit = 20, jobFilter?: string): RunResult[] {
  const historyPath = join(stateDir, "run-history.jsonl");
  if (!existsSync(historyPath)) return [];

  const lines = readFileSync(historyPath, "utf-8").trim().split("\n").filter(Boolean);
  const results: RunResult[] = [];

  // Read from end for recency
  for (let i = lines.length - 1; i >= 0 && results.length < limit; i--) {
    try {
      const entry = JSON.parse(lines[i]) as RunResult;
      if (!jobFilter || entry.job_id === jobFilter) {
        results.push(entry);
      }
    } catch { /* skip malformed */ }
  }

  return results;
}

/** Rotate old run logs beyond retention days */
export function rotateRunLogs(logsDir: string, retentionDays: number): number {
  const runsDir = join(logsDir, "scheduler", "runs");
  if (!existsSync(runsDir)) return 0;

  const cutoff = Date.now() - retentionDays * 86_400_000;
  let removed = 0;

  for (const jobDir of readdirSync(runsDir)) {
    const fullJobDir = join(runsDir, jobDir);
    try {
      if (!statSync(fullJobDir).isDirectory()) continue;
      for (const logFile of readdirSync(fullJobDir)) {
        const logPath = join(fullJobDir, logFile);
        try {
          if (statSync(logPath).mtimeMs < cutoff) {
            unlinkSync(logPath);
            removed++;
          }
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
  }

  return removed;
}
