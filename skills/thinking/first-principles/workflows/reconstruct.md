# Reconstruct Workflow

**Purpose**: Build an optimal solution from scratch using only the fundamental truths and hard constraints identified through Deconstruct and Challenge.

**When to Use:**
- After completing Deconstruct and Challenge
- When existing solutions are clearly suboptimal
- When you need to escape a local maximum
- To generate innovative alternatives to conventional approaches

## Core Principle

> "If we knew nothing about how this is currently done, and only knew the fundamental truths, what would we build?"

Optimize **function** (what you accomplish) rather than **form** (how it has traditionally been done).

## Process

### Step 1: State Only the Hard Constraints

From the Challenge analysis, list ONLY hard constraints: laws of physics, mathematical requirements, verified empirical facts, true immutable requirements.

Exclude all soft constraints, assumptions, and conventions.

### Step 2: Define the Function

What is the actual outcome needed?

- Not "we need a database" but "we need to persist and retrieve data reliably"
- Not "we need microservices" but "we need to deploy components independently"
- Not "we need a mobile app" but "users need to accomplish X from anywhere"

### Step 3: Blank Slate Design

Pretend you have never seen the current solution. Generate 3+ approaches:
- If starting a new company to solve just this problem, what would you build?
- What would someone from a completely different field build?
- What is the simplest thing that satisfies only the hard constraints?

### Step 4: Cross-Domain Synthesis

Look for solutions in unrelated fields:
- What industry solved an analogous problem?
- What technology from another domain could apply?

### Step 5: Evaluate Against Function

| Solution | Satisfies Hard Constraints? | Achieves Function? | Simpler Than Current? |
|----------|----------------------------|--------------------|-----------------------|
| [A] | Yes/No | Yes/No | Yes/No |
| [B] | Yes/No | Yes/No | Yes/No |

Best solution: satisfies constraints, achieves function, maximizes simplicity.

### Step 6: Compare to Current Approach

| Aspect | Current | Reconstructed | Delta |
|--------|---------|---------------|-------|
| Complexity | [X] | [Y] | [Simpler/Same/More] |
| Cost | [X] | [Y] | [Lower/Same/Higher] |

## Output Template

```markdown
## Reconstruction: [Subject]

### Hard Constraints Only
1. [Immutable constraint]

### Function to Optimize
[What we are actually trying to accomplish]

### Blank Slate Solutions
**Option A**: [Approach, how it satisfies constraints, pros/cons]
**Option B**: [Approach, how it satisfies constraints, pros/cons]

### Cross-Domain Insights
- From [Field]: [Applicable concept]

### Recommended Solution
**[Option X]** because [reasoning]

### What Changes
- Eliminated: [Complexity that was not fundamental]
- Simplified: [Over-engineering from soft constraints]
- Added: [New approaches from first principles]
```

## Common Patterns

- **"Do we even need this?"** -- Reconstructed solutions often eliminate entire components
- **"Different tech, same function"** -- The function stays but the form changes completely
- **"Combine steps"** -- Removing soft constraints allows merging what were separate steps
