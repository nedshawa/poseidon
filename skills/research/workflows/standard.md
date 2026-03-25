# Standard Research (Tier 2)

Three parallel agents with distinct mandates. Default tier for "do research on X".

## Parameters

| Field   | Value                                      |
|---------|--------------------------------------------|
| Agents  | 3 (parallel)                               |
| Queries | 3-10 total                                 |
| Time    | 1-3 minutes                                |
| Tools   | WebSearch, Perplexity, Gemini (as available)|

## When to Use

- Multi-part questions: "Research X for me"
- Comparisons: "Compare A vs B vs C"
- Topic overviews requiring multiple perspectives
- Questions where a single source is insufficient

## Workflow

### Step 1: Mandate Assignment

Split the research question into three non-overlapping mandates:

| Agent | Mandate Example                                   |
|-------|---------------------------------------------------|
| A     | Technical details, specifications, architecture   |
| B     | Comparisons, alternatives, competitive landscape  |
| C     | Recent developments, community sentiment, trends  |

Adapt mandates to fit the specific question. The goal is zero overlap and full coverage.

### Step 2: Parallel Execution

Each agent independently:
1. Formulates 1-4 queries based on its mandate
2. Executes searches
3. Collects and summarizes findings with inline citations
4. Notes confidence level per finding

### Step 3: Cross-Reference

Merge agent outputs. For each claim:
- Corroborated by 2+ agents: mark as HIGH confidence
- Single source only: mark as MEDIUM confidence
- Agents disagree: present BOTH positions with sources, flag as CONFLICTED

### Step 4: Conflict Disclosure

When sources disagree, present the disagreement explicitly:
```
> **Conflicting information:** Source A claims [X] while Source B claims [Y].
> The more recent/authoritative source appears to be [choice] because [reason].
```

### Step 5: Quality Check

Run quality scorer. All four axes must meet 6/10 minimum.
If any axis fails, identify the gap and run a targeted follow-up search.

### Step 6: Citation Verification

Verify all URLs before delivery. Remove broken links.

## Output Format

```
## Research: [Topic]

**Tier:** 2 — Standard | **Sources:** [count] | **Agents:** 3

### Key Findings
[Synthesized findings organized by theme, not by agent]

### Comparisons (if applicable)
| Dimension | Option A | Option B |
|-----------|----------|----------|
| ...       | ...      | ...      |

### Conflicts
[Any disagreements between sources, with both positions cited]

### Sources
1. [Name](url) — [what it contributed]
2. ...

### Confidence: [HIGH/MEDIUM/LOW] — [reasoning]
```
