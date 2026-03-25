# Extensive Research (Tier 3)

Large-scale parallel research with quality enforcement and re-research cycles.

## Parameters

| Field   | Value                                      |
|---------|--------------------------------------------|
| Agents  | 4-10 (parallel, non-overlapping mandates)  |
| Queries | 10-50 total                                |
| Time    | 5-20 minutes                               |

## When to Use

- "Extensive research on X", "deep dive into X", "comprehensive analysis of X"
- Questions spanning technical, business, and ecosystem dimensions

## Step 1: Decomposition

Break topic into 4-10 distinct facets. Each facet becomes one agent mandate.
Example for "WebAssembly in production": core spec, runtimes, case studies,
tooling, security model, edge deployment, ecosystem maturity.
Mandates MUST NOT overlap.

## Step 2: Parallel Execution

Each agent: generates 3-7 queries, executes searches, synthesizes a sub-report
with inline citations, and self-scores confidence per finding.

## Step 3: Merge and Cross-Reference

Combine sub-reports by theme (not by agent). Flag corroborated findings,
conflicts (present both positions), and gaps (thin coverage areas).

## Step 4: Quality Gate

Run quality scorer. Minimum 6/10 on completeness, synthesis, citation integrity.

| If Below Threshold       | Action                              |
|--------------------------|-------------------------------------|
| Explicit Completeness    | Re-research missing facets          |
| Synthesis Quality        | Rewrite with more cross-references  |
| Citation Integrity       | Verify and replace broken citations |

Max 2 re-research cycles.

## Step 5: Citation Verification

Verify every URL. Remove broken links. Note unavailable sources.

## Output Format

```
## Extensive Research: [Topic]
**Tier:** 3 | **Sources:** [count] | **Agents:** [count]
**Quality:** C:[score] S:[score] I:[score] R:[score]

### Executive Summary
[3-5 sentences]

### [Theme 1]
[Findings with inline citations]

### Gaps and Limitations
### Conflicts
### Sources
### Confidence: [HIGH/MEDIUM/LOW] — [reasoning]
```
