# Poseidon Agent System

Poseidon uses a 3-tier agent architecture. Each tier serves a distinct purpose and the routing rules below determine which tier handles any given request.

---

## Tier 1: Task Tool Subagent Types

Pre-built agent types available inside Claude Code's `Task` tool. These are **internal workflow primitives** -- they execute subtasks and return results. They have no persistent identity, no voice, and no backstory.

### Available Types

| Type | Purpose |
|------|---------|
| `Architect` | System design, architecture decisions |
| `Designer` | UI/UX design, layout, visual structure |
| `Engineer` | Implementation, coding, building |
| `Explore` | Codebase exploration, discovery |
| `Plan` | Planning, breakdown, sequencing |
| `QATester` | Testing, validation, quality assurance |
| `Pentester` | Security testing, vulnerability scanning |
| `ClaudeResearcher` | Research via Claude's knowledge |
| `GeminiResearcher` | Research via Gemini |
| `GrokResearcher` | Research via Grok |
| `PerplexityResearcher` | Research via Perplexity (web-grounded) |
| `CodexResearcher` | Research via Codex |
| `general-purpose` | Blank slate -- used by ComposeAgent for custom agents |

These are invoked via `Task(subagent_type="<type>")`. They do NOT have voices, identities, or persistence. They are tools, not characters.

---

## Tier 2: Named Agents

Persistent identities with backstories, ElevenLabs voices, and defined personalities. Named agents are used for:

- **Recurring work** where consistent perspective matters
- **Voice output** where a distinct voice identity is needed
- **Relationship continuity** across sessions

Named agents are defined as YAML files in `agents/`. Each file specifies name, role, voice, traits, approach, and backstory.

### Current Named Agents

| Agent | Role | Voice | Approach |
|-------|------|-------|----------|
| Serena Blackwood | Architect | Premium UK Female | Architecture-first |
| Marcus Webb | Principal Engineer | Premium Male | Implementation-focused |
| Rook Blackburn | Pentester/Security | Enhanced UK Male | Attack-surface-first |
| Ava Sterling | Research Lead | Premium US Female | Breadth-then-depth |
| Alex Rivera | Data Analyst | Multi-perspective | Data-driven |

### Loading a Named Agent

Reference by first name: "use Serena", "ask Marcus", "have Rook review this".

---

## Tier 3: Custom Agents

Dynamic agents composed at runtime from traits via the `ComposeAgent` tool. Created when the user says "custom agents", "spin up agents", or similar. These agents get:

- Unique personality composed from `traits.yaml` (expertise + personality + approach)
- Auto-matched voice based on trait combination
- Ephemeral identity -- they exist for the task only

Custom agents always use `subagent_type="general-purpose"` with a composed prompt. Never use static types (Architect, Engineer, etc.) for custom agents.

---

## Routing Rules

| User Says | Tier | System | Example |
|-----------|------|--------|---------|
| "review the architecture" | 1 | `Task(subagent_type="Architect")` | Internal workflow |
| "run a security scan" | 1 | `Task(subagent_type="Pentester")` | Internal workflow |
| "research X using Perplexity" | 1 | `Task(subagent_type="PerplexityResearcher")` | Internal workflow |
| "use Serena", "ask Marcus" | 2 | Load named agent YAML, apply identity | Named agent |
| "have Rook pentest this" | 2 | Load named agent YAML, apply identity | Named agent |
| "custom agents", "spin up agents" | 3 | ComposeAgent from traits | Custom agents |
| "create 3 specialized agents" | 3 | ComposeAgent x3 with different traits | Custom agents |
| "agent team", "swarm" | -- | Delegation skill / TeamCreate | NOT the agent system |

---

## Forbidden Patterns

1. **Never use task tool types as custom agent identities.** `Architect` is a task type, not a custom agent. Custom agents always use `general-purpose`.
2. **Never confuse named agents with custom agents.** Named agents have persistent YAML definitions. Custom agents are ephemeral compositions.
3. **Never route "agent team" or "swarm" requests here.** Those go to the Delegation skill's TeamCreate.
4. **Never give task tool subagents voices or backstories.** They are stateless workers.

---

## Model Selection Matrix

| Scenario | Model | Rationale |
|----------|-------|-----------|
| Simple checks, formatting, linting | `haiku` | 10-20x faster, cost-efficient |
| Standard analysis, code review, research | `sonnet` | Balanced speed and quality |
| Architecture decisions, deep reasoning, security audits | `opus` | Maximum reasoning depth |
| Named agent work (architecture, security) | `opus` | Named agents handle high-value tasks |
| Parallel custom agents (grunt work) | `haiku` or `sonnet` | Speed matters for parallel fan-out |

---

## Spotcheck Pattern

When running multiple agents in parallel, apply spotchecking:

1. Run N agents on the task
2. Randomly select 1-2 results for deeper validation
3. If spotcheck fails, re-run the failed agent or escalate
4. Report spotcheck pass/fail alongside results

This catches low-quality outputs without the cost of validating every result.

---

## Project-Scoped Agents (Poseidon-Only Feature)

Named agents can be scoped to specific projects via the `project_scope` field in their YAML:

```yaml
project_scope: ["poseidon", "hunter-dalio"]
```

- `[]` (empty) = global agent, available everywhere
- `["project-name"]` = only loaded when working in that project

This prevents project-specific agents from polluting the global namespace and lets teams define agents relevant to their domain.

---

## File Locations

| File | Purpose |
|------|---------|
| `agents/*.yaml` | Named agent definitions |
| `skills/agents/SKILL.md` | Agents skill (custom agent composition) |
| `skills/agents/data/traits.yaml` | Base trait definitions for ComposeAgent |
| `docs/agent-system.md` | This document |
