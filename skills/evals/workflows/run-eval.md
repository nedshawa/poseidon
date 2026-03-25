# Run Eval

Executes an evaluation suite and produces a scored results table.

## Inputs

- **Eval file**: path to YAML eval definition
- **Target**: the agent, model, or prompt configuration to evaluate

## Procedure

### Step 1: Load eval definition

Read the YAML file. Validate it has `name` and `cases` fields.
Each case needs: `prompt`, `method`, and either `expected` or `criteria`.

### Step 2: Execute test cases

For each case in the suite:

1. Send the `prompt` to the target
2. Capture the full response
3. Score using the specified method:

**Deterministic methods:**
- `exact`: compare response == expected (score: 1 or 0)
- `contains`: check if expected is a substring of response (score: 1 or 0)
- `regex`: test response against regex pattern in expected (score: 1 or 0)

**Subjective method:**
- `llm-judge`: ask an LLM to evaluate the response against `criteria`
  - Prompt: "Rate this response 1-5 against these criteria: {criteria}\n\nResponse: {response}"
  - Parse the numeric score (normalize to 0-1 scale: score/5)

### Step 3: Compile results

Build a results table:

```
Eval: {name}
────────────────────────────────────────────────────
 #  | Prompt (truncated)     | Method    | Score | Result
 1  | What is 2+2?           | contains  | 1.0   | PASS
 2  | Explain gravity...     | llm-judge | 0.8   | PASS
 3  | Capital of France?     | exact     | 0.0   | FAIL
────────────────────────────────────────────────────
Summary: 2/3 passed | Avg score: 0.60 | Min: 0.0 | Max: 1.0
```

Pass threshold: deterministic methods require 1.0; llm-judge requires >= 0.6.

### Step 4: Save results

Write results to `{eval-name}-results-{timestamp}.md` in the same directory
as the eval file for historical tracking.

## Output

Results table with per-case scores and summary statistics.
