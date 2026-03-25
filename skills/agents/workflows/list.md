---
name: list
description: Show available agents and trait library
---

## Purpose

Display all user-created agents and the available trait library for reference.

## Process

### Step 1: List User Agents
Scan `~/.poseidon/agents/*.yaml` for saved agent definitions.

For each agent, display:
- **Name** and description
- **Traits**: personality, expertise, approach
- **Scope**: global or project-specific
- **Voice**: assigned or none

If no agents exist, say: "No agents created yet. Use /agents compose or
/agents create to build one."

### Step 2: Show Trait Library (if requested)
If the user asks about available traits, load `data/traits.yaml` and display
all three dimensions:

| Dimension | Available Traits |
|---|---|
| Personality | analytical, creative, provocative, empathetic, pragmatic, visionary |
| Expertise | software_architecture, security, devops, data_engineering, frontend, backend, research, product |
| Approach | systematic, exploratory, focused, adversarial, collaborative |

### Step 3: Show Voices (if requested)
If the user asks about voices, load `data/voices.yaml` and list configured
voice options.

## Output Format

```
=== Your Agents ===
{name}: {description}
  Traits: {personality} | {expertise} | {approach}
  Scope: {global/projects}

=== Available Traits ===
(shown on request)
```
