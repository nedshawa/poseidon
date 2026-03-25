---
name: thinking
description: >-
  Multi-mode analytical and creative thinking — first principles decomposition,
  adversarial red teaming, multi-perspective council debates, creative brainstorming,
  scientific hypothesis testing, world/threat modeling, and iterative depth analysis.
  USE WHEN first principles, decompose, challenge assumptions, red team, critique,
  stress test, council, debate, perspectives, brainstorm, be creative, think about,
  figure out, experiment, hypothesis, threat model, world model, deep exploration.
---

## Workflow Routing

| Request Pattern | Route To |
|---|---|
| First principles, decompose, challenge assumptions, rebuild from scratch | `first-principles/SKILL.md` |
| Red team, critique, stress test, attack idea, devil's advocate, find weaknesses | `red-team/SKILL.md` |
| Council, debate, perspectives, weigh options, multiple viewpoints | `council/SKILL.md` |
| Brainstorm, be creative, divergent ideas, creative solutions, tree of thoughts | `creative/SKILL.md` |
| Think about, figure out, experiment, hypothesis, iterate, optimize | `science/SKILL.md` |
| Threat model, world model, future analysis, scenario planning, time horizons | `world-model/SKILL.md` |
| Deep exploration, iterative depth, multi-angle analysis | `iterative-depth/SKILL.md` |

## Chained Thinking

Modes can be chained for deeper analysis:
- **FirstPrinciples then RedTeam**: Decompose then attack the decomposition
- **Council then Science**: Debate options then test the winner
- **RedTeam then Creative**: Find weaknesses then brainstorm fixes
- **FirstPrinciples then Council then RedTeam**: Full analysis pipeline

To chain: "first principles then red team this" or "decompose and then attack it"

## When Multiple Modes Match

If a request could fit multiple modes, prefer this priority:
1. Explicit mode keywords take precedence ("red team" always routes to red-team)
2. If the request is about breaking down a problem -> first-principles
3. If the request is about finding flaws -> red-team
4. If the request is about choosing between options -> council
5. If the request is about generating new ideas -> creative
6. If the request is about testing a hypothesis -> science
7. If the request is about future scenarios -> world-model
8. If the request is about exhaustive exploration -> iterative-depth

## Integration

- **Project decisions**: Key outputs can be appended to a project's DECISIONS.md when a project context is active
- **Cross-skill use**: Any skill can invoke a thinking mode when deeper analysis is needed
- **Chaining**: Complete one mode's output before starting the next in a chain

## Scope

**NOT for:**
- Code generation -> use `/commit`, `/refactor`, `/test`
- Research/information gathering -> use `/research`
- Security scanning -> use `/security-audit`
- Simple factual questions -> answer directly without a thinking framework
