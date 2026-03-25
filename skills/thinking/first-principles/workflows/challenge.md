# Challenge Workflow

**Purpose**: Systematically challenge every assumption and constraint, classifying each as hard (physics), soft (choice), or assumption (unvalidated).

**When to Use:**
- After Deconstruct, to evaluate what is actually fixed
- When requirements feel overly restrictive
- When "we can't do X" is stated without evidence
- Before major architecture or strategy decisions

## The Core Question

For every stated constraint, ask:

> "Is this a law of physics, or is it a choice someone made?"

If it is a choice, it can be changed.

## Process

### Step 1: List All Stated Constraints

Gather everything presented as a constraint: requirements, "we have to" statements, best practices, historical decisions, budget limits, technical limitations, policy requirements.

### Step 2: Classify Each Constraint

| Type | Test | Examples |
|------|------|----------|
| **HARD** | Would violating this break laws of nature? | Speed of light, thermodynamics |
| **SOFT** | Could a decision-maker change this? | "We use AWS," budget limits |
| **ASSUMPTION** | Has this been tested? What is the evidence? | "Users won't accept that" |

### Step 3: Challenge Each Non-Hard Constraint

For SOFT constraints:
- Who made this decision and why?
- What would happen if we violated it?
- Is the original reason still valid?

For ASSUMPTIONS:
- What evidence supports this?
- Has anyone tested the opposite?
- What would prove this wrong?

### Step 4: The "Remove It" Test

For each soft constraint and assumption:

> "If we removed this constraint entirely, what would become possible?"

If removing it unlocks significant value, it is worth challenging.

### Step 5: Find Hidden Assumptions

The most dangerous constraints are the ones so assumed they are never stated:
- "Of course we need a database" -- Do we?
- "Obviously this needs authentication" -- Does it?
- "Users expect a web interface" -- Do they?

## Output Template

```markdown
## Constraint Analysis: [Subject]

### HARD Constraints (Physics/Reality)
| Constraint | Why Hard | Cannot Change Because |
|------------|----------|-----------------------|
| [X] | [Physics law] | [Would violate reality] |

### SOFT Constraints (Policy/Choice)
| Constraint | Who Decided | Still Valid? | If Removed? |
|------------|-------------|--------------|-------------|
| [X] | [Person/team] | [Yes/No] | [What becomes possible] |

### ASSUMPTIONS (Unvalidated)
| Assumption | Evidence | Counter-Evidence | How to Test |
|------------|----------|------------------|-------------|
| [X] | [What supports it] | [What contradicts] | [Validation method] |

### Constraints Worth Challenging
1. **[Constraint]**: [Why challenge it, what becomes possible]

### Hidden Constraints Found
- [Implicit assumption never stated]
```

## After Challenge

Flow to:
- **Reconstruct** -> Build solution using only hard constraints
- Back to requester with constraint analysis for decision-making
