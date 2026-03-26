# Memory System

Poseidon uses a project-centric memory architecture. All memory is plain files — Markdown, YAML, JSON, JSONL. No databases, no embeddings, no vector stores. Grep works at this scale.

## Directory Structure

```
~/.poseidon/memory/
├── projects/
│   ├── .template/           # Scaffolding for new projects
│   └── {project-id}/        # One directory per project
│       ├── META.yaml         # Project metadata (name, repo, created, status)
│       ├── CONTEXT.md        # Auto-maintained project context snapshot
│       ├── GOALS.md          # User-defined project goals and priorities
│       ├── DECISIONS.md      # Architectural decisions with rationale
│       ├── RULES.md          # Project-specific steering rules
│       └── knowledge/        # Reference docs, specs, research artifacts
│
├── work/                     # Per-session artifacts
│   └── {session-id}/
│       ├── PRD.md            # Session work definition (see prd-format.md)
│       └── ISC.json          # Criteria completion state
│
├── learning/                 # Mistake tracking and rule generation
│   ├── failures/             # Full failure context dumps
│   │   └── {timestamp}/
│   │       ├── ERROR_ANALYSIS.md
│   │       └── RULE_CANDIDATE.md
│   ├── rules/                # User-approved steering rules
│   ├── candidates/           # Pending rule proposals awaiting approval
│   └── signals/              # ratings.jsonl (append-only sentiment log)
│
└── steering-rules.md         # Active rules (generated from learning/rules/)
```

## Project ID Convention

Project IDs use lowercase-hyphen naming derived from the repository path. Example: `/home/ned/projects/hunter-dalio` becomes `hunter-dalio`. The session-start hook detects the active project from the working directory.

## Ownership Boundaries

| Boundary | Files | Rules |
|----------|-------|-------|
| **SYSTEM** | CONTEXT.md, steering-rules.md, work/ artifacts | Auto-modified by hooks and rebuild. Overwritten freely. |
| **USER** | GOALS.md, DECISIONS.md, RULES.md, META.yaml | Never auto-modified. Survives upgrades. User edits only. |
| **MIXED** | learning/failures/, learning/candidates/, signals/ | Auto-written by the learning pipeline. User reviews and approves or archives. |

Hooks must respect these boundaries at all times. Writing to a USER file is a system violation.

## Retention Policy

| Category | Retention | Cleanup |
|----------|-----------|---------|
| Project memory | Permanent | Manual deletion only |
| Work artifacts (PRD, ISC) | 30 days | session-end.ts prunes stale sessions |
| Failure dumps | 90 days | Archived after rule extraction |
| Signals (ratings.jsonl) | Permanent | Append-only, never truncated |
| Logs | 30 days | Auto-rotated |

## Naming Conventions

- **Directories:** lowercase-hyphen (`hunter-dalio`, `content-analysis`)
- **System files:** UPPERCASE.ext (`META.yaml`, `CONTEXT.md`, `GOALS.md`)
- **Generated files:** lowercase-hyphen with timestamp prefix where applicable
- **Learning artifacts:** `{timestamp}/ERROR_ANALYSIS.md` pattern

## Isolation Boundary

Each project directory is a complete isolation unit. No project can read or write another project's memory. The session-start hook sets the active project context, and all subsequent hooks scope their reads and writes to that project's directory. Cross-project operations require explicit user instruction.

## Rebuild Cycle

Running `bun tools/rebuild.ts` regenerates CLAUDE.md by reading project memory, active steering rules, and the algorithm. Project CONTEXT.md files are refreshed from repository state. USER-owned files are never touched during rebuild.
