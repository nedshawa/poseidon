# Reconstruct Workflow

**Purpose**: Build an optimal solution from scratch using only hard constraints identified through Deconstruct and Challenge.

**When to Use**: After Deconstruct and Challenge, suboptimal existing solutions, escaping local maxima, generating innovative alternatives.

## Core Principle

> "If we knew nothing about how this is currently done, and only knew the truths, what would we build?"

Optimize **function** (what you accomplish) not **form** (how it has traditionally been done).

## Process

### Step 1: State Only Hard Constraints

From Challenge, list ONLY: laws of physics, mathematical requirements, verified facts, true immutable requirements. Exclude all soft constraints, assumptions, and conventions.

### Step 2: Define the Function

State the actual outcome needed -- not the method:
- Not "we need a database" but "persist and retrieve data reliably"
- Not "we need microservices" but "deploy components independently"
- Not "we need a mobile app" but "users accomplish X from anywhere"

### Step 3: Blank Slate Design

Generate 3+ approaches as if you have never seen the current solution:
- What would a new company build to solve just this?
- What would someone from a different field build?
- What is the simplest thing satisfying only hard constraints?

### Step 4: Cross-Domain Synthesis

What industry solved an analogous problem? What technology from another domain applies?

### Step 5: Evaluate Against Function

| Solution | Satisfies Constraints? | Achieves Function? | Simpler Than Current? |
|----------|------------------------|--------------------|-----------------------|
| [A] | Yes/No | Yes/No | Yes/No |

Best solution: satisfies constraints, achieves function, maximizes simplicity.

## Output Template

```markdown
## Reconstruction: [Subject]

### Hard Constraints Only
1. [Immutable constraint]

### Function to Optimize
[What we are actually trying to accomplish]

### Solutions
**Option A**: [Approach, constraints satisfied, pros/cons]
**Option B**: [Approach, constraints satisfied, pros/cons]

### Cross-Domain Insights
- From [Field]: [Applicable concept]

### Recommended Solution
**[Option X]** because [reasoning]

### What Changes
- Eliminated: [Non-fundamental complexity]
- Simplified: [Over-engineering from soft constraints]
- Added: [New approaches from first principles]
```

## Common Patterns

- **"Do we even need this?"** -- Reconstructed solutions often eliminate entire components
- **"Different tech, same function"** -- Function stays, form changes completely
- **"Combine steps"** -- Removing soft constraints allows merging separate steps
