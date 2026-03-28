# System Manifest Template

**Use this template when building or documenting a complete system.**

A "system" is anything that spans multiple Poseidon subsystems — skills, tools, hooks, data, infrastructure, or agents working together.

## When to Create a Manifest

Create a MANIFEST.md when a system has **3+ of these:**
- A skill with workflows
- CLI tools or handlers
- Scheduled automation (cron, hooks)
- External infrastructure (DB, API, service)
- Data pipelines or datasets
- Configuration files
- Secrets
- Multi-agent coordination

If it's just a skill with a workflow, SKILL.md is sufficient. Manifests are for systems that span layers.

## Template

Copy this into a `MANIFEST.md` at the system's primary location:

```markdown
# [System Name] — System Manifest

**Status:** Active | In Development | Deprecated
**Created:** YYYY-MM-DD
**Last Updated:** YYYY-MM-DD
**Version:** v1.0
**Project:** [project name or "universal"]

## Purpose

[2-3 sentences: what this system does and why it exists]

## Component Map

### Skills
| Component | Path | Purpose |
|-----------|------|---------|
| SKILL.md | skills/[name]/SKILL.md | Routing and invocation |
| Workflow | workflows/[name].md | [what it does] |

### Tools
| Tool | Path | CLI | Purpose |
|------|------|-----|---------|
| [name].ts | tools/[name].ts | `bun tools/[name].ts [args]` | [what it does] |

### Hooks & Handlers
| Handler | Path | Event | Purpose |
|---------|------|-------|---------|
| [name].ts | hooks/handlers/[name].ts | [event] | [what it does] |

### Data
| Dataset | Path | Format | Source | Refresh |
|---------|------|--------|--------|---------|
| [name] | [path] | CSV/JSON/JSONL | [source] | daily/weekly/manual |

### Secrets
| Secret | Access | Used By |
|--------|--------|---------|
| [name] | SecretClient.read("[service]", "[field]") | [which tool] |

### Infrastructure
| Service | Host | Port | Purpose |
|---------|------|------|---------|
| [name] | [host] | [port] | [purpose] |

## Data Flow

```
[Source] → [Ingestion] → [Processing] → [Storage] → [Output]
```

## How to Run

```bash
# Full system
[command]

# Individual components
[command per component]
```

## Monitoring

| Check | Command | Expected |
|-------|---------|----------|
| [what] | [command] | [result] |

## Known Issues

- [ ] [Issue — description and impact]

## Change Log

| Version | Date | Summary |
|---------|------|---------|
| v1.0 | YYYY-MM-DD | Initial documentation |
```

## Where to Place Manifests

| System Type | Location |
|-------------|----------|
| Skill-centric | `skills/[name]/MANIFEST.md` |
| Infrastructure | Primary service directory |
| Project-specific | `memory/projects/[id]/knowledge/MANIFEST.md` |
| Cross-cutting | `guides/templates/` (template only) |
