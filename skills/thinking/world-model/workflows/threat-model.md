# Workflow: Threat Model

## Metadata
- name: Threat Model
- description: Systematically identifies, assesses, and prioritizes threats to a system or decision, then defines mitigations for the highest-priority risks.
- triggers: ["threat model", "risk assessment", "what could go wrong"]

## Purpose

Prevents being blindsided by foreseeable problems. Forces explicit enumeration of risks instead of relying on intuition, which consistently underweights low-probability high-impact events.

## Inputs
- **subject**: The system, decision, or plan being threat-modeled
- **scope**: What is in-scope and out-of-scope for this analysis
- **assets**: What matters most (explicitly stated or discovered in Step 1)

## Steps

### Step 1: Identify Assets
List everything of value that could be affected. Be specific.

Categories to consider:
- Data (customer data, intellectual property, credentials)
- Availability (uptime, performance, capacity)
- Revenue (direct revenue, opportunity cost)
- Reputation (trust, brand, relationships)
- Operations (team productivity, deployment capability)

### Step 2: Enumerate Threats
For each asset, brainstorm what could threaten it. Target 8+ total threats.

Use these prompts to avoid blind spots:
- What has gone wrong before?
- What are we assuming won't fail?
- What would a malicious actor target?
- What would happen if a key dependency disappeared?
- What is the single point of failure?

### Step 3: Assess
For each threat, assign:
- **Likelihood** (1-5): 1=rare, 3=possible, 5=likely
- **Impact** (1-5): 1=minor inconvenience, 3=significant disruption, 5=catastrophic
- **Priority** = Likelihood x Impact (max 25)

### Step 4: Prioritize
Sort by priority descending. Draw a line at the top 5 (or at priority >= 12, whichever captures more). Everything above the line gets a mitigation plan.

### Step 5: Mitigate
For each top threat, define four layers:
- **Prevent**: Actions that reduce the likelihood
- **Detect**: How you will know it is happening or has happened
- **Respond**: Immediate actions when detected
- **Recover**: Steps to return to normal operations

### Step 6: Review
Check for completeness:
- Are there threats that interact (cascade)?
- Are any mitigations single points of failure themselves?
- What is the cost of the mitigations vs. the cost of the threats?

## Output Format

```
## Threat Model: [Subject]

### Assets
| Asset | Category | Value |
|-------|----------|-------|

### Threats
| # | Threat | Asset | Likelihood | Impact | Priority |
|---|--------|-------|-----------|--------|----------|

### Mitigations (Priority >= 12)
| Threat | Prevent | Detect | Respond | Recover |
|--------|---------|--------|---------|---------|

### Cascading Risks
[Threats that interact or amplify each other]
```
