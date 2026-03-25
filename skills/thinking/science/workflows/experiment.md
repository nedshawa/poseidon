# Workflow: Experiment Design and Execution

## Metadata
- name: Experiment
- description: Designs controlled experiments with clear variables, predictions, and measurement criteria to produce reliable evidence.
- triggers: ["experiment", "test this", "measure", "validate"]

## Inputs
- **hypothesis**: The specific claim being tested
- **prediction**: What outcome would confirm/refute the hypothesis
- **resources**: Available tools, environments, time budget

## Steps

### Step 1: Define Variables
- **Independent variable**: The one thing you are changing
- **Dependent variable**: The thing you are measuring
- **Controlled variables**: Everything else that must stay constant

If you cannot isolate a single variable, split into multiple experiments.

### Step 2: Establish Baseline
Measure the dependent variable under unchanged conditions. Record the value, conditions, and sample count (minimum 3). Without a baseline, results are meaningless.

### Step 3: Define Success Criteria
BEFORE running the experiment, write down what confirms, refutes, or is ambiguous. This pre-commitment prevents moving the goalposts.

### Step 4: Execute
Run the experiment as designed. Change only the independent variable. Record exact steps, timestamps, and raw results (not interpretations).

### Step 5: Analyze and Document
Compare to baseline and success criteria. Note if the difference is meaningful or noise. Record setup, execution, raw data, analysis, and conclusion.

## Output Format

```
## Experiment: [Name]

### Hypothesis
[What we're testing]

### Variables
- Independent: [What we're changing]
- Dependent: [What we're measuring]
- Controlled: [What stays constant]

### Baseline
[Control measurement]

### Success Criteria
- Confirmed if: [specific outcome]
- Refuted if: [specific outcome]

### Results
[Raw data and observations]

### Verdict
[Confirmed / Refuted / Ambiguous — next action]
```
