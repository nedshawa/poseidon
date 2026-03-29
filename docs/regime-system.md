# Regime System

Poseidon's governance enforcement layer. Regimes are declarative policies that define cross-project standards, validate compliance deterministically, and maintain audit trails.

## Why Regimes Exist

Standards that aren't enforced drift. Documentation goes stale. Secret management gets inconsistent. Skill quality degrades. The Regime system automates governance so compliance is structural, not aspirational.

## Architecture

```
regimes/                          # Governance layer (peer to hooks/, skills/, tools/)
├── REGISTRY.yaml                 # Index of all regimes — SINGLE SOURCE OF TRUTH
├── lib/
│   └── types.ts                  # Core TypeScript interfaces
├── documentation/
│   ├── REGIME.yaml               # Policy definition
│   ├── template/
│   │   └── MANIFEST.md           # Project documentation template
│   └── validator.ts              # Compliance checker
├── secrets/
│   ├── REGIME.yaml
│   └── validator.ts
└── skill-hygiene/
    ├── REGIME.yaml
    └── validator.ts
```

## The Regime Primitive

Every regime has exactly 5 components:

| Component | File | Purpose |
|-----------|------|---------|
| **Standard** | `REGIME.yaml` → `standard:` | Defines "correct" — templates, required files, thresholds |
| **Triggers** | `REGIME.yaml` → `triggers:` | When to check — session-end, project-create, manual |
| **Validator** | `validator.ts` | Deterministic compliance checker — returns pass/fail + issues |
| **Enforcement** | `REGIME.yaml` → `enforcement:` | What happens on failure — warn, block, auto-fix, report |
| **Audit Trail** | `REGIME.yaml` → `audit:` | JSONL log of every check — regime, project, result, action |

## REGIME.yaml Schema

```yaml
name: regime-name                    # Unique identifier
version: "1.0"                       # Regime version
description: "What this regime enforces"
scope: all-projects                  # all-projects | tagged:tag | project:id
enabled: true                        # Can be disabled without removing

triggers:
  - event: session-end               # Hook lifecycle event
    condition: "algorithm-session-completed"
  - event: project-create
    condition: always
  - event: manual
    condition: always

standard:                            # Regime-specific configuration
  required_files:                    # (example from documentation regime)
    - path: "MANIFEST.md"
      template: "template/MANIFEST.md"
  required_sections:
    - "Purpose"
    - "Component Map"
  freshness:
    max_staleness_days: 14

enforcement:
  on_project_create: apply-template  # apply-template | warn | block | auto-fix | report
  on_session_end: warn
  on_manual: report

audit:
  log_path: "memory/learning/regimes/regime-name.jsonl"
```

## Validator Interface

```typescript
import type { RegimeValidator, RegimeValidation } from "../lib/types";

const validate: RegimeValidator = (projectPath, config): RegimeValidation => {
  const issues = [];
  // ... deterministic checks ...
  return {
    compliant: issues.filter(i => i.severity !== "info").length === 0,
    issues,
    auto_fixable: false,
  };
};

export default validate;
```

Validators MUST be:
- **Deterministic** — no AI inference, no network calls
- **Fast** — under 100ms per project
- **Self-contained** — no shared state with other regimes
- **Fail-safe** — errors caught and reported, never block Claude Code

## Enforcement Flow

```
Event (session-end / project-create / manual)
    │
    ├─→ regime-runner.ts reads REGISTRY.yaml
    │     Lists enabled regimes matching this trigger
    │
    ├─→ For each matching regime:
    │     1. Load REGIME.yaml
    │     2. Run validator.ts against project
    │     3. Log result to audit JSONL
    │
    └─→ Based on enforcement level:
          warn       → inject warning into pre-prompt
          block      → prevent work completion
          auto-fix   → apply template or correction
          report     → log only, surface in dashboard
          apply-template → scaffold from template on project-create
```

## Built-In Regimes

### documentation
Enforces standard project documentation via MANIFEST.md template. Checks: file exists, required sections present, last-updated freshness, change log entries.

### secrets
Enforces standard secret management. Checks: no hardcoded secrets in source files, secrets-registry.md exists, all referenced secrets documented.

### skill-hygiene
Enforces skill structure quality. Checks: YAML frontmatter, USE WHEN clause, NOT for scope boundary, Examples section, naming convention, nesting depth, line count.

### skill-index-integrity
Validates skill-index.yaml matches actual skill directories. Checks: every skill dir has index entry, no orphaned entries, required fields present, `requires` dependencies exist.

### capabilities-manifest
Validates poseidon-manifest.yaml consistency. Checks: enabled+requires_key services have secrets, research_agents are enabled services, capability flags align with enabled service categories.

### data-source-registry
Validates data-sources.yaml cross-references. Checks: used_by skill names exist in skill-index, fallback source IDs exist, manifest_service references valid manifest entries.

### project-metadata
Validates META.yaml in project memory. Checks: required fields populated (name, status, created), status/domain in valid enums, products entries exist in skill-index.

### doc-integrity
Promotes existing doc-integrity.ts handler to regime. Checks: backtick path refs resolve, docs/index.md lists all docs, skill count claims match reality, algorithm/LATEST symlink valid.

### memory-ownership
Enforces SYSTEM/USER/MIXED ownership boundaries. Checks: required project structure files exist, USER files present, CONTEXT.md not stale, learning directory structure intact.

### hook-latency
Validates hooks against latency budget proxies. Checks: hook line count vs budget ratio, handler import count per hook, blocking I/O call density for tight-budget hooks.

## Adding a New Regime

1. Create `regimes/{name}/REGIME.yaml` with policy definition
2. Create `regimes/{name}/validator.ts` implementing `RegimeValidator`
3. Add entry to `regimes/REGISTRY.yaml`
4. (Optional) Add `regimes/{name}/template/` for scaffolding templates

That's it. No hooks to modify, no handlers to write. The regime-runner discovers it automatically.

## CLI Tool

```bash
bun tools/regime-check.ts                              # Full audit
bun tools/regime-check.ts --regime documentation        # One regime
bun tools/regime-check.ts --project hunter-dalio        # One project
bun tools/regime-check.ts --regime secrets --project x  # Specific check
bun tools/regime-check.ts --json                        # Machine-readable output
```

## Audit Trail

Every regime check appends to its JSONL log:

```json
{
  "timestamp": "2026-03-29T11:00:00Z",
  "regime": "documentation",
  "project": "hunter-dalio",
  "trigger": "session-end",
  "compliant": false,
  "issues_count": 2,
  "issues_summary": ["[critical] Required file missing: MANIFEST.md"],
  "action_taken": "warn"
}
```

Logs live at `memory/learning/regimes/{regime-name}.jsonl`.

## Integration Points

| Integration | How |
|-------------|-----|
| **session-end.ts** | Runs all matching regimes after Algorithm sessions |
| **pre-prompt.ts** | Injects compliance warnings for non-compliant active projects |
| **project-init** | Applies regime templates when creating new projects |
| **regime-check.ts** | On-demand CLI audit tool |

## Founding Principle

**#23: Regime-Based Governance** — "Standards are enforced, not documented." See `docs/founding-principles.md`.
