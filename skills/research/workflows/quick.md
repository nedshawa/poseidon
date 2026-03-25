# Quick Research (Tier 1)

Single-agent, fast-turnaround research for simple factual lookups.

## Parameters

| Field   | Value                                      |
|---------|--------------------------------------------|
| Agents  | 1                                          |
| Queries | 1-3                                        |
| Time    | <30 seconds                                |
| Tools   | WebSearch (or Perplexity if available)      |

## When to Use

- Simple factual questions: "What is X?", "When did Y happen?"
- Single-entity lookups: "Who founded Z?"
- Current status checks: "Is service X down?"
- Version/release lookups: "Latest version of X?"

## Workflow

### Step 1: Query Formulation

Convert the user prompt into 1-3 search queries. Prefer specific, targeted queries
over broad ones. Include year or "2026" for time-sensitive topics.

### Step 2: Execute Search

Run queries sequentially (single agent). Stop as soon as a confident answer is found.
If the first query returns a clear answer from an authoritative source, skip remaining queries.

### Step 3: Synthesize

Write a direct answer. No hedging if the source is authoritative.
Cite sources inline using `[Source Name](url)` format.

### Step 4: Verify Citations

Run citation verification on all URLs in the response.
Replace any broken URLs with "[source unavailable]".

## Output Format

```
## [Topic]

[Direct answer in 1-5 sentences]

**Source:** [Name](url) — accessed [date]
**Confidence:** HIGH | MEDIUM | LOW
```

## Examples

**Prompt:** "What's the latest stable version of PostgreSQL?"
**Queries:** `["PostgreSQL latest stable version 2026"]`
**Output:** Direct answer with official postgresql.org citation.

**Prompt:** "When was Docker first released?"
**Queries:** `["Docker initial release date"]`
**Output:** Date with Wikipedia or Docker docs citation.
