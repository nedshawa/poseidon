---
name: code-review
description: >-
  Reviews code for security, performance, maintainability, and correctness.
  USE WHEN the user asks to review code, a PR, a diff, or check code quality.
---

## Instructions

Perform a structured code review across four dimensions.

### Step 1: Identify the Target

Determine what to review:
- A specific file or set of files
- A git diff (`git diff`, `git diff main...HEAD`)
- A pull request (use `gh pr diff <number>`)

Read all relevant code before starting the review.

### Step 2: Review Checklist

Evaluate each dimension and assign a rating (PASS / CONCERN / FAIL):

**Security**
- Input validation and sanitization
- Authentication/authorization checks
- SQL injection, XSS, SSRF vectors
- Secrets or credentials in code
- Dependency vulnerabilities

**Performance**
- N+1 queries or unnecessary loops
- Missing indexes on queried fields
- Unbounded data fetching (no pagination/limits)
- Memory leaks or resource cleanup
- Caching opportunities

**Maintainability**
- Clear naming and code organization
- Functions under 40 lines, files under 300 lines
- DRY without over-abstraction
- Error handling is explicit, not swallowed
- Types are specific, not `any`

**Correctness**
- Edge cases handled (null, empty, boundary values)
- Error paths tested
- Race conditions in async code
- Off-by-one errors
- Return values used correctly

### Step 3: Output Format

```
## Code Review: [target]

| Dimension       | Rating  | Issues |
|----------------|---------|--------|
| Security       | PASS    | 0      |
| Performance    | CONCERN | 2      |
| Maintainability| PASS    | 0      |
| Correctness    | FAIL    | 1      |

### Findings

#### [CONCERN] Performance: Unbounded query in getUsers()
- File: src/users.ts:45
- Issue: No LIMIT clause on database query
- Fix: Add pagination with default limit of 100

### Summary
[1-2 sentence overall assessment]
```

## Scope

NOT for:
- Reviewing entire repositories at once
- Style-only nitpicks (use a linter)
- Rewriting code (use refactor skill instead)
- Generating tests (use test skill instead)
