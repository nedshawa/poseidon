---
name: test
description: >-
  Generates unit, integration, and e2e tests with framework auto-detection.
  USE WHEN the user asks to write tests, add test coverage, or create test files.
---

## Instructions

Generate tests that catch real bugs, not tests that just inflate coverage numbers.

### Step 1: Detect Framework

Check the project for existing test setup:
- `bun test` / `vitest` / `jest` -> check package.json and config files
- `pytest` / `unittest` -> check pyproject.toml or setup.cfg
- `go test` -> Go projects use stdlib testing
- Look at existing test files to match patterns and conventions

Use whatever framework the project already uses. Do not introduce a new one.

### Step 2: Determine Test Type

| Type        | When                                    | Focus                    |
|-------------|----------------------------------------|--------------------------|
| Unit        | Pure functions, utilities, transformers | Input/output correctness |
| Integration | Components that talk to each other      | Contracts and data flow  |
| E2E         | User-facing workflows                   | Complete user journeys   |

Default priority: Integration > Unit > E2E (unless user specifies).

### Step 3: Identify Test Cases

For each function or module under test:

**Happy path**: The primary use case works correctly
**Edge cases**: Empty input, null, zero, boundary values, max length
**Error cases**: Invalid input, missing required fields, network failures
**State transitions**: Before/after for stateful operations

### Step 4: Write Tests

Structure each test with:
```
describe('[module or function name]', () => {
  it('should [expected behavior] when [condition]', () => {
    // Arrange: set up test data
    // Act: call the function
    // Assert: verify the result
  });
});
```

Rules:
- One assertion per test (or closely related assertions)
- Test names describe behavior, not implementation
- No test should depend on another test's state
- Use factories or builders for complex test data, not raw objects
- Mock external services, never mock the code under test
- Prefer real implementations over mocks when feasible

### Step 5: Verify

- Run the new tests and confirm they pass
- Run the full suite to check for interference
- If writing tests for untested code, verify tests fail when logic is broken

## Scope

NOT for:
- Load testing or benchmarking
- Manual QA test plans
- Testing third-party libraries
- Generating test data fixtures (create them inline in tests)
