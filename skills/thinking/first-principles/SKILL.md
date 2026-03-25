---
name: first-principles
description: >-
  Decompose problems to fundamental truths, challenge inherited assumptions, and
  reconstruct optimal solutions from verified constraints. Three-step framework:
  Deconstruct, Challenge, Reconstruct.
  USE WHEN first principles, decompose, fundamental, root cause, challenge assumptions,
  rebuild from scratch, why do we do it this way.
---

## Instructions

Foundational reasoning that decomposes problems to irreducible truths rather than reasoning by analogy. Based on the physics-based thinking framework: strip away convention, find what is actually true, and build from there.

### The 3-Step Framework

```
STEP 1: DECONSTRUCT       "What is this actually made of?"
        |
        v
STEP 2: CHALLENGE          "Is this a real constraint or just habit?"
        |
        v
STEP 3: RECONSTRUCT        "Given only the truths, what should we build?"
```

### Workflow Routing

| Request | Route To |
|---|---|
| Break problem into parts, what is this made of | `workflows/deconstruct.md` |
| Challenge assumptions, is this really required | `workflows/challenge.md` |
| Rebuild from fundamentals, what would we build from scratch | `workflows/reconstruct.md` |
| Full first-principles analysis (default) | Run all three steps sequentially |

### Key Questions

**Deconstruct:**
- What is this actually made of?
- What are the constituent parts?
- What would a physicist say about this?

**Challenge:**
- Is this a hard constraint (physics/reality) or soft constraint (policy/choice)?
- What if we removed this entirely?
- Who decided this and why?

**Reconstruct:**
- Given only the hard constraints, what would we build from scratch?
- What field has solved an analogous problem differently?
- Are we optimizing function or form?

### Constraint Classification

When analyzing any system, classify every constraint:

| Type | Definition | Example | Can Change? |
|------|------------|---------|-------------|
| **Hard** | Physics/reality | "Data can't travel faster than light" | No |
| **Soft** | Policy/choice | "We always use REST APIs" | Yes |
| **Assumption** | Unvalidated belief | "Users won't accept that UX" | Maybe false |

Only hard constraints are truly immutable. Everything else is a design choice.

### Output Format

```markdown
## First Principles Analysis: [Topic]

### Deconstruction
- **Constituent Parts**: [List fundamental elements]
- **Actual Values**: [Real costs/metrics, not market prices]

### Constraint Classification
| Constraint | Type | Evidence | If Removed? |
|------------|------|----------|-------------|
| [X] | Hard/Soft/Assumption | [Why] | [What becomes possible] |

### Reconstruction
- **Hard Constraints Only**: [The immutable truths]
- **Optimal Solution**: [Built from fundamentals]
- **Key Insight**: [What assumption was limiting us?]
```

### Example 1: Architecture Decision

**Problem**: "We need microservices because that's how modern apps are built."

1. **Deconstruct**: What does this app need? Team of 3, moderate scale, single deployment target.
2. **Challenge**: "Microservices" is reasoning by analogy, not a hard constraint. Independent scaling is not needed at this scale.
3. **Reconstruct**: A modular monolith satisfies all hard constraints (reliability, maintainability, team velocity) with 10x less operational complexity.

**Key Insight**: "Modern architecture" was a soft constraint masquerading as a hard one.

### Example 2: Cost Optimization

**Problem**: "Cloud hosting costs $10,000/month -- that's just what it costs."

1. **Deconstruct**: Paying for compute ($1,200), storage ($800), bandwidth ($500), managed services ($7,500).
2. **Challenge**: Managed Kubernetes is a soft constraint. Multi-region is an assumption (actual traffic is single-region). Premium support tier is unused.
3. **Reconstruct**: Actual compute needs = $2,000/month. The other $8,000 is convenience we chose to pay for.

**Key Insight**: "What it costs" was actually "what we chose to spend."

### Principles

1. **Physics First** -- Real constraints come from reality, not convention
2. **Function Over Form** -- Optimize what you accomplish, not how it looks
3. **Question Everything** -- Every assumption is guilty until proven innocent
4. **Cross-Domain Synthesis** -- Unrelated fields often have applicable solutions
5. **Rebuild, Don't Patch** -- When assumptions are wrong, start fresh

### Anti-Patterns

- Reasoning by analogy: "Company X does it this way"
- Accepting market prices as fundamental costs
- Improving the suitcase instead of inventing wheels
- Treating policies as physics
- Optimizing before understanding fundamentals
