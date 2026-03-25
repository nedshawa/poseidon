# World Model Thinking

## Metadata
- name: World Model
- version: 1.0.0
- description: Models future states, threats, and cascading effects to support strategic decision-making under uncertainty.
- triggers: ["threat model", "risk", "futures", "scenario", "what if", "investment", "impact"]

## Purpose

Builds mental models of how systems, markets, and decisions evolve over time. Identifies threats before they materialize, maps cascading effects of decisions, and finds strategies that are robust across multiple possible futures.

## Modes

### Threat Model
Systematic identification and prioritization of risks.

1. **Identify assets**: What are you protecting? (data, uptime, revenue, reputation)
2. **Enumerate threats**: What could go wrong? Brainstorm at least 8 threats.
3. **Assess each threat**:
   - Likelihood (1-5): How probable is this?
   - Impact (1-5): How bad would it be?
   - Priority = Likelihood x Impact
4. **Categorize**: Group threats by type (technical, operational, external, human)
5. **Mitigate**: For the top 5 threats by priority, define:
   - Prevention: How to reduce likelihood
   - Detection: How to know it's happening
   - Response: What to do when it happens
   - Recovery: How to get back to normal

### Futures Analysis
Multi-horizon scenario planning for strategic decisions.

1. **Define time horizons**: Near-term (3 months), medium (1 year), long-term (3 years)
2. **Identify drivers of change**: What forces will shape the future? (technology, market, regulation, competition, internal capability)
3. **Generate 3 scenarios**:
   - **Optimistic**: Key drivers break favorably. What does success look like?
   - **Baseline**: Current trends continue. What is the default path?
   - **Pessimistic**: Key drivers break unfavorably. What does failure look like?
4. **Assign rough probabilities**: Must sum to ~100%
5. **Identify robust actions**: What moves are good across ALL three scenarios?
6. **Identify contingent actions**: What moves are only good in one scenario? What triggers them?

### Investment Test
Map cascading effects of a decision or investment.

1. **Define the investment**: What are you putting in? (time, money, resources, attention)
2. **First-order effects**: What directly happens as a result?
3. **Second-order effects**: What do the first-order effects cause?
4. **Third-order effects**: What do the second-order effects cause?
5. **Feedback loops**: Do any effects amplify or dampen themselves?
6. **Reversibility**: If this is wrong, how hard is it to undo?
7. **Verdict**: Is the expected value positive considering all orders of effects?

Most decisions look good at first order. Second and third order is where surprises live.

## Output Format

### Threat Model Output
```
## Threat Model: [System/Decision]

### Assets
[What is being protected]

### Risk Matrix
| # | Threat | Likelihood | Impact | Priority | Category |
|---|--------|-----------|--------|----------|----------|

### Top 5 Mitigations
| Threat | Prevent | Detect | Respond | Recover |
|--------|---------|--------|---------|---------|
```

### Futures Analysis Output
```
## Futures Analysis: [Decision/Topic]

### Drivers of Change
[Key forces shaping the future]

### Scenarios
| Scenario | Probability | 3mo | 1yr | 3yr | Key Actions |
|----------|------------|-----|-----|-----|-------------|

### Robust Actions (good in all scenarios)
[Actions to take regardless]

### Contingent Actions (scenario-dependent)
[Actions with triggers]
```

## Example

Challenge: "What are the risks of migrating to microservices?"

Threat model produces 8 risks: distributed system complexity (priority 20), data consistency (16), operational overhead (16), team skill gaps (12), network latency (12), deployment complexity (9), monitoring gaps (9), vendor lock-in (6). Top mitigations defined for each.

## Workflows
- [threat-model](workflows/threat-model.md) — Structured threat identification and prioritization
- [futures-analysis](workflows/futures-analysis.md) — Multi-horizon scenario planning
