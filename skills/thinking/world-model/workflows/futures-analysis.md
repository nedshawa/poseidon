# Workflow: Futures Analysis

## Metadata
- name: Futures Analysis
- description: Generates multi-horizon scenarios to identify strategies that are robust under uncertainty and decisions that depend on which future materializes.
- triggers: ["futures", "scenarios", "long-term", "planning", "strategy"]

## Purpose

Forces consideration of multiple futures to find actions that work regardless of which scenario materializes.

## Inputs
- **decision**: The strategic question or decision being analyzed
- **time_horizons**: Default is 3 months, 1 year, 3 years (can be customized)
- **context**: Current state, known trends, relevant constraints

## Steps

### Step 1: Identify Drivers of Change
List 5-8 forces that will shape the future relevant to this decision.

Categories to consider:
- Technology evolution (new tools, platform shifts)
- Market dynamics (competition, demand, pricing)
- Regulatory environment (new rules, enforcement changes)
- Internal capability (team growth, skill development, technical debt)
- External dependencies (vendors, partners, ecosystems)

For each driver, note: direction of trend, certainty level, and speed of change.

### Step 2: Generate Three Scenarios
Build three coherent narratives:
- **Optimistic** (15-25%): Key bets pay off. Not perfection, but favorable breaks.
- **Baseline** (40-60%): Current trends continue unchanged.
- **Pessimistic** (15-25%): Key drivers break unfavorably.

For each, describe the state at each time horizon.

### Step 3: Map Implications
For each scenario at each time horizon:
- What does the decision look like in this world?
- What is the biggest opportunity?
- What is the biggest risk?

### Step 4: Identify Robust Actions
Find actions that produce positive outcomes in ALL three scenarios. These are your highest-confidence moves. Prioritize them.

### Step 5: Identify Contingent Actions
Find actions that are great in one scenario but bad in another. For each:
- Which scenario favors this action?
- What observable signal tells you that scenario is materializing?
- What is the last responsible moment to decide?

### Step 6: Create Decision Triggers
Define specific, observable events that would trigger switching from baseline planning to optimistic or pessimistic response plans.

## Output Format

```
## Futures Analysis: [Decision]

### Drivers of Change
| Driver | Direction | Certainty | Speed |
|--------|-----------|-----------|-------|

### Scenarios
| Scenario | Probability | 3 Months | 1 Year | 3 Years |
|----------|------------|----------|--------|---------|

### Robust Actions (do regardless)
[Actions that work in all scenarios]

### Contingent Actions
| Action | Best Scenario | Signal to Act | Decision Deadline |
|--------|--------------|---------------|-------------------|

### Decision Triggers
[Observable events that shift from baseline to alternative plans]
```
