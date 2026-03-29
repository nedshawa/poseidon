# Poseidon Architecture

## Overview

Poseidon is a personal AI infrastructure layer for Claude Code. It sits between the user and Claude Code, providing persistent memory, learning from mistakes, project isolation, security enforcement, and governance via the Regime system.

## Core Principles

1. **Filesystem over databases** — Everything is plain files (Markdown, YAML, JSON, JSONL). No SQLite, no embeddings, no vector stores. Grep works at this scale.
2. **Code over prompts** — Behavior is defined in TypeScript hooks, not prompt engineering. Same input produces same output.
3. **User owns their data** — TELOS files, project goals, and decisions are never auto-modified. The system writes to designated areas only.
4. **Fail graceful** — Every hook catches errors and exits cleanly. A broken hook never blocks Claude Code.
5. **Zero external dependencies** — The installer and all tools use only Node/Bun built-ins.

## System Diagram

```
User Prompt
    |
    v
┌─────────────────────────────────────────────────┐
│ Claude Code                                      │
│                                                  │
│  SessionStart ──> session-start.ts               │
│    Load TELOS, detect project, rebuild CLAUDE.md │
│                                                  │
│  UserPromptSubmit ──> pre-prompt.ts              │
│    Mode classify, project context, mistake inject│
│                                                  │
│  PreToolUse ──> pre-tool.ts                      │
│    Security validation on Bash/Edit/Write/Read   │
│                                                  │
│  [Claude processes and responds]                 │
│                                                  │
│  Stop ──> post-response.ts                       │
│    Sentiment capture, learning, project update   │
│                                                  │
│  SessionEnd ──> session-end.ts                   │
│    Summarize, rule candidates, regime check,     │
│    rebuild                                       │
└─────────────────────────────────────────────────┘
    |
    v
Response to User
```

## Directory Layout

```
~/.poseidon/
├── CLAUDE.md              # GENERATED — never edit
├── CLAUDE.md.template     # Edit this — source of truth for personality
├── settings.json          # All config: identity, hooks, security
├── secrets.enc            # age-encrypted secrets
│
├── algorithm/             # The 7-phase execution loop
│   ├── v1.0.md            # Original version
│   ├── v1.1.md            # Production hardened
│   ├── v1.2.md            # ISC decomposition + visual feedback
│   └── LATEST -> v1.2.md  # Symlink to active version
│
├── regimes/               # Governance policies (Principle #23)
│   ├── REGISTRY.yaml      # Index of all regimes
│   ├── lib/types.ts       # Core interfaces
│   ├── documentation/     # MANIFEST.md enforcement
│   ├── secrets/           # Secret management compliance
│   └── skill-hygiene/     # Skill quality gate
│
├── hooks/                 # TypeScript lifecycle handlers
│   ├── session-start.ts   # SessionStart event
│   ├── pre-prompt.ts      # UserPromptSubmit event
│   ├── pre-tool.ts        # PreToolUse event (Bash+Edit+Write+Read)
│   ├── post-response.ts   # Stop event
│   ├── session-end.ts     # SessionEnd event
│   ├── handlers/          # Shared handler modules
│   └── lib/               # Utilities (paths, hook-io)
│
├── skills/                # Curated skill definitions
│   └── {name}/SKILL.md    # Each skill: triggers, steps, scope
│
├── telos/                 # USER-OWNED — never auto-modified
│   ├── MISSION.md         # What you're working toward
│   ├── GOALS.md           # Current priorities
│   └── PROJECTS.md        # Project index
│
├── memory/
│   ├── projects/          # Project-scoped memory (isolation boundary)
│   │   ├── .template/     # Template files for new projects
│   │   └── {project-id}/  # One directory per project
│   ├── work/              # Per-session artifacts (PRD.md, ISC.json)
│   ├── learning/          # Mistake tracking and rule generation
│   │   ├── failures/      # Full failure context dumps
│   │   ├── rules/         # User-approved steering rules
│   │   ├── candidates/    # Pending rule proposals
│   │   └── signals/       # ratings.jsonl (append-only)
│   └── steering-rules.md  # Active rules (generated from learning/rules/)
│
├── tools/                 # CLI utilities
│   ├── init.ts            # Interactive installer
│   ├── rebuild.ts         # Regenerate CLAUDE.md
│   └── secret.ts          # Secret management
│
├── security/
│   └── patterns.yaml      # Blocked/confirm/trusted command patterns
│
├── logs/                  # Operational logs (30-day retention)
└── docs/                  # Documentation
```

## Ownership Boundaries

| Boundary | Directories | Who Writes |
|----------|-------------|------------|
| SYSTEM | algorithm/, hooks/, tools/, security/, regimes/, CLAUDE.md, logs/ | Auto-modified by rebuild and hooks |
| USER | telos/, settings.json, secrets.enc, project GOALS/DECISIONS/RULES | Never auto-modified — survives upgrades |
| MIXED | project CONTEXT.md, memory/learning/, steering-rules.md | Auto-written but user-reviewable |

