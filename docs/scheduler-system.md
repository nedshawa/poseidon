# Poseidon Scheduler System

## Overview

The Scheduler is Poseidon's **master cron management service** — a centralized daemon that owns all scheduled jobs across all projects. No project may run recurring tasks outside this system. The Scheduler is the single authority for when, how, and under what conditions scheduled work executes.

**Architectural position:** The Scheduler introduces a **Services sublayer** within the Execution layer, formalizing the daemon pattern already established by the Dashboard.

```
┌──────────────────────────────────────────────────┐
│  CONSTITUTIONAL    Founding Principles + Rules    │
└──────────────────────────────────────────────────┘
          ↓ governs
┌──────────────────────────────────────────────────┐
│  GOVERNANCE        Regimes (REGISTRY.yaml)        │
│                    + scheduler-integrity regime    │
└──────────────────────────────────────────────────┘
          ↓ enforced by
┌──────────────────────────────────────────────────┐
│  EXECUTION                                        │
│    ├── Hooks (lifecycle handlers)                  │
│    ├── Skills (domain expertise)                   │
│    ├── Tools (CLI utilities)                       │
│    └── Services (persistent daemons) ← NEW        │
│         ├── Dashboard (Bun.serve, port 3456)       │
│         └── Scheduler (Bun daemon, manages jobs)   │
└──────────────────────────────────────────────────┘
          ↓ operates on
┌──────────────────────────────────────────────────┐
│  STATE             Memory + Algorithm + Secrets   │
│                    + scheduler/state/             │
└──────────────────────────────────────────────────┘
```

## Founding Principles

The Scheduler adheres to Poseidon's constitutional principles:

1. **Filesystem over databases** — Job definitions in YAML, logs in JSONL, state in plain files. No SQLite, no Redis, no message queues.
2. **Zero external dependencies** — Built with Bun built-ins only. No node-cron, no bull, no agenda. Cron parsing is a ~100-line function, not a dependency.
3. **Fail graceful** — Scheduler crash never corrupts state. Lock files use advisory locking. In-flight job state written atomically.
4. **Project isolation** — Jobs run in project-scoped context. A job from project A cannot read/write project B's memory.
5. **User owns their data** — Job definitions live in project directories (user space). The scheduler aggregates but never auto-creates jobs.

---

## Directory Structure

```
~/projects/poseidon/
├── scheduler/                         # Service implementation
│   ├── daemon.ts                      # Main scheduler daemon entry point
│   ├── poseidon-scheduler.service     # systemd unit file
│   ├── lib/
│   │   ├── types.ts                   # Core interfaces (Job, Schedule, RunResult, etc.)
│   │   ├── cron-parser.ts             # Cron expression parser + validator
│   │   ├── conflict-detector.ts       # Overlap + resource contention detection
│   │   ├── job-runner.ts              # Process isolation + execution
│   │   ├── log-manager.ts            # Structured logging + rotation
│   │   ├── registry-aggregator.ts     # Collect jobs from all projects
│   │   └── health.ts                  # Health check endpoint + watchdog
│   └── state/
│       ├── active-jobs.yaml           # Currently registered + validated jobs (GENERATED)
│       ├── run-history.jsonl          # Append-only execution log
│       └── locks/                     # Per-job advisory locks
│
├── tools/
│   └── scheduler.ts                   # CLI interface for scheduler management
│
├── regimes/
│   └── scheduler-integrity/           # Governance regime
│       ├── REGIME.yaml
│       └── validator.ts
│
├── memory/projects/.template/
│   └── scheduler.yaml                 # Template for project job definitions
│
└── logs/
    └── scheduler/                     # Job execution output capture
        ├── daemon.log                 # Scheduler daemon operational log
        └── runs/
            └── {job-id}/
                └── {timestamp}.log    # Per-run stdout+stderr capture
```

---

## Job Definition Schema

### Per-Project Job File

Each project defines its scheduled jobs in `memory/projects/{project-id}/scheduler.yaml`:

