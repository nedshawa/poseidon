# Poseidon Scheduler System — Final Verdict

**Date:** 2026-03-29
**Analysis method:** Algorithm mode with 4 research agents (Perplexity, Architect, Red Team, Explorer) + 3-round Council debate (Architect, Security, Operations)
**Spec reviewed:** `docs/scheduler-system.md` (992 lines)
**Sources cross-referenced:** Perplexity research (80+ sources), Red Team (5 critical + 11 moderate findings), Bun API documentation

---

## VERDICT: GO — with 5 mandatory revisions

The spec is **implementation-ready after addressing 2 critical and 3 high-severity issues**. The architecture is sound, the design respects Poseidon's founding principles, and the two-level registry pattern is the right abstraction. However, the council unanimously agreed the spec is **over-built for current scale** and should be implemented incrementally.

---

## Mandatory Revisions Before Implementation

### 1. CRITICAL: Fix Secret Injection Mechanism

**Problem:** The spec describes fd-based secret injection (`injectSecretsViaFd`), but `Bun.spawn()` does not support passing arbitrary extra file descriptors beyond stdin/stdout/stderr.

**Fix:** Use `stdin: "pipe"` — Bun returns a `FileSink` on `proc.stdin`. Write secrets as JSON to stdin, job reads from stdin on startup, then stdin closes. This is cleaner, simpler, and proven.

```typescript
const proc = Bun.spawn(job.command_args, {
  cwd: job.working_dir,
  stdin: "pipe",  // Returns FileSink
  stdout: "pipe",
  stderr: "pipe",
  env: { POSEIDON_JOB_ID: job.id, POSEIDON_PROJECT: job.project_id },
});

// Write secrets via stdin pipe
const secrets = await loadSecrets(job.secrets_required);
proc.stdin.write(JSON.stringify(secrets) + "\n");
proc.stdin.flush();
proc.stdin.end();
```

Jobs read secrets from stdin: `const secrets = JSON.parse(await Bun.stdin.text());`