## The Algorithm (7 Phases)

Based on PAI v3.7.0, adapted with project awareness:

1. **OBSERVE** — Parse request, classify mode, detect project, set effort tier
2. **THINK** — Decompose into ISC criteria, inject past mistakes as constraints
3. **PLAN** — Validate prerequisites, define technical approach
4. **BUILD** — Preparation work, invoke capabilities
5. **EXECUTE** — Perform work, check off criteria as they pass
6. **VERIFY** — Confirm each criterion with evidence
7. **LEARN** — Capture feedback, update project state, propose rules

## Hook Architecture

All hooks are TypeScript, async, and fail-graceful. They communicate with Claude Code through stdin/stdout JSON.

| Hook | Event | Latency Budget |
|------|-------|----------------|
| session-start.ts | SessionStart | <200ms |
| pre-prompt.ts | UserPromptSubmit | <100ms |
| pre-tool.ts | PreToolUse | <50ms |
| post-response.ts | Stop | <300ms |
| session-end.ts | SessionEnd | <500ms |

Total per-prompt overhead: under 150ms.

## Governance Layer (Regimes)

Cross-project governance enforcement via declarative policies. Sits between the constitutional layer (principles/rules) and the execution layer (hooks/skills).

```
┌──────────────────────────────────────────────────┐
│  CONSTITUTIONAL    Founding Principles + Rules    │
└──────────────────────────────────────────────────┘
          ↓ governs
┌──────────────────────────────────────────────────┐
│  GOVERNANCE        Regimes (REGISTRY.yaml)        │
│                    regime-runner.ts                │
└──────────────────────────────────────────────────┘
          ↓ enforced by
┌──────────────────────────────────────────────────┐
│  EXECUTION         Hooks + Skills + Tools         │
└──────────────────────────────────────────────────┘
          ↓ operates on
┌──────────────────────────────────────────────────┐
│  STATE             Memory + Algorithm + Secrets   │
└──────────────────────────────────────────────────┘
```

Each regime is: REGIME.yaml (policy) + validator.ts (checker). The regime-runner reads REGISTRY.yaml, runs matching validators per trigger event, logs to audit JSONL.

**10 built-in regimes:** documentation, secrets, skill-hygiene, skill-index-integrity, capabilities-manifest, data-source-registry, project-metadata, doc-integrity, memory-ownership, hook-latency.

**Full specification:** `docs/regime-system.md`

## Learning Pipeline

```
User correction or frustration signal
    |
    v
Sentiment analyzer (post-response.ts)
    |
    v
Failure classification: type + severity
    |
    v
memory/learning/failures/{timestamp}/
    ERROR_ANALYSIS.md
    RULE_CANDIDATE.md
    |
    v
User approves? ──yes──> memory/learning/rules/
    |                         |
    no                        v
    |                   steering-rules.md (on rebuild)
    v                         |
Archived                      v
                        pre-prompt.ts injects as constraint
```

## Security Model

Three-tier approach: block catastrophic, confirm destructive, allow everything else.

- **PreToolUse** covers all four tool types (Bash, Edit, Write, Read)
- **Output scrubbing** catches API keys, tokens, and secrets in responses
- **age encryption** for secrets at rest — decrypted to RAM only, never disk
- **Six persistence points** protected: screen, logs, git, context window, bash history, tool arguments

## Skill System

Skills are the organizational unit for all domain expertise. Each skill is a self-contained package with triggers, workflows, and scope boundaries.

**Full specification:** `docs/skillsystem.md`

Key conventions:
- **Naming:** lowercase-hyphen (e.g., `skill-builder`, `content-analysis`)
- **Structure:** SKILL.md + workflows/ + optional handlers/, references/, data/
- **Quality gate:** 9-point checklist from agentskills.io spec
- **Dynamic loading:** SKILL.md stays minimal, reference docs loaded on demand

## Self-Upgrade System

The algorithm improves itself through accumulated evidence:

```
Session reflections (algorithm-reflections.jsonl)
    |
    v
mine-reflections.ts (pattern extraction)
    |
    v
Recommendations for algorithm changes
    |
    v
upgrade-algorithm.ts (version management)
    |
    v
algorithm/v{N+1}.md → LATEST symlink updated
```

**Tools:**
- `bun tools/mine-reflections.ts` — Extract patterns from reflections
- `bun tools/upgrade-algorithm.ts status` — Show algorithm version info
- `bun tools/upgrade-algorithm.ts create v1.2` — Create new version
- `bun tools/upgrade-algorithm.ts rollback` — Revert to previous version

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new hooks or tools
4. Ensure all hooks stay within their latency budget
5. Never auto-modify files in the USER ownership boundary
6. Submit a pull request with a clear description
