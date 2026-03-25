---
name: create
description: Quick agent creation with sensible defaults
---

## Purpose

Create an agent from a single natural-language description, skipping the
interactive wizard. Auto-select traits based on domain keywords.

## Input Format

Accepts requests like:
- "create an agent named architect who specializes in system design"
- "make a security-focused agent called sentinel"
- "quick agent: data-engineer for pipeline work"

## Process

### Step 1: Parse Intent
Extract from the request:
- **name** -- the agent identifier (lowercase, hyphenated)
- **domain** -- what they specialize in
- **description** -- generate from context if not explicit

### Step 2: Auto-Select Traits
Load `data/traits.yaml` and match keywords from the domain description:

- **Personality**: pick the 1-2 most relevant traits for the domain
- **Expertise**: match against `keywords` arrays in expertise entries
- **Approach**: select the most natural approach for the domain

If no strong keyword match, default to: `pragmatic` + `systematic`.

### Step 3: Save
Write to `~/.poseidon/agents/{name}.yaml` with the auto-selected traits.
No voice assignment (user can add later via compose).
No project scope (global by default).

### Step 4: Confirm
Show the generated agent card and confirm:
"Agent '{name}' created with auto-selected traits. Invoke with /agent {name}"
"Run /agents compose to customize further."

## Examples

Input: "create an agent named architect who specializes in system design"
Result:
- personality: [analytical, pragmatic]
- expertise: [software_architecture, backend]
- approach: systematic

Input: "make a security agent called sentinel"
Result:
- personality: [analytical, provocative]
- expertise: [security]
- approach: adversarial
