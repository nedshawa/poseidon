/**
 * types.ts — Core types for the Poseidon Scheduler system.
 *
 * The scheduler uses a hybrid architecture:
 *   - systemd timers handle scheduling, isolation, and restart
 *   - job-runner.ts handles secret injection, output capture, and scrubbing
 *   - tools/scheduler.ts handles validation, unit generation, and lifecycle
 */

// ── Job Definition (from project scheduler.yaml) ────────────

export interface Job {
  id: string;
  name: string;
  enabled: boolean;
  schedule: string; // 5-field POSIX cron or alias
  timezone: string; // IANA timezone (default: UTC)
  type: JobType;
  command: string;
  working_dir?: string;
  timeout: number; // seconds (default: 600)

  // Metadata
  owner: string;
  purpose: string;
  sla?: string;

  // Dependencies
  depends_on: string[];
  resources: string[];

  // Error handling
  retry: RetryPolicy;
  on_failure: "notify" | "disable" | "escalate";

  // Notifications
  notify_on: ("failure" | "recovery" | "success")[];
  notify_channels: string[];

  // Secrets
  secrets_required: string[];

  // Concurrency
  concurrency: "forbid" | "allow" | "replace";

  // Missed execution recovery
  persistent: boolean;
}

export type JobType = "script" | "skill" | "tool" | "webhook";

export interface RetryPolicy {
  max_attempts: number;
  backoff: "fixed" | "linear" | "exponential" | "exponential_jitter";
  initial_delay: number; // seconds
  max_delay: number; // seconds
}

// ── Job with project context ────────────────────────────────

export interface QualifiedJob extends Job {
  project_id: string;
  qualified_id: string; // project_id:id
  source_file: string; // absolute path to scheduler.yaml
}

// ── Run Results ─────────────────────────────────────────────

export interface RunResult {
  ts: string; // ISO 8601
  job_id: string;
  run_id: string;
  project_id: string;
  status: "success" | "failure" | "timeout" | "skipped" | "killed";
  exit_code: number;
  duration_ms: number;
  stdout_bytes: number;
  stderr_bytes: number;
  error?: string;
  retry_attempt: number;
  trigger: "schedule" | "manual" | "dependency" | "retry";
}

// ── Scheduler Config (from settings.json) ───────────────────

export interface SchedulerConfig {
  enabled: boolean;
  unit_dir: string; // where to write systemd units
  max_concurrent_jobs: number;
  resource_limits: Record<string, ResourceLimit>;
  circuit_breaker: {
    warn_threshold: number;
    disable_threshold: number;
  };
  log_rotation: {
    daemon_max_size_mb: number;
    daemon_retention_days: number;
    run_retention_days: number;
  };
}

export interface ResourceLimit {
  max_concurrent: number;
  rate_limit?: string;
}

// ── Project Scheduler File ──────────────────────────────────

export interface ProjectSchedulerFile {
  version: string;
  jobs: Partial<Job>[];
}

// ── Validation ──────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

export interface ValidationError {
  field: string;
  message: string;
  job_id?: string;
}

// ── Defaults ────────────────────────────────────────────────

export const JOB_DEFAULTS: Partial<Job> = {
  enabled: true,
  timezone: "UTC",
  timeout: 600,
  depends_on: [],
  resources: [],
  retry: {
    max_attempts: 3,
    backoff: "exponential",
    initial_delay: 30,
    max_delay: 300,
  },
  on_failure: "notify",
  notify_on: ["failure"],
  notify_channels: [],
  secrets_required: [],
  concurrency: "forbid",
  persistent: true,
};
