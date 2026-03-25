# Workflow: Full Scientific Cycle

## Metadata
- name: Full Scientific Cycle
- description: Executes the complete scientific method from observation through multiple hypothesis-experiment iterations to a validated conclusion.
- triggers: ["full investigation", "thorough analysis", "scientific method"]

## Inputs
- **goal**: The question to answer or problem to solve
- **context**: Background information, prior work, known constraints
- **rigor_level**: Standard (1-2 iterations) or High (3+ iterations)

## Steps

### Phase 1: Observe
Collect all available data before forming hypotheses. Gather logs, metrics, reports, code history. Note patterns, anomalies, and timing. Create a timeline. Do NOT hypothesize yet.

### Phase 2: Hypothesize
Generate 3-5 competing hypotheses. For each: write a falsifiable statement, list which observations it explains and which it does not, write a testable prediction. Rank by explanatory power and testability.

### Phase 3: Experiment
Design and run experiments for the top 2 hypotheses. For each: identify variables, establish baseline, pre-commit to success/failure criteria, execute, record raw results. Follow the [experiment workflow](workflows/experiment.md).

### Phase 4: Analyze
Compare results to predictions. Which hypotheses survived? Any unexpected results suggesting new hypotheses? Assess confidence based on sample size, reproducibility, and confounds.

### Phase 5: Iterate or Conclude
If confidence is high, conclude. Otherwise: refine surviving hypotheses, generate new ones if all refuted, design new experiments, return to Phase 3. Cap: 3 rounds (standard) or 5 (high rigor).

### Phase 6: Conclude
State: the answer, the evidence, the confidence level, what remains unknown, and what would change the conclusion.

## Output Format

```
## Full Investigation: [Goal]

### Observation Summary
[Key data points and patterns]

### Hypotheses
| # | Hypothesis | Explains | Doesn't Explain | Prediction |
|---|-----------|----------|-----------------|------------|

### Experiment Log
#### Round 1
[Experiments run, results, analysis]

### Conclusion
- **Answer**: [Clear statement]
- **Evidence**: [Key supporting data]
- **Confidence**: [High/Medium/Low]
- **Unknowns**: [What remains uncertain]
- **Invalidation**: [What would change this conclusion]
```
