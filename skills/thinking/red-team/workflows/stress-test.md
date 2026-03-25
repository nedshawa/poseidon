# Stress Test Workflow

**Purpose**: Full adversarial analysis -- decompose into atomic claims, attack from multiple perspectives, produce steelman and counter-argument.

**When to Use**: Important decisions needing rigorous challenge, high-stakes proposals, suspected confirmation bias.

## Process

### Step 1: Extract the Core Argument

Identify: central thesis (one sentence), supporting claims (numbered), implicit assumptions (what must be true), logical chain (A leads to B leads to conclusion).

### Step 2: Decompose into Atomic Claims

Break the argument into 8-12 discrete, attackable claims. Each must be self-contained, specific, and challengeable.

### Step 3: Attack from Each Perspective

| Perspective | Key Question |
|---|---|
| Engineer | "Where does this break technically?" |
| Architect | "What are the second-order effects?" |
| Security Researcher | "How would I exploit this?" |
| Skeptical User | "Why would I not use this?" |
| Competitor | "How would I defeat this?" |
| Regulator | "What rules does this violate?" |

Not every perspective applies to every claim. Focus where each has genuine insight.

### Step 4: Classify Findings

| Severity | Criteria | Target |
|----------|----------|--------|
| Critical | Blocks success entirely | Up to 3 |
| Major | Degrades quality significantly | Up to 5 |
| Minor | Edge case or cosmetic | Note only |

### Step 5: Build the Steelman

Construct the strongest possible version of the argument. What are the best supporting points? What legitimate problem is being addressed? Present as 3-5 numbered points.

### Step 6: Build the Counter-Argument

Construct the strongest rebuttal addressing the steelman, not a weaker version. Lead with the most fundamental flaw, escalate in impact, end with the strongest objection. Present as 5-8 numbered points.

### Step 7: Deliver Recommendations

For each critical and major flaw: what needs to change, what to investigate further, what to monitor if proceeding.

## Output Template

```markdown
## Stress Test: [Subject]

### Central Thesis
[One sentence]

### Steelman
1. [Strongest point for]  2. [Second strongest]  3. [Third strongest]

### Critical Weaknesses
- **[Flaw]**: [Explanation] | Found by: [perspective]

### Major Weaknesses
- **[Flaw]**: [Explanation] | Found by: [perspective]

### Counter-Argument
1. [Most fundamental flaw]
2. [Develops core weakness]
3. [Historical precedent]
4. [Hidden assumption exposed]
5. [Knockout conclusion]

### Verdict
[Sound, flawed but fixable, or fatally broken?]

### Recommendations
1. [Address critical flaw]  2. [Investigate X]  3. [Monitor Y]
```
