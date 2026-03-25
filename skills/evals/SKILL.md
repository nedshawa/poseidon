---
name: evals
description: >
  Tests and benchmarks AI agent behavior with structured evaluations. Creates
  test suites, runs evaluations against expected outputs, and compares model or
  prompt performance. USE WHEN eval, evaluate, test agent, benchmark, verify
  behavior, regression test, capability test, run eval, compare models, compare
  prompts, score output, grade response.
---

# Evals

Structured evaluation framework for testing AI agent behavior. Supports both
deterministic checks (exact match, regex) and subjective scoring (LLM-as-judge).

## Capabilities

- **Run**: Execute eval suites and produce scored results tables
- **Create**: Generate test cases from behavior descriptions
- **Compare**: Side-by-side comparison of two configurations (models, prompts, settings)

## Eval Definition Format

Evals are defined in YAML:

```yaml
name: "math-basics"
cases:
  - prompt: "What is 2+2?"
    expected: "4"
    method: "contains"
  - prompt: "Explain gravity in one sentence"
    expected: null
    method: "llm-judge"
    criteria: "Scientifically accurate? Under 30 words?"
```

## Scoring Methods

| Method | Use when | How it works |
|--------|----------|--------------|
| `exact` | One correct answer | Response must equal expected exactly |
| `contains` | Key phrase required | Response must contain expected string |
| `regex` | Pattern matching | Response must match regex pattern |
| `llm-judge` | Subjective quality | LLM scores response against criteria (1-5) |

## Scope

This skill handles evaluation authoring, execution, and comparison.

**NOT for:**
- Unit testing application code (use standard test frameworks)
- Load testing or performance benchmarking of infrastructure
- Monitoring production agent behavior in real-time
- Skill validation (use the skill-builder skill instead)

## Workflows

- [Run Eval](workflows/run-eval.md) - Execute an eval suite and score results
- [Create Eval](workflows/create-eval.md) - Generate a new eval suite
- [Compare](workflows/compare.md) - Side-by-side comparison of two configs
