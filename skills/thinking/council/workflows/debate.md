# Debate Workflow

**Purpose**: Full structured multi-perspective debate with 3 rounds -- positions, cross-examination, and synthesis.

**When to Use**: Important decisions requiring multiple viewpoints, choosing between viable alternatives, structured disagreement analysis.

## Prerequisites

- A topic or question to debate
- Optional: custom perspectives (defaults selected by domain)

## Process

### Step 1: Select Perspectives

Choose 4-5 perspectives relevant to the topic:

| Domain | Defaults |
|--------|----------|
| Technical | Architect, Engineer, Security Researcher, Pragmatist |
| Product | Engineer, Designer, End User, Business |
| Business | Strategist, Finance, Operations, Customer |
| General | Pragmatist, Optimist, Skeptic, Domain Expert |

### Step 2: Round 1 -- Positions

Each perspective states their position independently (50-150 words). They speak from their viewpoint, are specific and substantive, and have not seen others' responses.

### Step 3: Round 2 -- Cross-Examination

Each perspective responds to the others (50-150 words). Must reference specific points by name ("I disagree with the Architect's point about X because..."). The value is in genuine friction -- engage with actual arguments.

### Step 4: Round 3 -- Synthesis

Each perspective gives their final position (50-150 words): where the council agrees, where they still disagree, and their final recommendation. Forced consensus is worse than acknowledged tension.

### Step 5: Council Synthesis

```markdown
## Council Debate: [Topic]

### Perspectives: [List]

### Round 1: Positions
**[Perspective]:** [Position]

### Round 2: Cross-Examination
**[Perspective]:** [Response referencing others]

### Round 3: Synthesis
**[Perspective]:** [Final position]

### Council Synthesis
**Consensus:** [Points where 3+ perspectives agreed]
**Unresolved Tensions:** [Points still contested]
**Recommended Path:** [Based on weight of arguments]
**Key Insight:** [Most valuable thing surfaced by the debate]
```

## Custom Perspectives

- "Council with legal" -> Add Legal/Regulatory viewpoint
- "Just architect and engineer" -> Only those two
- Any role can be added as a perspective

## Quick Mode

For fast checks: 3 perspectives, 1 round (positions only), brief summary of agreement and disagreement. Use for sanity checks and low-stakes decisions.