**Source:** [Bun.spawn API Reference](https://bun.com/reference/bun/spawn), [stdin property docs](https://bun.com/reference/bun/SpawnOptions/OptionsObject/stdin)

### 2. CRITICAL: Add Missed Execution Recovery

**Problem:** If the scheduler daemon is down (restart, crash, upgrade) when a job was supposed to fire, that execution is silently lost. The spec has no recovery mechanism.

**Fix:** Add a `persistent` option per job (default: `true`). On daemon startup, compare `run-history.jsonl` against expected fire times during the downtime window. Fire any missed persistent jobs immediately.

```yaml
jobs:
  - id: daily-refresh
    persistent: true  # If missed during downtime, fire on daemon restart
    missed_window: 3600  # Only recover if missed within last 1 hour
```

**Source:** systemd timers have `Persistent=true`; Kubernetes has `startingDeadlineSeconds`. This is standard.

### 3. HIGH: Add Config Reload Mechanism

**Problem:** No way to reload `settings.json` or resource limit changes without restarting the daemon.

**Fix:** Add SIGHUP handler + CLI command:
- `kill -HUP $(cat scheduler/state/pid)` — daemon reloads config
- `bun tools/scheduler.ts reload` — sends SIGHUP to daemon
- Log `{"event": "config_reload", "changes": [...]}` on reload

### 4. HIGH: Standardize Command Format

**Problem:** The YAML schema shows `command: "bun tools/refresh-data.ts"` (string), but the code shows `job.command_args` (array). Inconsistent.

**Fix:** YAML stores command as a string (human-friendly). The daemon parses it into an array using shell-aware splitting (respect quotes, no glob expansion). Document the conversion in the schema section.

```yaml
command: 'bun tools/refresh-data.ts --verbose "my project"'
# Parsed to: ["bun", "tools/refresh-data.ts", "--verbose", "my project"]
```

### 5. HIGH: Add `@reboot` Alias and Backoff Jitter

**Fix:** Add to the shortcut aliases table:
- `@reboot` — fire once on daemon startup (useful for health checks, cache warming)
- Add `exponential_jitter` backoff type: `initial_delay * 2^(attempt-1) + random(0, initial_delay)` — prevents thundering herd when multiple jobs retry simultaneously after an API outage

---

## Top 3 Strengths

1. **Two-level registry** — Project-owned YAML aggregated into system view. Respects project isolation while enabling centralized governance. Every council member praised this independently.

2. **Constitutional alignment** — Filesystem over databases, zero external dependencies, fail graceful. The spec never violates Poseidon's founding principles. This is the hardest thing to get right and it's done perfectly.

3. **Comprehensive error handling** — The error classification taxonomy (transient/permanent/timeout/crash), circuit breaker escalation (warn→disable→notify), and retry policies form a complete failure management system that rivals enterprise schedulers.

---

## Top 3 Risks

1. **Over-engineering at current scale** — The council unanimously agreed that conflict detection, resource contention graphs, and the full 5-stage pipeline are premature for 5-15 jobs. Risk: the system's complexity exceeds its utility, making it feel bureaucratic rather than helpful. **Mitigation:** Implement incrementally. Phase 1 only until evidence demands more.

2. **Daemon reliability** — A single-process daemon is a single point of failure. If it crashes silently, all scheduled work stops. **Mitigation:** systemd `Restart=on-failure`, heartbeat watchdog, health endpoint, and now the missed execution recovery mechanism.

3. **Enforcement gap** — The PreToolUse blocklist is bypassable (python subprocess, at command, direct spool write). On a personal system this is acceptable risk, but it means enforcement is advisory not absolute. **Mitigation:** Accept the risk. Document it. The audit trail provides after-the-fact detection.

---

## Implementation Recommendation

### Revised Phase 1 (MVP) — One Build Session — HYBRID ARCHITECTURE

| Component | What | Priority |
|-----------|------|----------|
| `scheduler/lib/types.ts` | Core interfaces (Job, RunResult, etc.) | P0 |
| `scheduler/lib/cron-parser.ts` | 5-field POSIX + aliases including `@reboot` | P0 |
| `scheduler/job-runner.ts` | Thin wrapper: stdin secret injection + buffered output scrubbing + run logging | P0 |
| `tools/scheduler.ts` | list, status, fire, validate, generate (creates systemd units) | P0 |
| systemd unit generation | `scheduler.ts generate` reads YAML → writes `.timer` + `.service` files | P0 |
| Per-run JSONL logging | `logs/scheduler/runs/` with structured output capture | P0 |
| stdin secret injection | job-runner.ts writes secrets to job's stdin via pipe | P0 |
| Missed execution recovery | `Persistent=true` in generated systemd timers | P0 (free) |
| Per-project scheduler.yaml | Template + registry aggregation | P0 |
| Log rotation | Basic rotation in job-runner.ts (promoted from Phase 4 per Marcus) | P0 |

**Note:** Config reload is handled natively by `systemctl daemon-reload`. No custom SIGHUP handler needed. Health monitoring via `systemctl list-timers --user`.

### Phase 2 — When Jobs > 10
- Registration pipeline (validate → activate, no approval gate yet)
- `regimes/scheduler-integrity/` — REGIME.yaml + validator.ts
- Retry policy + circuit breaker
- `failures --since` CLI command

### Phase 3 — When Jobs > 20 or First Conflict
- Conflict detection
- Approval gate (APPROVE stage)
- Dashboard page
- Notification integration
- Per-job circuit breaker overrides

### Phase 4 — When Needed
- Resource contention detection
- JSONL index for fast queries
- DST edge case handling
- Log rotation
- Webhook domain allowlist

---

## Council Debate Summary

| Member | Role | Position | Key Insight |
|--------|------|----------|-------------|
| **Serena** | Architect | Build Phase 1 only, defer rest | "Earn complexity through evidence, don't pre-build it" |
| **Rook** | Security | 5 missed attack vectors, fd injection unimplementable | stdin pipe solves the secret injection; accept personal-system threat model |
| **Marcus** | Operations | Production-grade for single-operator | "Who generates the systemd units?" — the registry IS the scheduler |

**Convergence:** 3/3 agreed spec is architecturally sound, over-built for scale, and Phase 1 is the right scope.

**Key debate resolution (Round 1):** Custom daemon beats systemd timers because the daemon provides the aggregation/validation/state layer that systemd timers lack.

**Round 2 PIVOT:** All three council members converged on a **hybrid architecture** in Round 2:
- **systemd timers** handle scheduling, restart-on-failure, process isolation (cgroups, namespaces, PrivateTmp, ProtectSystem — all free)
- **job-runner.ts** (thin wrapper) handles stdin secret injection, buffered output scrubbing, run logging
- **YAML registry + tools/scheduler.ts** handles validation, aggregation, unit file generation
- **No custom daemon** — systemd IS the scheduler; Poseidon provides the governance layer

This hybrid gives better security (systemd isolation > Bun.spawn), better reliability (systemd restart > custom watchdog), and less code to maintain. The key question Marcus raised — "who generates the unit files?" — is answered by `tools/scheduler.ts generate` which reads project scheduler.yaml files and writes systemd `.timer` + `.service` units.

**This is the recommended architecture for Phase 1.** The custom daemon design in the spec remains valid as a Phase 3+ option if systemd timer management becomes unwieldy at >20 jobs.

---

## Architectural Placement: Confirmed

```
CONSTITUTIONAL    → Founding Principles + Rules (unchanged)
GOVERNANCE        → Regimes + scheduler-integrity (Phase 2)
EXECUTION         → Hooks + Skills + Tools + Services (scheduler daemon)
STATE             → Memory + scheduler/state/ (YAML + JSONL)
```

The Services sublayer within Execution is the correct placement. The Dashboard established the precedent. The Scheduler formalizes it.

---

## Go/No-Go Decision

**GO.** Build Phase 1 in the next session. The spec is a comprehensive reference document — implement the MVP subset, let the system prove what sophistication it needs through actual usage. The 5 mandatory revisions are straightforward fixes. The architecture is sound. The principles are respected. Ship it.
