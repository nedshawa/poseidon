---
name: refactor
description: >-
  Performs safe incremental refactoring with test verification at each step.
  USE WHEN the user asks to refactor, clean up, restructure, or simplify code.
---

## Instructions

Refactor code in small, verified steps. Never make large sweeping changes at once.

### Step 1: Identify Targets

Read the code and identify refactoring opportunities:
- Functions over 40 lines
- Files over 300 lines
- Duplicated logic (3+ occurrences)
- Deep nesting (4+ levels)
- God objects or functions doing too many things
- Dead code (unreachable or unused exports)
- Unclear naming that requires reading implementation to understand

Prioritize by impact: high-traffic code paths first.

### Step 2: Verify Test Baseline

Before changing anything:
- Run the existing test suite and confirm it passes
- If no tests exist for the target code, write them FIRST
- Record the passing test count as your baseline

### Step 3: Plan Changes

For each refactoring, define:
- What: the specific transformation (extract function, rename, split file, etc.)
- Why: the concrete improvement (readability, testability, performance)
- Risk: what could break (callers, imports, types)

Present the plan before executing if changes touch more than 3 files.

### Step 4: Execute in Small Steps

One refactoring at a time:
1. Make a single, focused change
2. Run tests immediately
3. If tests pass, proceed to next change
4. If tests fail, revert and investigate

Common safe refactorings:
- **Extract function**: Pull a block into a named function
- **Rename**: Change names to reflect purpose
- **Split file**: Separate concerns into distinct modules
- **Simplify conditional**: Flatten nested if/else with early returns
- **Remove dead code**: Delete unused functions, imports, variables

### Step 5: Verify

After all changes:
- Run full test suite — same count should pass
- Confirm no new warnings or type errors
- Review the diff to ensure no behavior changed

## Scope

NOT for:
- Changing functionality or behavior (that is a feature, not a refactor)
- Migrating to new frameworks or languages
- Performance optimization (unless it is also a clarity improvement)
- Reformatting code style (use a formatter/linter)
