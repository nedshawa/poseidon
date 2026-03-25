---
name: skill-builder
description: >
  Creates, validates, and upgrades Poseidon skills following the agentskills.io
  specification. Enforces quality gates and best practices for skill authoring.
  USE WHEN create skill, new skill, scaffold skill, validate skill, update skill,
  fix skill, skill template, skill quality, skill check.
---

# Skill Builder

Meta-skill for creating and maintaining Poseidon skills. Enforces the agentskills.io
specification so every skill in the system meets a consistent quality bar.

## Capabilities

- **Create**: Scaffold new skills with correct structure, frontmatter, and scope boundaries
- **Validate**: Run quality gates against any existing skill and report pass/fail
- **Upgrade**: Improve existing skills with better descriptions, scope, and structure

## Skill Types

| Type | Structure | When to use |
|------|-----------|-------------|
| Simple | Single SKILL.md | One clear behavior, no branching |
| Complex | SKILL.md + workflows/ | Multiple workflows or multi-step processes |

## Quality Gate (agentskills.io spec)

All skills must pass these checks:

1. **Name**: lowercase + hyphens only, 1-64 characters, no reserved words
2. **Description**: non-empty, max 1024 chars, third person, includes "USE WHEN"
3. **No XML tags** in name or description fields
4. **No reserved words**: "anthropic", "claude" in name or description
5. **Body**: SKILL.md under 500 lines (use workflows/ for depth)
6. **Scope boundary**: must include a "NOT for:" section
7. **References**: workflow files one level deep only (no nested subdirectories)

## Scope

This skill handles skill authoring and maintenance within Poseidon.

**NOT for:**
- Runtime skill loading or execution logic
- Skill registry infrastructure or deployment
- Agent orchestration or routing between skills
- Testing skill behavior (use the evals skill instead)

## Workflows

- [Create Skill](workflows/create-skill.md) - Scaffold a new skill from scratch
- [Validate Skill](workflows/validate-skill.md) - Run quality gate checks
- [Upgrade Skill](workflows/upgrade-skill.md) - Improve an existing skill
