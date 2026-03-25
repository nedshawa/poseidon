# Quick Research (Tier 1)

Single-agent fast lookup. Uses the best available provider.

## Parameters

| Field   | Value                                      |
|---------|--------------------------------------------|
| Agent   | 1 (single provider)                        |
| Queries | 1-3                                        |
| Time    | <30 seconds                                |
| Timeout | 30 seconds hard ceiling                    |

## Provider Selection

Use the FIRST available provider (ordered by speed for quick lookups):

| Priority | Provider | Type | Speed |
|----------|----------|------|-------|
| 1st | 🟣 Perplexity | PerplexityResearcher | ~5-10s (pre-synthesized answers) |
| 2nd | 🔵 Claude WebSearch | ClaudeResearcher | ~10-15s (raw search + synthesis) |
| 3rd | 🟢 Gemini | GeminiResearcher | ~10-15s |

**Default:** If no API keys configured, use 🔵 Claude WebSearch (always available).

## Workflow

### Step 1: Announce Provider

```
🔍 Quick Research (Tier 1):
  🟣 Perplexity — 1 query, <30s
```
or if Perplexity unavailable:
```
🔍 Quick Research (Tier 1):
  🔵 Claude WebSearch — 1-3 queries, <30s
```

### Step 2: Execute

Convert prompt into 1-3 search queries. Stop as soon as confident answer found.

### Step 3: Verify + Return

Verify citations. Return direct answer:

```
## [Topic]

[Direct answer in 1-5 sentences]

**Source:** [Name](url) — via 🟣 Perplexity
**Confidence:** HIGH | MEDIUM | LOW
**Time:** [elapsed]s
```

## Examples

**Prompt:** "What's the latest stable PostgreSQL version?"
```
🔍 Quick Research: 🟣 Perplexity — 1 query

PostgreSQL 17.4 is the latest stable release (released 2026-02-20).

**Source:** [postgresql.org](https://www.postgresql.org) — via 🟣 Perplexity
**Confidence:** HIGH | **Time:** 4s
```
