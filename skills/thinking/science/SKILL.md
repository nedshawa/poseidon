# Scientific Thinking

## Metadata
- name: Scientific Thinking
- version: 1.0.0
- description: Applies the scientific method to problem-solving with hypothesis generation, experiment design, and evidence-based conclusions.
- triggers: ["hypothesis", "experiment", "diagnose", "investigate", "scientific", "root cause"]

## Purpose

Replaces guessing and intuition with structured investigation. Every claim becomes a testable hypothesis, every fix becomes an experiment with measurable outcomes.

## Non-Negotiable Principles

1. **Falsifiability** — Every hypothesis MUST be able to fail. "It might be a caching issue" is not a hypothesis. "Clearing the Redis cache will reduce p99 latency below 200ms" is.
2. **Pre-commitment** — Define success criteria BEFORE gathering evidence. Decide what "confirmed" and "refuted" look like before you test.
3. **Three-hypothesis minimum** — Never test just one idea. Generate at least 3 competing hypotheses to avoid confirmation bias.

## Modes

### Hypothesis Mode
For focused investigation with clear hypotheses.

1. Define the goal: What are you trying to explain or achieve?
2. Gather observations: What do you know? What data exists?
3. Generate 3+ hypotheses: Each must be falsifiable
4. Rank by likelihood and testability
5. Design a test for the most likely hypothesis
6. Predict the outcome BEFORE running the test
7. Run the test
8. Compare result to prediction
9. Update: confirm, refute, or refine the hypothesis
10. Repeat with next hypothesis if refuted

### Quick Diagnosis
For rapid troubleshooting when time is short.

1. **Observe**: What are the symptoms? When did they start? What changed?
2. **Hypothesize**: Generate 3 possible causes, ranked by likelihood
3. **Test**: Test the most likely cause first (cheapest/fastest test)
4. **Confirm or pivot**: If confirmed, fix it. If refuted, test hypothesis #2.
5. **Verify**: After fixing, confirm the symptoms are actually gone

Time budget: 5-15 minutes. If the top 3 hypotheses are all refuted, step back and re-observe.

### Full Scientific Cycle
For thorough investigation where rigor matters.

1. **Goal**: What question are you answering?
2. **Observe**: Collect all available data. Note patterns and anomalies.
3. **Hypothesize**: Generate 3-5 competing hypotheses. Each must be falsifiable.
4. **Experiment**: Design controlled experiments. Change one variable at a time.
5. **Measure**: Collect data with pre-defined metrics. Record everything.
6. **Analyze**: Compare results to predictions. Look for surprises.
7. **Conclude**: What did you learn? What remains uncertain?
8. **Iterate**: Refine hypotheses based on findings. Run next experiment.

## Experiment Design Rules

- **One variable at a time**: Change only one thing per experiment
- **Control group**: Know what "normal" looks like before testing
- **Reproducibility**: Can someone else run this experiment and get the same result?
- **Record everything**: Log the setup, the steps, the raw results, and the interpretation

## Output Format

```
## Investigation: [Topic]

### Goal
[What are we trying to explain or achieve?]

### Observations
[Known facts and data]

### Hypotheses
| # | Hypothesis | Prediction | Test | Result |
|---|-----------|------------|------|--------|
| 1 | ...       | If true... | ...  | ...    |

### Experiments Conducted
[Details of each experiment]

### Analysis
[What the results mean]

### Conclusion
[Answer to the goal question + confidence level + remaining unknowns]
```

## Example

Challenge: "Why does the deploy fail intermittently?"

Observations: Fails ~30% of the time, always on step 3 (asset compilation), started 2 weeks ago.

Hypotheses:
1. Memory pressure on the build server (prediction: fails correlate with high memory usage)
2. Race condition in parallel asset compilation (prediction: fails only with >4 parallel workers)
3. Flaky dependency download (prediction: fails correlate with network timeouts in logs)

Tests run, hypothesis #2 confirmed: reducing workers to 3 eliminated failures. Root cause: shared temp directory without locks.

## Workflows
- [hypothesis](workflows/hypothesis.md) — Hypothesis generation and testing
- [experiment](workflows/experiment.md) — Structured experiment design and execution
- [full-cycle](workflows/full-cycle.md) — Complete scientific method cycle
