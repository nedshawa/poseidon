# Extensive Research (Tier 3)

Large-scale parallel research with quality enforcement and re-research cycles.

## Parameters

| Field   | Value                                      |
|---------|--------------------------------------------|
| Agents  | 4-10 (parallel, non-overlapping mandates)  |
| Queries | 10-50 total                                |
| Time    | 5-20 minutes                               |
| Tools   | WebSearch, Perplexity, Gemini (as available)|

## When to Use

- "Extensive research on X"
- "Deep dive into X" (without entity-mapping needs)
- "Comprehensive analysis of X"
- Questions spanning technical, business, and ecosystem dimensions

## Workflow

### Step 1: Decomposition

Break the research topic into 4-10 distinct facets. Each facet becomes one agent mandate.

Example for "extensive research on WebAssembly in production":
| Agent | Mandate                                    |
|-------|--------------------------------------------|
| 1     | Core technology: spec status, capabilities |
| 2     | Runtime landscape: Wasmtime, Wasmer, V8    |
| 3     | Production case studies and benchmarks     |
| 4     | Developer tooling and language support     |
| 5     | Security model and sandboxing              |
| 6     | Edge/serverless deployment patterns        |
| 7     | Ecosystem maturity and adoption metrics    |

Mandates MUST NOT overlap. Each agent owns its facet exclusively.

### Step 2: Parallel Execution

Each agent independently:
1. Generates 3-7 targeted queries for its facet
2. Executes searches across available providers
3. Synthesizes findings into a structured sub-report
4. Includes inline citations for every factual claim
5. Self-scores confidence per finding

### Step 3: Merge and Cross-Reference

Combine all sub-reports into a unified document:
- Group findings by theme (not by agent)
- Flag corroborated findings (2+ agents confirm)
- Flag conflicts with both positions and sources
- Identify gaps: facets with thin or low-confidence coverage

### Step 4: Quality Gate

Run the quality scorer on the merged output:

| Axis                  | Minimum | Action if Below                    |
|-----------------------|---------|------------------------------------|
| Explicit Completeness | 6/10    | Re-research missing facets         |
| Synthesis Quality     | 6/10    | Rewrite synthesis with more cross-refs |
| Citation Integrity    | 6/10    | Verify and replace broken citations |
| Clarity               | 6/10    | Restructure output                 |

If any axis fails, run a targeted re-research cycle (max 2 cycles).

### Step 5: Citation Verification

Verify every URL. Remove broken links. Note unavailable sources.

## Output Format

```
## Extensive Research: [Topic]

**Tier:** 3 — Extensive | **Sources:** [count] | **Agents:** [count]
**Quality:** C:[score] S:[score] I:[score] R:[score]

### Executive Summary
[3-5 sentence overview of key findings]

### [Theme 1]
[Findings with inline citations]

### [Theme 2]
[Findings with inline citations]

...

### Gaps and Limitations
[What could not be determined, areas needing primary research]

### Conflicts
[Disagreements between sources with both positions]

### Sources
1. [Name](url) — [contribution]
...

### Confidence: [HIGH/MEDIUM/LOW] — [reasoning]
```