```yaml
# scheduler.yaml — Project job definitions
# Validated by the scheduler-integrity regime before activation.
version: "1.0"

jobs:
  - id: daily-data-refresh
    name: "Daily Data Refresh"
    enabled: true
    schedule: "0 6 * * *"          # 6 AM daily
    timezone: "Australia/Sydney"    # IANA timezone (default: UTC)
    type: script                    # script | skill | tool | webhook
    command: "bun tools/refresh-data.ts"
    working_dir: "/home/user/projects/my-project"
    timeout: 300                    # Max execution time in seconds (default: 600)

    # Metadata (REQUIRED for documentation standard)
    owner: "ned"                    # Who owns this job
    purpose: "Refresh market data from FMP API before trading session"
    sla: "Must complete before 6:30 AM AEST"

    # Dependencies
    depends_on: []                  # Other job IDs that must complete first
    resources:                      # Declared resource usage for conflict detection
      - fmp-api                     # API resource identifier
      - disk-io                     # I/O resource identifier

    # Error handling
    retry:
      max_attempts: 3              # Total attempts (1 = no retry)
      backoff: exponential         # fixed | linear | exponential
      initial_delay: 30            # Seconds before first retry
      max_delay: 300               # Cap on backoff delay
    on_failure: notify             # notify | disable | escalate

    # Notifications
    notify_on:
      - failure                    # Always notify on failure
      - recovery                   # Notify when a previously failing job succeeds
    notify_channels:               # Optional override (default: project's channels)
      - ntfy

    # Secret requirements (injected at runtime, NEVER stored here)
    secrets_required:
      - FMP_API_KEY                # Scheduler injects from age-encrypted store
```

### Job Types

| Type | Description | `command` field | Execution model |
|------|-------------|-----------------|-----------------|
| **script** | Shell command or Bun script | Full command string | `Bun.spawn()` with project working_dir |
| **skill** | Invoke a Poseidon skill | Skill name (e.g., `daily-screener`) | `bun tools/skill-runner.ts {skill}` |
| **tool** | Run a Poseidon CLI tool | Tool file (e.g., `regime-check.ts`) | `bun tools/{tool}` |
| **webhook** | HTTP POST to URL | URL string | `fetch(url, { method: 'POST', body: {...} })` |

### Cron Expression Standard

The scheduler supports **standard 5-field POSIX cron** plus common aliases:

```
┌───────────── minute (0-59)
│ ┌───────────── hour (0-23)
│ │ ┌───────────── day of month (1-31)
│ │ │ ┌───────────── month (1-12 or JAN-DEC)
│ │ │ │ ┌───────────── day of week (0-7, 0 and 7 are Sunday, or SUN-SAT)
│ │ │ │ │
* * * * *
```

**Supported operators:**
- `*` — any value
- `,` — value list separator (e.g., `1,3,5`)
- `-` — range (e.g., `1-5`)
- `/` — step values (e.g., `*/15` = every 15)

**Shortcut aliases:**

| Alias | Equivalent | Description |
|-------|-----------|-------------|
| `@yearly` / `@annually` | `0 0 1 1 *` | Once a year (Jan 1, midnight) |
| `@monthly` | `0 0 1 * *` | First of every month |
| `@weekly` | `0 0 * * 0` | Every Sunday midnight |
| `@daily` / `@midnight` | `0 0 * * *` | Every day at midnight |
| `@hourly` | `0 * * * *` | Every hour |
| `@every Nm` | (computed) | Every N minutes (non-standard but useful) |

**Timezone handling:**
- Each job specifies its own timezone via IANA identifier (e.g., `Australia/Sydney`, `America/New_York`)
- Default is `UTC` if omitted
- **DST transitions:** The scheduler uses the system's `Intl.DateTimeFormat` for timezone resolution. During DST transitions:
  - "Spring forward" (gap): If a job is scheduled for a skipped time (e.g., 2:30 AM during spring forward), it fires at the next valid time
  - "Fall back" (overlap): If a job is scheduled during a repeated hour, it fires only once (first occurrence)
- The scheduler logs a warning when DST transitions affect job timing

**Validation rules:**
- Cron expression must have exactly 5 fields (or be a recognized alias)
- No seconds field — minute granularity only (personal AI, not high-frequency trading)
- Values must be within valid ranges
- Day-of-month 29-31 triggers a warning for months that don't have those days
- Minimum interval: 1 minute. Jobs scheduled more frequently than every minute are rejected.

---

## Registry System

### Two-Level Registry

**Level 1: Project-scoped** — Each project owns its job definitions:
```
memory/projects/{project-id}/scheduler.yaml  # USER-OWNED
```

**Level 2: Aggregated** — The scheduler collects all project jobs into a single view:
```
scheduler/state/active-jobs.yaml  # SYSTEM-GENERATED, read-only for users
```

### Aggregation Process

```
memory/projects/
├── project-alpha/scheduler.yaml   → Jobs: [alpha-refresh, alpha-report]
├── project-beta/scheduler.yaml    → Jobs: [beta-sync]
└── project-gamma/scheduler.yaml   → Jobs: [gamma-screener, gamma-backup]
                                     ↓
                            Registry Aggregator
                                     ↓
                 scheduler/state/active-jobs.yaml
                 (5 jobs, validated, conflict-checked)
```

