# Workflow: Tree of Thoughts

## Metadata
- name: Tree of Thoughts
- description: Explores multiple solution paths in parallel with structured branching, evaluation, and pruning.
- triggers: ["tree of thoughts", "parallel exploration", "solution paths"]

## Purpose

Prevents tunnel vision by forcing exploration of fundamentally different approaches before committing. Each path branches into variations, creating a solution tree that is systematically pruned to find the strongest option.

## Inputs
- **problem**: The problem to solve
- **constraints**: Hard constraints that cannot be violated
- **success_criteria**: How to measure a good solution (3-5 criteria)

## Steps

### Step 1: Problem Framing
State the problem, constraints, and success criteria clearly. Identify what type of problem this is (optimization, design, debugging, strategy).

### Step 2: Generate 3 Root Paths
Create 3 fundamentally different approaches. They should differ in philosophy, not just details.

For each path, write:
- **Name**: Short descriptive label
- **Philosophy**: The core idea in one sentence
- **Key bet**: What assumption must be true for this to work?

### Step 3: Branch Each Path
For each root path, generate 2-3 specific variations (branches).

Each branch should specify:
- How it differs from the other branches on this path
- One key advantage unique to this branch
- One key risk unique to this branch

This creates a tree of 6-9 total branches.

### Step 4: Quick Evaluation
Score each branch against success criteria (pass/fail for each criterion). Any branch that fails a hard constraint is immediately pruned.

### Step 5: Deep Evaluation of Survivors
For the remaining branches (typically 3-5), do deeper analysis:
- Effort estimate (relative: low/medium/high)
- Risk profile (what could go wrong, how bad, how likely)
- Reversibility (easy to undo if wrong?)
- Second-order effects (what else changes?)

### Step 6: Select and Develop
Choose the top 2 branches. For each, produce:
- A concrete implementation outline (5-7 steps)
- The first action to take
- The decision point where you'd know if it's working

### Step 7: Recommend
Pick one branch as primary and one as fallback. Define the trigger for switching from primary to fallback.

## Output Format

```
## Tree of Thoughts: [Problem]

### Paths
| Path | Philosophy | Key Bet |
|------|-----------|---------|

### Branch Tree
Path A → Branch A1, A2, A3
Path B → Branch B1, B2
Path C → Branch C1, C2, C3

### Evaluation
| Branch | [Criteria columns] | Effort | Risk | Reversible | Status |
|--------|---------------------|--------|------|------------|--------|

### Recommendation
- **Primary**: [Branch] — [why]
- **Fallback**: [Branch] — [trigger to switch]
```
