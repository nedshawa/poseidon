# Project Setup Guide

**How to create and configure a new Poseidon project.**

## Quick Start

Say "new project [name]" in any Poseidon session. The system will:
1. Create `memory/projects/[name]/` from template
2. Copy 5 template files (META.yaml, CONTEXT.md, GOALS.md, DECISIONS.md, RULES.md)
3. Create `knowledge/` directory for research and specs
4. Create `preferences/` directory for skill customization
5. Set as active project

## Project Structure

```
memory/projects/[name]/
├── META.yaml           ← Project metadata (name, status, tags, domain)
├── CONTEXT.md          ← Current state (auto-updated each session)
├── GOALS.md            ← What this project is building toward
├── DECISIONS.md        ← Architectural decisions (append-only)
├── RULES.md            ← Project-specific rules (override global)
├── knowledge/          ← Research, specs, reference material
│   ├── research/       ← Auto-saved research results
│   └── guides/         ← Project-specific how-tos
└── preferences/        ← Skill behavior customization
    ├── research.yaml   ← Research tier, sources, domain
    ├── thinking.yaml   ← Thinking mode defaults
    └── agents.yaml     ← Agent preferences
```

## After Creation — First Steps

### 1. Fill in META.yaml

```yaml
name: "My Project"
status: active
created: "2026-03-28T00:00:00Z"
description: "What this project is about"
tags: [domain, category]
last_used: "2026-03-28T00:00:00Z"
research_default: standard     # quick | standard | extensive | deep
preferred_sources: []          # perplexity, claude, gemini, grok
domain: ""                     # finance, security, tech, etc.
```

### 2. Define Goals

Edit `GOALS.md` with:
- Primary goal (one sentence)
- Success criteria (checkboxes)
- Non-goals (what this project does NOT do)

### 3. Configure Preferences (Optional)

Uncomment and edit `preferences/research.yaml`:
```yaml
default_tier: extensive
preferred_sources: [perplexity, gemini]
domain: finance
auto_persist: true
```

### 4. Start Working

Just start asking questions or giving tasks. Poseidon will:
- Use your project preferences for skill behavior
- Auto-update CONTEXT.md after each session
- Save research to knowledge/research/
- Log decisions to DECISIONS.md when architectural choices are made

## What Projects Inherit (Universal)

Every project automatically has access to:
- All 25+ skills and 207+ workflows
- All configured API keys via SecretClient
- The Algorithm (v1.2) for complex work
- All 25 hook handlers (security, learning, scoring, governance)
- All 5 named agents
- All steering rules

You don't need to configure any of this per project — it's universal.

## What Projects Customize (Scoped)

Only these change between projects:
- CONTEXT.md, GOALS.md, DECISIONS.md, RULES.md
- knowledge/ (research and specs)
- preferences/ (how skills behave)

## Switching Projects

```
"switch to [name]"         → Loads new project context
"switch to main"           → Return to default workspace
```

## Archiving Projects

Set `status: archived` in META.yaml. Archived projects won't appear in the project picker but their data is preserved.