**Aggregation triggers:**
1. Scheduler daemon startup (full rebuild)
2. File watch on `memory/projects/*/scheduler.yaml` (incremental update)
3. Manual via `bun tools/scheduler.ts rebuild`
4. Session-end hook (validate-only, no activation)

### Job ID Uniqueness

Job IDs are **globally unique** across all projects. Format: `{project-id}:{job-name}` (e.g., `alpha:daily-refresh`). The project prefix is auto-prepended if not present in the project's scheduler.yaml.

If two projects define a job with the same base name (e.g., both have `daily-refresh`), the project prefix distinguishes them (`alpha:daily-refresh` vs `beta:daily-refresh`).

---

## Registration Pipeline

Every job goes through a **5-stage pipeline** before it can execute:

```
DEFINE → VALIDATE → CHECK → APPROVE → ACTIVATE
  ↑                                        |
  └── REJECT (with reason) ←───────────────┘
```

### Stage 1: DEFINE
User adds a job entry to their project's `scheduler.yaml`. No system interaction required — this is pure file editing.

### Stage 2: VALIDATE (automatic)
When the scheduler detects a change to any `scheduler.yaml`, it validates:

| Check | What it validates | Failure action |
|-------|------------------|----------------|
| **Schema** | All required fields present, types correct | Reject with field-level errors |
| **Cron syntax** | Expression parses correctly | Reject with parse error + suggestion |
| **Command exists** | Script/tool/skill path resolves | Reject with "command not found" |
| **Timeout range** | 10s ≤ timeout ≤ 3600s | Reject if out of range |
| **Secret availability** | Required secrets exist in age store | Warn (job can still register) |
| **Duplicate ID** | No other job has same fully-qualified ID | Reject with conflict details |

