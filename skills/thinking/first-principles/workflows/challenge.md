# Challenge Workflow

**Purpose**: Systematically challenge every assumption and constraint, classifying each as hard (physics), soft (choice), or assumption (unvalidated).

**When to Use**: After Deconstruct, overly restrictive requirements, "we can't do X" without evidence, before major decisions.

## The Core Question

> "Is this a law of physics, or is it a choice someone made?"

If it is a choice, it can be changed.

## Process

### Step 1: List All Stated Constraints

Gather everything presented as a constraint: requirements, "we have to" statements, best practices, historical decisions, budget/timeline limits, technical limitations, policies.

### Step 2: Classify Each Constraint

| Type | Test | Examples |
|------|------|----------|
| **HARD** | Would violating this break laws of nature? | Speed of light, thermodynamics |
| **SOFT** | Could a decision-maker change this? | "We use AWS," budget limits |
| **ASSUMPTION** | Has this been tested? | "Users won't accept that" |

### Step 3: Challenge Non-Hard Constraints

For SOFT: Who decided and why? What happens if violated? Is the original reason still valid?

For ASSUMPTIONS: What evidence supports this? Has anyone tested the opposite? What would prove this wrong?

### Step 4: The "Remove It" Test

> "If we removed this constraint entirely, what would become possible?"

If removing it unlocks significant value, it is worth challenging.

### Step 5: Find Hidden Assumptions

The most dangerous constraints are never stated: "Of course we need a database" -- Do we? "Obviously this needs auth" -- Does it?

## Output Template

```markdown
## Constraint Analysis: [Subject]

### HARD Constraints (Cannot Change)
| Constraint | Why Hard |
|------------|----------|

### SOFT Constraints (Choice)
| Constraint | Who Decided | Still Valid? | If Removed? |
|------------|-------------|--------------|-------------|

### ASSUMPTIONS (Unvalidated)
| Assumption | Evidence | Counter-Evidence | How to Test |
|------------|----------|------------------|-------------|

### Constraints Worth Challenging
1. **[Constraint]**: [Why, what becomes possible]

### Hidden Constraints Found
- [Implicit assumption never stated]
```

## After Challenge

Flow to **Reconstruct** (build using only hard constraints) or return analysis for decision-making.
