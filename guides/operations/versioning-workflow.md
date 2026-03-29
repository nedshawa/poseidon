# Versioning Workflow Guide

**How Poseidon manages versions, changelogs, and documentation freshness.**

## Semantic Versioning

Poseidon uses **semver** (MAJOR.MINOR.PATCH):

| Type | When | Example |
|------|------|---------|
| **PATCH** (x.y.Z) | Doc fix, number update, config tweak, bug fix | 3.9.0 → 3.9.1 |
| **MINOR** (x.Y.0) | New handler, new guide, new tool, new skill | 3.9.0 → 3.10.0 |
| **MAJOR** (X.0.0) | Architectural change, new pillar, breaking change | 3.9.0 → 4.0.0 |

## The Versioning Pipeline

```
You make changes (new handler, fix a bug, etc.)
    ↓
Run doc-freshness check:
    bun tools/doc-freshness.ts
    ↓
Tool detects what changed (handlers: 19→20, tools: 21→22)
    ↓
Tool suggests version bump (minor: new handlers)
    ↓
Apply the bump:
    bun tools/doc-freshness.ts --bump
    ↓
Tool auto-updates:
  - package.json version
  - CHANGELOG.md (prepends new entry with system state)
    ↓
Commit with structured message:
    git commit -m "v3.10.0: [description of what changed]"
    ↓
Push + sync to Chief
```

## doc-freshness.ts Commands

| Command | What It Does |
|---------|-------------|
| `bun tools/doc-freshness.ts` | Run freshness check — find stale numbers |
| `bun tools/doc-freshness.ts --state` | Show current system state (counts) |
| `bun tools/doc-freshness.ts --json` | Output freshness check as JSON |
| `bun tools/doc-freshness.ts --bump` | Auto-bump version + update CHANGELOG |
| `bun tools/doc-freshness.ts --changelog` | Preview changelog entry without applying |

## When to Run

| Trigger | Action |
|---------|--------|
| Added a new handler | Run `--bump` (minor) |
| Added a new tool | Run `--bump` (minor) |
| Added a new skill | Run `--bump` (minor) |
| Fixed stale numbers in docs | Run `--bump` (patch) |
| Changed architecture, algorithm, or pillars | Manual major bump |
| Before every `git push` | Run freshness check (good habit) |

## What Gets Checked

The tool scans all docs/, guides/, and CLAUDE.md.template for numeric claims:
- "25 skills" → compares against actual `ls skills/ | wc -l`
- "25 handlers" → compares against actual `ls hooks/handlers/*.ts | wc -l`
- "24 tools" → compares against actual `ls tools/*.ts tools/*.sh | wc -l`
- "10 regimes" → compares against actual `ls regimes/*/REGIME.yaml | wc -l`
- "207 workflows" → compares against actual workflow .md files in skills/
- "18 rules" → compares against actual `grep -c` in rules/system.md

If any documented number doesn't match reality → flagged as stale.

## CHANGELOG.md Format

Auto-generated entries look like:

```markdown
## 3.10.0 (2026-03-29)

**Type:** minor — new handlers: 19 → 20

### System State
| Metric | Count |
|--------|-------|
| Skills | 25 (64 SKILL.md) |
| Workflows | 207 |
| Handlers | 20 |
| Hooks | 6 |
| Tools | 22 |
| Docs | 18 |
| Guides | 11 |
| Agents | 5 |
| Rules | 18 |
| Security Patterns | 51 |
| Algorithm | v1.2 |
```

## Files That Should NEVER Have Stale Numbers

These files are the source of truth and must always be current:
- `CLAUDE.md.template` — the AI reads this every session
- `docs/index.md` — the documentation entry point
- `docs/founding-principles.md` — the philosophical foundation

## Files Where Stale Numbers Are Acceptable

- `docs/decisions_poseidon_1.md` — historical record, numbers were accurate at time of writing
- `docs/workflow-index.md` — auto-generated, regenerate rather than update

## Best Practice: Pre-Push Checklist

```bash
# Before every push:
bun tools/doc-freshness.ts          # Check for stale numbers
bun tools/doc-freshness.ts --bump   # Auto-bump if changes detected
git add -A
git commit -m "v$(jq -r .version package.json): [description]"
git push
```
