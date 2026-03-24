---
name: debug
description: >-
  Systematic debugging using reproduce-isolate-fix-verify methodology.
  USE WHEN the user reports a bug, error, unexpected behavior, or something broken.
---

## Instructions

Debug issues using a hypothesis-driven approach. Never guess randomly.

### Step 1: Reproduce

Understand the problem before touching code:
- Get the exact error message or unexpected behavior
- Identify the steps to reproduce
- Determine expected vs actual behavior
- Check logs, stack traces, and error output
- Note the environment (OS, runtime version, config)

### Step 2: Form Hypotheses

Based on the evidence, list 2-4 ranked hypotheses:
```
Hypothesis 1 (most likely): [description] - because [evidence]
Hypothesis 2: [description] - because [evidence]
Hypothesis 3: [description] - because [evidence]
```

### Step 3: Isolate

Test hypotheses starting with most likely:
- Read the relevant code paths
- Add targeted logging or use debugger output
- Binary search: narrow the problem space by half each step
- Check recent changes with `git log --oneline -10` and `git diff`
- Verify assumptions about inputs and state

For each hypothesis tested, record:
- What you checked
- What you found
- Whether it confirmed or eliminated the hypothesis

### Step 4: Fix

Once the root cause is identified:
- Make the minimal fix that addresses the root cause
- Do NOT fix symptoms — fix the underlying problem
- Consider if this bug class exists elsewhere in the codebase
- Write or update a test that catches this specific bug

### Step 5: Verify

Confirm the fix works:
- Run the reproduction steps — issue should be resolved
- Run existing tests — nothing should regress
- Run the new test — it should pass with fix, fail without

### Output Format

```
## Debug Report

**Problem:** [one-line description]
**Root Cause:** [what actually went wrong]
**Fix:** [what was changed and why]
**Test:** [test added to prevent regression]
**Hypotheses tested:** [N] | **Time to resolution:** [estimate]
```

## Scope

NOT for:
- Performance optimization (use refactor skill)
- Adding new features
- Debugging build/CI pipelines (use deploy skill)
- Security vulnerability investigation (use security-audit skill)
