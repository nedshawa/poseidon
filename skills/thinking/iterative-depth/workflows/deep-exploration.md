# Workflow: Deep Exploration

## Metadata
- name: Deep Exploration
- description: Executes the full 4-pass iterative depth process, progressively deepening from surface scan to synthesis.
- triggers: ["deep exploration", "deep dive", "4-pass", "thorough analysis"]

## Inputs
- **topic**: The subject to analyze
- **context**: Background information, constraints, goals
- **focus_areas**: Areas to prioritize in Pass 3 (optional — discovered in Pass 2 if omitted)

## Steps

### Pass 1: Surface (2 minutes)
Produce a quick inventory: one-sentence summary, 3-5 key concepts, stakeholders, obvious constraints, and initial hypothesis. If spending more than 2 minutes, move on.

### Pass 2: Structure (5 minutes)
Map relationships: dependency graph, conflict map, priority ranking, critical path. Select 2-3 areas for Pass 3 based on highest uncertainty, highest impact, or highest coupling.

### Pass 3: Depth (10 minutes)
For each selected area: test assumptions, explore edge cases, trace implications (if A then B then C), identify unknowns, note surprises vs. Pass 1. Spend equal time per area.

### Pass 4: Synthesis (5 minutes)
Integrate findings: key insight (not visible in Pass 1), revised understanding, confidence assessment, specific recommendation, and next questions for future exploration.

## Output Format

```
## Deep Exploration: [Topic]

### Pass 1: Surface Overview
- **Summary**: [One sentence]
- **Key concepts**: [3-5 items]
- **Stakeholders**: [Who cares]
- **Constraints**: [Known limits]
- **Initial hypothesis**: [Gut reaction]

### Pass 2: Structure Map
- **Dependencies**: [What depends on what]
- **Conflicts**: [Where priorities clash]
- **Critical path**: [What gates everything]
- **Deep dive targets**: [2-3 areas selected and why]

### Pass 3: Deep Dives
#### [Area 1]
[Assumptions, edge cases, implications, unknowns, surprises]

#### [Area 2]
[Assumptions, edge cases, implications, unknowns, surprises]

### Pass 4: Synthesis
- **Key insight**: [Non-obvious finding]
- **Revised understanding**: [What changed]
- **Confidence**: [High/Medium/Low on key claims]
- **Recommendation**: [Action]
- **Next questions**: [What to explore next]
```