### Stage 3: CHECK (conflict detection)
See [Conflict Detection](#conflict-detection) section below.

### Stage 4: APPROVE
New jobs require **explicit user approval** before activation:

```bash
$ bun tools/scheduler.ts pending
┌─────────────────────────────────────────────────────────┐
│ Pending Jobs (require approval)                          │
├───────────────────┬──────────┬────────────┬──────────────┤
│ Job ID            │ Schedule │ Type       │ Project      │
├───────────────────┼──────────┼────────────┼──────────────┤
│ alpha:daily-sync  │ 0 6 * *  │ script     │ alpha        │
│ beta:weekly-report│ 0 9 * * 1│ skill      │ beta         │
└───────────────────┴──────────┴────────────┴──────────────┘

$ bun tools/scheduler.ts approve alpha:daily-sync
✅ Job alpha:daily-sync approved and activated.
```

**Bypass for trusted updates:** If a job is already approved and the user only changes the schedule or timeout (not the command), re-approval is not required. Changing the command or adding new secret requirements triggers re-approval.

### Stage 5: ACTIVATE
Job is added to the scheduler's active set. The daemon picks it up on its next tick (≤60 seconds).

---

## Conflict Detection

### Types of Conflicts

**1. Time Overlap (same resource)**
Two jobs that declare the same resource AND whose execution windows overlap:

```
Job A: 0 6 * * * (6:00 AM, timeout 300s → window 6:00-6:05)
Job B: 0 6 * * * (6:00 AM, timeout 600s → window 6:00-6:10)
Both declare resource: fmp-api

CONFLICT: Both hit fmp-api simultaneously
Resolution: Stagger Job B to 6:10 AM or add dependency A → B
```

**Detection algorithm:**
```
For each pair of jobs (A, B):
  if A.resources ∩ B.resources ≠ ∅:
    for each matching schedule time in next 7 days:
      windowA = [fire_time_A, fire_time_A + timeout_A]
      windowB = [fire_time_B, fire_time_B + timeout_B]
      if windowA ∩ windowB ≠ ∅:
        report CONFLICT (A, B, overlapping_resource, overlap_window)
```

**2. Dependency Cycle**
Circular dependency chains:

```
Job A depends_on: [B]
Job B depends_on: [C]
Job C depends_on: [A]

CONFLICT: Circular dependency A → B → C → A
Resolution: Break the cycle by removing one dependency
```

**Detection:** Topological sort. If sort fails, report the cycle.

**3. Resource Contention**
Too many jobs requesting the same resource in the same time window:

```yaml
# Resource limits (defined in scheduler config)
resource_limits:
  fmp-api:
    max_concurrent: 2
    rate_limit: "300/hour"
  disk-io:
    max_concurrent: 3
  cpu-heavy:
    max_concurrent: 1
```

If more than `max_concurrent` jobs declare a resource in overlapping windows → warning.

### Conflict Resolution Strategies

| Strategy | When used | Description |
|----------|-----------|-------------|
| **Reject** | Duplicate IDs, circular deps | Job cannot be registered until fixed |
| **Warn** | Resource contention below threshold | Job registered with warning in logs |
| **Queue** | Resource contention at threshold | Job waits for resource availability |
| **Priority** | Same resource, tight overlap | Higher priority job runs first |

Job priority is determined by: `depends_on` chain depth → explicit `priority` field (1-10, default 5) → registration order.

---

## Logging Standard

### Daemon Log

**Location:** `logs/scheduler/daemon.log`
**Format:** JSONL (one JSON object per line)
**Rotation:** Daily, 30-day retention, max 50MB per file

```jsonl
{"ts":"2026-03-29T06:00:00.123Z","level":"info","event":"daemon_start","version":"1.0.0","pid":12345}
{"ts":"2026-03-29T06:00:00.456Z","level":"info","event":"registry_load","jobs_total":5,"jobs_enabled":4,"jobs_pending":1}
{"ts":"2026-03-29T06:00:01.000Z","level":"info","event":"job_fire","job_id":"alpha:daily-refresh","schedule":"0 6 * * *","run_id":"run-20260329-060001"}
{"ts":"2026-03-29T06:00:31.234Z","level":"info","event":"job_complete","job_id":"alpha:daily-refresh","run_id":"run-20260329-060001","exit_code":0,"duration_ms":30234}
{"ts":"2026-03-29T06:00:01.000Z","level":"error","event":"job_fail","job_id":"beta:sync","run_id":"run-20260329-060001","exit_code":1,"error":"ECONNREFUSED","retry":1,"max_retries":3}
{"ts":"2026-03-29T06:01:00.000Z","level":"warn","event":"conflict_detected","jobs":["alpha:refresh","beta:sync"],"resource":"fmp-api","window":"06:00-06:10"}
{"ts":"2026-03-29T06:00:00.000Z","level":"warn","event":"dst_transition","job_id":"gamma:screener","tz":"Australia/Sydney","action":"skipped_gap","original_time":"02:30","adjusted_time":"03:00"}
```

### Run Log Schema

Each log entry includes:

| Field | Type | Description |
|-------|------|-------------|
| `ts` | ISO 8601 | Timestamp with milliseconds |
| `level` | enum | `debug`, `info`, `warn`, `error`, `fatal` |
| `event` | string | Event type identifier |
| `job_id` | string | Fully-qualified job ID |
| `run_id` | string | Unique run identifier (`run-YYYYMMDD-HHMMSS`) |
| `exit_code` | int | Process exit code (0 = success) |
| `duration_ms` | int | Execution time in milliseconds |
| `error` | string | Error message (on failure only) |
| `retry` | int | Current retry attempt (on retry only) |
| `stdout_bytes` | int | Size of captured stdout |
| `stderr_bytes` | int | Size of captured stderr |

### Per-Run Output Capture

**Location:** `logs/scheduler/runs/{job-id}/{run-id}.log`

Each run captures stdout and stderr in a single file with markers:

```
═══ JOB RUN: alpha:daily-refresh ═══
Run ID:    run-20260329-060001
Started:   2026-03-29T06:00:01.000Z
Command:   bun tools/refresh-data.ts
Project:   alpha
Timeout:   300s

═══ STDOUT ═══
Fetching AAPL... done (234ms)
Fetching MSFT... done (189ms)
Updated 2 symbols.

═══ STDERR ═══
(empty)

═══ RESULT ═══
Exit code: 0
Duration:  30.234s
Status:    SUCCESS
```

### Log Rotation Policy

| Log type | Rotation | Retention | Max size |
|----------|----------|-----------|----------|
| `daemon.log` | Daily | 30 days | 50MB |
| Per-run logs | None (one file per run) | 90 days | 10MB per file |
| `run-history.jsonl` | Monthly | 1 year | 100MB |

Rotation is handled by the daemon itself (no logrotate dependency). On startup, the daemon checks file sizes and ages, archiving/deleting as needed.

### Error Classification

| Category | Description | Retry behavior | Example |
|----------|-------------|----------------|---------|
| **transient** | Temporary failure, likely to succeed on retry | Retry per policy | Network timeout, API rate limit |
| **permanent** | Will not succeed without intervention | No retry, notify owner | Invalid credentials, missing file |
| **timeout** | Job exceeded timeout limit | Retry once, then permanent | Hung process, deadlock |
| **crash** | Process terminated abnormally (signal) | Retry per policy | OOM kill, segfault |

Classification is automatic based on exit code and error message pattern matching:
- Exit 0 = success
- Exit 1 + known error patterns = permanent
- Exit 1 + unknown = transient (retry)
- Exit 124/137/143 = timeout/killed
- Signal-based termination = crash

---

## Error Handling

### Retry Policy

Each job defines its retry behavior:

```yaml
retry:
  max_attempts: 3         # Total attempts including first try
  backoff: exponential     # fixed | linear | exponential
  initial_delay: 30        # Seconds before first retry
  max_delay: 300           # Maximum delay between retries
```

**Backoff calculation:**
- `fixed`: Always `initial_delay` seconds
- `linear`: `initial_delay * attempt` seconds
- `exponential`: `initial_delay * 2^(attempt-1)` seconds, capped at `max_delay`

**Dead letter:** After exhausting retries, the job is marked as `failed` in run-history.jsonl. The scheduler does NOT attempt again until the next scheduled fire time.

### Circuit Breaker

When a job fails **consecutively** N times (across different scheduled fires, not retries):

| Consecutive failures | Action |
|---------------------|--------|
| 1-2 | Normal retry policy + notification |
| 3 | **WARN** — Job stays active, owner notified with failure pattern |
| 5 | **DISABLE** — Job automatically disabled, marked in registry, owner notified |
| 5+ (disabled) | Job remains disabled until owner explicitly re-enables |

Re-enabling a circuit-broken job: `bun tools/scheduler.ts enable {job-id} --reset-circuit`

### Escalation Path

```
Job fails → retry policy → retries exhausted
    ↓
Notify via configured channels (ntfy, telegram, etc.)
    ↓
If 3 consecutive schedule failures → WARN + detailed diagnostic
    ↓
If 5 consecutive → AUTO-DISABLE + urgent notification
    ↓
Owner must: diagnose → fix → re-enable manually
```

---

## Daemon Architecture

### Lifecycle

```
START → LOAD_REGISTRY → VALIDATE → SCHEDULE → TICK_LOOP
                                                    ↓
                                              CHECK_FIRES
                                                    ↓
                                              EXECUTE_JOBS
                                                    ↓
                                              LOG_RESULTS
                                                    ↓
                                              WATCH_FILES (for registry changes)
                                                    ↓
                                              (back to TICK_LOOP)
```

### Tick Loop

The daemon uses a **1-minute tick** with sub-second precision:

```typescript
// Simplified tick loop
while (running) {
  const now = new Date();
  const nextMinute = new Date(now);
  nextMinute.setSeconds(0, 0);
  nextMinute.setMinutes(nextMinute.getMinutes() + 1);

  // Wait until the start of the next minute
  await sleep(nextMinute.getTime() - now.getTime());

  // Fire all jobs whose cron matches this minute
  for (const job of activeJobs) {
    if (cronMatches(job.schedule, nextMinute, job.timezone)) {
      fireJob(job);
    }
  }
}
```

### Health Check

The daemon exposes a health endpoint (same pattern as the dashboard):

```
GET http://localhost:{port}/health

Response:
{
  "status": "healthy",
  "uptime_seconds": 86400,
  "active_jobs": 5,
  "jobs_in_flight": 1,
  "last_tick": "2026-03-29T06:00:00Z",
  "next_fires": [
    { "job_id": "alpha:report", "fire_at": "2026-03-29T09:00:00Z" }
  ]
}
```

**Watchdog:** The daemon writes a heartbeat file (`scheduler/state/heartbeat`) every tick. If the heartbeat file is older than 5 minutes, the systemd watchdog (or a monitoring cron) can restart the daemon.

### systemd Unit File

```ini
[Unit]
Description=Poseidon Scheduler Service
After=network.target
Wants=poseidon-dashboard.service

[Service]
Type=simple
User=%u
WorkingDirectory=%h/.poseidon
ExecStart=/usr/local/bin/bun scheduler/daemon.ts
Restart=on-failure
RestartSec=10
WatchdogSec=300

# Logging
StandardOutput=append:%h/.poseidon/logs/scheduler/daemon.log
StandardError=append:%h/.poseidon/logs/scheduler/daemon.log

# Security hardening
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=default.target
```

### Graceful Shutdown

On SIGTERM/SIGINT:
1. Stop accepting new job fires
2. Wait for in-flight jobs to complete (up to 30 seconds)
3. Kill remaining jobs with SIGTERM, wait 5 seconds, then SIGKILL
4. Write final state to `active-jobs.yaml`
5. Log shutdown event to `daemon.log`
6. Exit 0

### Process Isolation for Job Execution

Each job runs in an isolated subprocess:

```typescript
// Command is stored as array to prevent shell injection
const proc = Bun.spawn(job.command_args, {
  cwd: job.working_dir,
  env: {
    ...process.env,
    POSEIDON_JOB_ID: job.id,
    POSEIDON_PROJECT: job.project_id,
    POSEIDON_RUN_ID: runId,
    // Secrets NOT in env vars — injected via fd (see below)
  },
  stdout: "pipe",
  stderr: "pipe",
});

// Inject secrets via pipe fd (not env vars — /proc/PID/environ is readable)
await injectSecretsViaFd(proc, job.secrets_required);
```

**Isolation guarantees:**
- Each job is a separate OS process (Bun.spawn)
- Working directory locked to project's working_dir
- Environment variables scoped to job context
- **Secrets injected via file descriptor** (NOT env vars — env vars are readable via `/proc/PID/environ`). Secrets are written to a pipe fd, the job reads from the fd, and the pipe is closed after read. This prevents secret exposure through process inspection.
- Timeout enforced via `setTimeout` + process kill
- Job crash cannot crash the scheduler daemon
- **Command must be array-based** (not string split) to prevent shell injection: `Bun.spawn(["bun", "tools/refresh.ts"], ...)` not `Bun.spawn(command.split(" "), ...)`

---

## CLI Tool Interface

**Tool:** `tools/scheduler.ts`

```
bun tools/scheduler.ts <command> [options]

COMMANDS:
  status                    Show scheduler daemon status and next fires
  list                      List all registered jobs (all projects)
  list --project <id>       List jobs for a specific project
  pending                   Show jobs awaiting approval
  approve <job-id>          Approve a pending job
  reject <job-id> [reason]  Reject a pending job with reason
  enable <job-id>           Enable a disabled job
  disable <job-id>          Disable a job (preserves definition)
  fire <job-id>             Manually trigger a job immediately
  history [job-id]          Show run history (last 20 runs, or for specific job)
  validate                  Validate all project scheduler.yaml files
  rebuild                   Force rebuild aggregated registry
  conflicts                 Check for conflicts across all jobs
  logs <job-id> [run-id]    Show logs for a job or specific run

OPTIONS:
  --json                    Output in JSON format
  --project <id>            Filter by project
  --verbose                 Include debug output
  --help                    Show help
```

**Examples:**

```bash
# Check what's running
$ bun tools/scheduler.ts status
🕐 Poseidon Scheduler — RUNNING (uptime: 3d 14h)
   Active jobs: 5/6 (1 disabled)
   In flight:   1 (alpha:daily-refresh, started 2m ago)
   Next fire:   beta:weekly-report in 3h 22m

# See all jobs
$ bun tools/scheduler.ts list
┌──────────────────────┬────────────┬──────────┬──────────┬──────────┐
│ Job ID               │ Schedule   │ Type     │ Status   │ Last Run │
├──────────────────────┼────────────┼──────────┼──────────┼──────────┤
│ alpha:daily-refresh  │ 0 6 * * *  │ script   │ ✅ active │ 2h ago   │
│ alpha:weekly-report  │ 0 9 * * 1  │ skill    │ ✅ active │ 5d ago   │
│ beta:sync            │ */30 * * * │ script   │ ⛔ broken │ 1h ago   │
│ gamma:screener       │ 0 16 * * * │ skill    │ ✅ active │ 18h ago  │
│ gamma:backup         │ 0 2 * * 0  │ script   │ ✅ active │ 6d ago   │
│ delta:health-check   │ @hourly    │ webhook  │ 🔒 disabled│ 3d ago  │
└──────────────────────┴────────────┴──────────┴──────────┴──────────┘

# Investigate a failing job
$ bun tools/scheduler.ts history beta:sync
Run ID                    │ Status  │ Duration │ Exit │ Retries
run-20260329-063000       │ FAILED  │ 12.3s    │ 1    │ 3/3
run-20260329-060000       │ FAILED  │ 11.8s    │ 1    │ 3/3
run-20260329-053000       │ FAILED  │ 12.1s    │ 1    │ 3/3
run-20260328-233000       │ SUCCESS │ 8.4s     │ 0    │ 0
⚠️  Circuit breaker: 3 consecutive failures. Will auto-disable at 5.

# View run logs
$ bun tools/scheduler.ts logs beta:sync run-20260329-063000
```

---

## Regime: scheduler-integrity

### REGIME.yaml

```yaml
name: scheduler-integrity
version: "1.0"
description: "Validate scheduler job definitions, detect conflicts, enforce documentation"
scope: all-projects
enabled: true

triggers:
  - event: session-end
    condition: algorithm-session-completed
  - event: manual
    condition: always

standard:
  required_fields:
    - id
    - name
    - schedule
    - type
    - command
    - owner
    - purpose
  max_timeout: 3600
  min_timeout: 10
  allowed_types:
    - script
    - skill
    - tool
    - webhook

enforcement:
  on_session_end: warn
  on_manual: report

audit:
  log_path: "memory/learning/regimes/scheduler-integrity.jsonl"
```

### Validator Checks

The `validator.ts` checks:

1. **Schema compliance** — All required fields present in every job
2. **Cron syntax** — Every schedule expression parses correctly
3. **Command resolution** — Referenced scripts/skills/tools exist on disk
4. **Documentation** — `owner`, `purpose`, and `sla` fields are non-empty
5. **Conflict scan** — No time overlaps on shared resources
6. **Orphan detection** — No jobs reference archived/deleted projects
7. **Secret availability** — Required secrets exist in the age-encrypted store
8. **ID format** — Job IDs follow `{project}:{name}` pattern, no special characters

---

## Enforcement Model

### How Projects Register Jobs

1. **User creates/edits** `memory/projects/{id}/scheduler.yaml` (manually or via AI assistant)
2. **Validation fires** automatically (file watch) or on session-end (regime check)
3. **Pending queue** — new/modified jobs enter pending state
4. **User approves** via CLI: `bun tools/scheduler.ts approve {job-id}`
5. **Scheduler activates** the job on next tick

### How Enforcement Works

**The scheduler is the ONLY way to run recurring tasks.** This is enforced through:

1. **Regime check** — `scheduler-integrity` regime runs at session-end. If it finds a `crontab -l` entry or a systemd timer that wasn't registered through the scheduler, it reports a violation.
2. **PreToolUse hook (MANDATORY)** — The security validator in `pre-tool.ts` **blocks** `crontab -e`, `crontab -l`, and `systemctl enable *timer` commands, redirecting users to the scheduler. This is not optional — it's a security pattern entry that prevents bypass.
3. **Convention** — Documentation and onboarding guide users to the scheduler. Skills and tools that need recurring execution should include a `scheduler.yaml` snippet.
4. **Audit trail** — All scheduler actions are logged. Unregistered cron jobs have no audit trail, making them a governance gap.

### Project Lifecycle Integration

| Event | Scheduler action |
|-------|-----------------|
| **Project create** | Copy `.template/scheduler.yaml` (empty template) to new project |
| **Project archive** | Disable all project's jobs, log warning if any were active |
| **Project delete** | Remove all project's jobs from active registry, archive run history |
| **Session end** | Run scheduler-integrity regime check |

---

## Project Template

### memory/projects/.template/scheduler.yaml

```yaml
# scheduler.yaml — Scheduled jobs for this project
#
# Define recurring tasks here. Each job goes through the scheduler's
# validation pipeline before activation:
#   DEFINE → VALIDATE → CHECK → APPROVE → ACTIVATE
#
# Required fields: id, name, schedule, type, command, owner, purpose
# Full schema: docs/scheduler-system.md
#
# Example:
#   jobs:
#     - id: daily-refresh
#       name: "Daily Data Refresh"
#       enabled: true
#       schedule: "0 6 * * *"
#       timezone: "UTC"
#       type: script
#       command: "bun scripts/refresh.ts"
#       owner: "your-name"
#       purpose: "Refresh data before daily analysis"
#       retry:
#         max_attempts: 3
#         backoff: exponential
#         initial_delay: 30
#       on_failure: notify

version: "1.0"
jobs: []
```

---

## Dashboard Integration

The scheduler exposes data for the Poseidon dashboard via its health endpoint:

### New Dashboard Page: "Scheduler"

| Section | Data source | Refresh |
|---------|------------|---------|
| **Job List** | `GET /health` → `active_jobs` | 10s poll |
| **Run History** | `run-history.jsonl` (last 50) | 30s poll |
| **Health Status** | `GET /health` → `status`, `uptime` | 10s poll |
| **Next Fires** | `GET /health` → `next_fires` | 10s poll |
| **Conflict Warnings** | Conflict detector output | On load |

### Status Badge on Overview Page

The Overview page gets a new KPI card:

```
🕐 Scheduler
   5 active jobs │ 0 in flight │ Last failure: 3d ago
   Health: ✅ HEALTHY
```

---

## Configuration

### settings.json additions

```json
{
  "scheduler": {
    "enabled": true,
    "port": 3457,
    "tick_interval_ms": 60000,
    "max_concurrent_jobs": 5,
    "heartbeat_file": "scheduler/state/heartbeat",
    "resource_limits": {
      "fmp-api": { "max_concurrent": 2, "rate_limit": "300/hour" },
      "disk-io": { "max_concurrent": 3 },
      "cpu-heavy": { "max_concurrent": 1 }
    },
    "circuit_breaker": {
      "warn_threshold": 3,
      "disable_threshold": 5
    },
    "log_rotation": {
      "daemon_max_size_mb": 50,
      "daemon_retention_days": 30,
      "run_retention_days": 90
    }
  }
}
```

---

## Atomicity & Concurrency

**Atomic file writes:** All state file writes (active-jobs.yaml, run-history.jsonl) use write-then-rename:
```typescript
writeFileSync(path + ".tmp", content);
renameSync(path + ".tmp", path); // Atomic on POSIX
```
This prevents corruption if the daemon crashes mid-write.

**JSONL append safety:** The run-history.jsonl log uses `appendFileSync` with a trailing newline. Each append is a single `write()` syscall under 4KB (PIPE_BUF), guaranteeing atomicity on Linux without locks.

**Concurrency policy per job:**

| Policy | Behavior | Default |
|--------|----------|---------|
| `forbid` | Skip new run if previous still executing | **YES (default)** |
| `allow` | Run concurrently (only for stateless/idempotent jobs) | No |
| `replace` | Kill previous, start new (newest data wins) | No |

Default is `forbid` — the safe choice. Jobs must explicitly opt into `allow` or `replace`. Advisory lock via `scheduler/state/locks/{job-id}.lock` with `flock()`.

---

## Security Considerations

1. **No secrets in YAML** — Job definitions declare `secrets_required` by name. The scheduler injects them as environment variables at runtime from the age-encrypted store. Secrets never touch disk in plaintext.

2. **Process isolation** — Each job runs as a separate process. A rogue job cannot read the scheduler's memory or other jobs' environment variables.

3. **Project isolation** — `working_dir` is enforced. A job cannot specify a working directory outside its project scope. The scheduler validates this at registration.

4. **Command allowlist** — The `type` field constrains what commands can be run. `script` type jobs are validated against the project's directory. `webhook` type jobs can only POST, not arbitrary HTTP methods.

5. **Output scrubbing** — The same output scrubber that runs in post-response.ts scans job stdout/stderr for leaked secrets before writing to log files.

6. **No privilege escalation** — systemd unit runs as the user (not root). `NoNewPrivileges=true` prevents setuid.

---

## Implementation Roadmap

### Phase 1: Core (MVP)
- [ ] `scheduler/daemon.ts` — tick loop, cron parser, basic job execution
- [ ] `scheduler/lib/types.ts` — core interfaces
- [ ] `scheduler/lib/cron-parser.ts` — 5-field POSIX parser + aliases
- [ ] `tools/scheduler.ts` — list, status, fire, validate
- [ ] `scheduler/poseidon-scheduler.service` — systemd unit
- [ ] Basic JSONL logging

### Phase 2: Pipeline + Governance
- [ ] Registration pipeline (validate → approve → activate)
- [ ] `regimes/scheduler-integrity/` — REGIME.yaml + validator.ts
- [ ] Conflict detection (time overlap, dependency cycles)
- [ ] Project template + init integration
- [ ] Retry policy + circuit breaker

### Phase 3: Integration
- [ ] Dashboard page + Overview KPI card
- [ ] Notification integration (ntfy, telegram)
- [ ] Secret injection from age store
- [ ] PreToolUse enforcement (block raw crontab)
- [ ] Project archive/delete cleanup

### Phase 4: Polish
- [ ] Log rotation
- [ ] DST handling + testing
- [ ] Resource contention detection
- [ ] `@every` syntax support
- [ ] Health endpoint + watchdog

---

## Red Team Findings (Incorporated)

The following issues were identified by adversarial review and have been addressed in this spec:

### CRITICAL (Fixed)
1. **Secret exposure via /proc/PID/environ** — Fixed: secrets injected via pipe fd, not env vars
2. **Enforcement is advisory** — Fixed: PreToolUse blocking is MANDATORY, not optional
3. **Command injection via string split** — Fixed: commands stored as arrays, not split strings
4. **JSONL concurrent write corruption** — Fixed: writes under PIPE_BUF (4KB) are atomic
5. **Non-atomic active-jobs.yaml writes** — Fixed: write-then-rename pattern

### MODERATE (Tracked for Implementation)
- File-watch race condition (debounce + idempotent reload)
- TOCTOU in approval pipeline (re-validate at activation)
- Resource declarations are honor-system (monitor actual usage post-Phase 3)
- Webhook SSRF (allowlist domains or restrict to internal)
- Daemon singleton enforcement (PID file + flock on startup)
- Graceful shutdown window may be insufficient (configurable in settings.json)
- Circuit breaker reset needs health verification before re-enabling

### STRENGTHS (Validated)
- Two-level registry pattern (project-owned + system-aggregated)
- 5-stage pipeline with approval gate
- Circuit breaker escalation (warn → disable → notify)
- Error classification taxonomy
- Filesystem-first consistency with Poseidon principles
- Namespaced job IDs prevent cross-project collision
