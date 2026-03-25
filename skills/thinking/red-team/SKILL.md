---
name: red-team
description: >-
  Adversarial analysis that finds failure modes, fatal flaws, and hidden risks.
  Breaks arguments into atomic claims, attacks from multiple expert perspectives,
  and produces steelman plus counter-argument.
  USE WHEN red team, critique, stress test, attack idea, devil's advocate, find
  weaknesses, poke holes, break this, what could go wrong.
---

## Instructions

Adversarial analysis that stress-tests ideas by attacking them from multiple perspectives. The goal is not to be contrarian -- it is to find the fundamental flaw that, if unchallenged, causes the entire structure to collapse.

### Objective

For any argument, proposal, or plan, find:
- The **5 most likely failure modes**
- The **3 worst-case risks**
- The **2 biggest cost/effort traps**

### Workflow Routing

| Request | Route To |
|---|---|
| Full stress test, red team analysis, find all weaknesses | `workflows/stress-test.md` |
| Quick critique (just the top flaws) | Execute inline -- top 3 flaws only |

### Method

1. **Decompose**: Break argument into atomic claims
2. **Attack**: Challenge each claim from multiple perspectives
3. **Synthesize**: Identify convergent weaknesses
4. **Steelman**: Present the strongest version of the argument first
5. **Counter-Argue**: Deliver the strongest rebuttal

### Attack Perspectives

Each claim is examined from these angles:

| Perspective | Focus | Key Question |
|---|---|---|
| **Engineer** | Technical feasibility, scaling | "Where does this break at scale?" |
| **Architect** | Structural integrity, trade-offs | "What are the second-order effects?" |
| **Security Researcher** | Adversarial exploitation | "How would I exploit this?" |
| **Skeptical User** | Adoption, real-world use | "Why would I actually use this?" |
| **Competitor** | Market dynamics, moat | "How would I defeat this?" |
| **Regulator** | Compliance, legal exposure | "What rules does this violate?" |

### Severity Classification

| Severity | Definition | Action |
|----------|------------|--------|
| **Critical** | Blocks success entirely | Must fix before proceeding |
| **Major** | Degrades quality significantly | Should fix, can workaround short-term |
| **Minor** | Cosmetic or edge-case | Fix when convenient |

### Output Format

```markdown
## Red Team Analysis: [Subject]

### Steelman (Best Version of the Argument)
1. [Strongest supporting point]
2. [Second strongest point]
3. [Third strongest point]

### Weaknesses Found

**Critical:**
- [Flaw]: [Why it blocks success] | Perspective: [who found it]

**Major:**
- [Flaw]: [Why it degrades quality] | Perspective: [who found it]

**Minor:**
- [Flaw]: [Edge case or cosmetic issue]

### Fatal Flaws
If any single issue could collapse the entire argument:
- **[The fatal flaw]**: [Why this is unsurvivable]

### Recommendations
1. [How to address the most critical weakness]
2. [How to mitigate the major risks]
3. [What to monitor for]
```

### Example 1: Architecture Proposal

**Argument**: "We should migrate our monolith to microservices over the next quarter."

**Steelman**: Independent deployment enables faster iteration. Team boundaries align with service boundaries. Failure isolation prevents cascading outages.

**Critical Flaws**:
- "One quarter" timeline assumes no data migration complexity -- distributed data is the hardest part and is not addressed
- Team of 6 engineers cannot operate 12+ services -- operational burden exceeds capacity
- No mention of observability investment -- debugging distributed systems without tracing is flying blind

**Fatal Flaw**: The proposal solves a scaling problem the team does not have while creating an operational complexity problem they cannot handle.

### Example 2: Business Decision

**Argument**: "We should raise prices 20% to improve margins."

**Steelman**: Current pricing undervalues the product. Competitors charge more. Existing customers depend on us (high switching cost).

**Critical Flaws**:
- Assumes price elasticity is zero -- no analysis of churn risk at 20% increase
- Ignores that 3 competitors launched cheaper alternatives last quarter
- "High switching cost" is an assumption, not validated -- survey your customers

**Fatal Flaw**: The argument assumes customers have no alternatives, but the competitive landscape changed 90 days ago.

### Integration

- **Chain with first-principles**: Decompose first, then red-team the decomposition
- **Chain with creative**: Red-team finds flaws, creative brainstorms fixes
- **Chain with council**: Council debates options, red-team attacks the winner
