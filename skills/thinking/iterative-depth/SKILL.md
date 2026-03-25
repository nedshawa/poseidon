# Iterative Depth Thinking

## Metadata
- name: Iterative Depth
- version: 1.0.0
- description: Progressively deepens analysis through multiple passes, ensuring surface understanding before deep exploration and revealing insights that shallow analysis misses.
- triggers: ["deep dive", "analyze deeply", "iterative", "progressive", "layers"]

## Purpose

Prevents two failure modes: going too deep too fast (missing the big picture) and staying too shallow (missing critical details). Each pass builds on the previous, and the synthesis reveals what deeper analysis changed about the initial understanding.

## Process

### Pass 1: Surface (2 minutes)
Quick overview scan. Answer these questions:
- What is this about? (one sentence)
- Who are the key stakeholders?
- What are the obvious constraints?
- What are the key concepts or components?
- What is my initial reaction or hypothesis?

Do NOT go deep. Breadth over depth. Get the lay of the land.

### Pass 2: Structure (5 minutes)
Map how the parts relate to each other.
- What depends on what? Draw the dependency graph.
- Where are the conflicts or tensions?
- What are the priorities? What matters most?
- What is the critical path?
- Where are the coupling points?

Look for the shape of the problem. Is it a tree, a cycle, a bottleneck, a web?

### Pass 3: Depth (10 minutes)
Select the 2-3 most important areas identified in Pass 2. For each:
- Challenge the assumptions. What are we taking for granted?
- Explore the edge cases. What happens at the boundaries?
- Trace the implications. If X is true, what else must be true?
- Identify the unknowns. What do we not know that matters?

Go deep enough to surface non-obvious insights. The goal is to find something that Pass 1 missed.

### Pass 4: Synthesis (5 minutes)
Integrate everything from the previous passes.
- What did deeper analysis reveal that the surface scan missed?
- How did the structural map change after deep diving?
- What is the single most important insight?
- What is the recommended action based on full understanding?

The key insight should be something that would not have emerged from surface analysis alone.

## Output Format

```
## Iterative Depth Analysis: [Topic]

### Pass 1: Surface Overview
[Quick scan results — key concepts, stakeholders, constraints]

### Pass 2: Structure Map
[Dependencies, conflicts, priorities, critical path]

### Pass 3: Deep Dives
#### Area 1: [Name]
[Assumptions challenged, edge cases, implications]

#### Area 2: [Name]
[Assumptions challenged, edge cases, implications]

### Pass 4: Synthesis
- **Key Insight**: [The non-obvious finding]
- **Revised Understanding**: [How deep analysis changed the surface view]
- **Recommendation**: [Action based on full analysis]
```

## When to Use
- Complex problems where surface analysis feels insufficient
- Decisions where the obvious answer might be wrong
- Topics you are approaching for the first time
- Any situation where "it depends" is the initial answer

## Workflows
- [deep-exploration](workflows/deep-exploration.md) — Full 4-pass exploration
