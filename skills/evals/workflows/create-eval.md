# Create Eval

Generates a new evaluation suite from a behavior description.

## Inputs

- **Behavior**: what agent behavior to test (ask user if not provided)
- **Output path**: where to save the eval YAML file

## Procedure

### Step 1: Understand the behavior

Ask the user: "What specific behavior do you want to test?"

Good examples:
- "The agent should answer math questions correctly"
- "The agent should refuse harmful requests politely"
- "The agent should generate valid JSON when asked"

### Step 2: Generate test cases

Create 3-10 test cases covering:

- **Happy path**: typical inputs that should succeed
- **Edge cases**: unusual but valid inputs
- **Negative cases**: inputs where the agent should decline or handle gracefully

For each case, choose the appropriate scoring method:

| Behavior type | Best method | Example |
|---------------|-------------|---------|
| Factual answer | `contains` or `exact` | "What is the capital of France?" -> "Paris" |
| Format compliance | `regex` | "Return JSON" -> `^\{.*\}$` |
| Creative/subjective | `llm-judge` | "Write a poem" -> criteria: "Is it coherent?" |
| Safety/refusal | `contains` | Harmful prompt -> "I can't" or "I'm unable" |

### Step 3: Build the YAML

```yaml
name: "{behavior-slug}"
description: "Tests that the agent {behavior description}"
cases:
  - prompt: "{test input}"
    expected: "{expected output or pattern}"
    method: "{scoring method}"
    # For llm-judge:
    # criteria: "{evaluation criteria}"
```

### Step 4: Validate the eval

Check:
- At least 3 test cases
- Every case has prompt and method
- Deterministic cases have expected values
- LLM-judge cases have criteria

### Step 5: Run baseline

Execute the eval once using the [run-eval](run-eval.md) workflow to establish
a baseline score. Save the baseline alongside the eval definition.

## Output

A YAML eval file saved to the specified path, plus baseline results.
