# Delegation System

Poseidon delegates work to subagents using Claude Code's Task tool. Model selection, agent patterns, and verification are all structured to maximize throughput and correctness.

## Model Selection Matrix

| Model | Use Case | Speed | Cost |
|-------|----------|-------|------|
| haiku | Grunt work: file moves, bulk renames, simple transforms, data formatting | 10-20x faster than opus | Lowest |
| sonnet | Standard coding: feature implementation, bug fixes, test writing, refactoring | Baseline | Medium |
| opus | Deep reasoning: architecture decisions, debugging complex failures, multi-file analysis | Slowest | Highest |

Select the cheapest model that can reliably complete the task. Default to sonnet when uncertain.

## Agent Patterns

### Single Agent
One Task tool call with a focused prompt. Use for self-contained work that fits in one context window.

### Parallel Agents
Multiple Task tool calls launched simultaneously. Each agent works on an independent subtask. Use when tasks share no dependencies — for example, implementing tests for 5 different modules.

### Background Agents
Long-running agents dispatched while the primary conversation continues. Use for slow tasks like comprehensive research or large refactors that do not block the user.

### Agent Teams
Coordinated group of agents with defined roles. Example: one agent writes code, another writes tests, a third reviews both. Use for work that benefits from separation of concerns.

### Worktree Isolation
Each agent operates in a separate git worktree to avoid file conflicts. Use when parallel agents modify overlapping files. Merge results after all agents complete.

### Competing Hypotheses
Two or more agents tackle the same problem with different approaches. Compare results and select the best. Use for debugging where the root cause is unclear.

### Writer/Reviewer
One agent produces output, another reviews it against defined criteria. Use for any deliverable where quality matters — documentation, architecture proposals, security-sensitive code.

## Spotcheck Pattern

After parallel work completes, always dispatch an additional verification agent to spotcheck results. This agent reads all outputs and confirms consistency, correctness, and completeness. Skipping spotcheck is a system violation for any parallel delegation involving 3+ agents.

## Task Tool Usage

```
Task(
  model: "haiku" | "sonnet" | "opus",
  prompt: "Clear, scoped instruction with all necessary context"
)
```

Every Task call must include:
- **Explicit scope** — what to do and what NOT to do
- **Success criteria** — how the agent knows it is done
- **Context** — file paths, relevant decisions, constraints

Subagents always run in NATIVE mode. Only the primary agent uses ALGORITHM mode.
