---
name: agents
description: >-
  Compose custom AI agents from personality traits, expertise, and communication
  styles. Create specialized perspectives for analysis, debate, and problem-solving.
  Agents can be project-scoped or global. USE WHEN create agent, custom agent,
  spin up agent, agent with expertise in, specialist agent, compose agent,
  list agents, available traits, agent personalities.
---

## Workflow Routing

| Request Pattern | Route To |
|---|---|
| Compose agent, build agent interactively, design persona | `workflows/compose.md` |
| Create agent, quick agent, make me an agent named | `workflows/create.md` |
| List agents, show agents, available traits, what agents exist | `workflows/list.md` |

## How Agents Work

Agents are composed from three trait dimensions (defined in `data/traits.yaml`):

1. **Personality** -- behavioral style (analytical, creative, provocative, etc.)
2. **Expertise** -- domain knowledge (architecture, security, data, etc.)
3. **Approach** -- working method (systematic, exploratory, adversarial, etc.)

These combine into a persona definition saved as YAML. When invoked, the persona
is injected as a system prompt into a Claude Code subagent, shaping its responses
to reflect that specialist's perspective.

Optional: ElevenLabs voice assignment from `data/voices.yaml` for spoken output.

## Agent Storage

User agents are stored at `~/.poseidon/agents/{name}.yaml` -- outside the skill
directory so they persist across updates. See `references/agent-example.yaml` for
the schema.

## Project Scoping

Agents can be scoped to specific projects via the `project_scope` field:
- Empty array = global agent, available everywhere
- List of project names = only available in those project contexts

## Effectiveness Tracking

Agent usage and quality signals are logged to `thinking-runs.jsonl` alongside
other thinking skill runs, enabling comparison of persona effectiveness over time.

## References

- `references/trait-guide.md` -- designing effective personas
- `references/agent-example.yaml` -- agent YAML schema

## Scope

**NOT for:**
- Agent teams or multi-agent orchestration -> use Claude Code TeamCreate natively
- One-off roleplay without persistence -> just prompt directly
- Modifying the base trait library -> edit `data/traits.yaml` directly
