# Agent Deployment Guide

**How to compose, deploy, and coordinate agents in Poseidon.**

## Three Agent Systems

| System | What | When | Has Voice? |
|--------|------|------|-----------|
| **Task Tool Types** | Pre-built (Architect, Engineer, Explore, etc.) | Internal workflow use | No |
| **Named Agents** | Persistent identities (Serena, Marcus, Rook, Ava, Alex) | Recurring work, relationships | Yes |
| **Custom Agents** | Dynamic composition from traits | "custom agents" request | Yes |

## Named Agents

| Agent | Icon | Role | Best For |
|-------|------|------|---------|
| Serena Blackwood | 👤 | Architect | System design, trade-offs |
| Marcus Webb | 👤 | Engineer | Implementation, debugging |
| Rook Blackburn | 👤 | Pentester | Security assessment |
| Ava Sterling | 👤 | Research Lead | Multi-source synthesis |
| Alex Rivera | 👤 | Data Analyst | Quantitative analysis |

## Model Selection (CRITICAL for speed)

| Task Type | Model | Speed | When |
|-----------|-------|-------|------|
| Simple checks, file reads | `haiku` | 10-20x faster | Grunt work |
| Standard coding, research | `sonnet` | Balanced | Most work |
| Deep reasoning, architecture | `opus` | Highest quality | Strategic decisions |

**Parallel agents benefit from haiku** — 5 haiku agents are faster AND cheaper than 1 opus agent doing sequential work.

## Deployment Patterns

### Single Agent
```
Task({ prompt: "...", subagent_type: "Engineer", model: "sonnet" })
```

### Parallel Agents (3+)
```
Task({ prompt: "Angle A...", subagent_type: "general-purpose", model: "sonnet", run_in_background: true })
Task({ prompt: "Angle B...", subagent_type: "general-purpose", model: "sonnet", run_in_background: true })
Task({ prompt: "Angle C...", subagent_type: "general-purpose", model: "sonnet", run_in_background: true })
```

### Agent Teams (coordinated)
```
TeamCreate({ name: "research-team", description: "...", agents: [...] })
```

### Spotcheck (verification)
After parallel work, always verify:
```
Task({ prompt: "Verify consistency across results: [merged output]", model: "haiku" })
```

## Project Preferences

Projects can customize agent behavior via `preferences/agents.yaml`:
```yaml
preferred_agents: [ava, alex]
default_model: sonnet
max_parallel: 5
```

## Visual Announcements (Mandatory)

When deploying agents:
```
🤖 **Agents Deployed:**
   👤 Ava Sterling (Research Lead) — market data synthesis
   👤 Alex Rivera (Data Analyst) — correlation analysis
   ⏳ Running in parallel... (estimated 60s)
```

When agents return:
```
   👤 Ava Sterling ✓ returned (20 sources, 45s)
   👤 Alex Rivera ✓ returned (8 datasets, 38s)
   📊 2/2 agents complete ██████████ 100%
```

## Best Practices

1. **Always specify model** — don't default to opus for simple tasks
2. **Parallel > sequential** — launch independent work simultaneously
3. **Spotcheck parallel results** — verify consistency with a haiku agent
4. **Use named agents for recurring work** — they provide continuity
5. **Project-scope agents** — set `project_scope` in agent YAML for specialization
6. **Never call voice/notifications from subagents** — only primary agent does this
