# Workflow: Hypothesis Generation and Testing

## Metadata
- name: Hypothesis
- description: Generates falsifiable hypotheses from observations, ranks them, and tests systematically until a conclusion is reached.
- triggers: ["hypothesis", "why does", "root cause", "diagnose"]

## Purpose

Transforms vague suspicions into testable claims. Forces rigor by requiring predictions before tests and requiring multiple competing explanations.

## Inputs
- **question**: What are you trying to explain?
- **observations**: Known facts, data, symptoms
- **constraints**: Time budget, available tools, access limitations

## Steps

### Step 1: Clarify the Question
Restate the question as a specific, answerable form. Bad: "Why is it slow?" Good: "What causes p99 latency to exceed 500ms on the /search endpoint during peak hours?"

### Step 2: Catalog Observations
List every known fact. Separate confirmed facts from assumptions. Note what changed recently — changes are the most common root cause of new problems.

### Step 3: Generate Hypotheses
Produce at least 3 hypotheses. For each:
- **Statement**: A specific, falsifiable claim
- **Prediction**: "If this hypothesis is true, then [observable outcome]"
- **Counter-prediction**: "If this hypothesis is false, then [different outcome]"

A good hypothesis makes a prediction that would NOT be true under the other hypotheses.

### Step 4: Rank Hypotheses
Order by (likelihood x testability). Test the hypothesis that is both likely AND easy to test first. Don't start with the hardest test.

### Step 5: Test
Run the test for the top hypothesis. Record:
- Exact steps taken
- Raw results observed
- Whether the result matches the prediction

### Step 6: Update
- **Prediction matched**: Hypothesis supported. Seek one more confirming test if possible.
- **Prediction failed**: Hypothesis refuted. Move to the next hypothesis.
- **Ambiguous result**: Refine the test or the hypothesis. Do not count ambiguity as confirmation.

### Step 7: Conclude
State the conclusion with a confidence level (high/medium/low). List remaining unknowns. If all hypotheses were refuted, return to Step 2 and re-observe.

## Output Format

```
## Hypothesis Testing: [Question]

### Observations
- [Confirmed facts]
- [Assumptions marked as such]

### Hypotheses
| # | Hypothesis | Prediction | Test | Result | Verdict |
|---|-----------|------------|------|--------|---------|

### Conclusion
[Answer + confidence level + remaining unknowns]
```
