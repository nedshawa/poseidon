# Standard Research (Tier 2)

Three parallel agents using distinct search providers. Default tier for "do research on X".

## Parameters

| Field   | Value                                                    |
|---------|----------------------------------------------------------|
| Agents  | 3 (parallel, named by provider)                          |
| Queries | 3-10 total                                               |
| Time    | 1-3 minutes                                              |
| Timeout | 60 seconds hard ceiling                                  |

## Agent Types and Providers

Each agent uses a specific search provider for its strengths:

| Agent | Type | Provider | Strength |
|-------|------|----------|----------|
| 🔵 Claude | ClaudeResearcher | Claude WebSearch | Academic depth, detailed analysis, scholarly |
| 🟣 Perplexity | PerplexityResearcher | Perplexity API | Cited answers, up-to-date, web-native |
| 🟢 Gemini | GeminiResearcher | Google Gemini | Multi-perspective, cross-domain synthesis |

**Fallback:** If Perplexity/Gemini APIs are not configured, all agents use ClaudeResearcher (WebSearch). Mandates still differ — different angles, same provider.

## Workflow

### Step 1: Announce Agents

Before launching, tell the user which providers are being used:

```
🔍 Launching Standard Research (Tier 2):
  🔵 Claude WebSearch — technical details and analysis
  🟣 Perplexity — comparisons and alternatives
  🟢 Gemini — recent developments and trends
  ⏱️ Timeout: 60 seconds
```

If providers unavailable:
```
🔍 Launching Standard Research (Tier 2):
  🔵 Agent 1 (WebSearch) — technical details
  🔵 Agent 2 (WebSearch) — comparisons
  🔵 Agent 3 (WebSearch) — trends
  ⏱️ Timeout: 60 seconds
  ℹ️ Perplexity/Gemini not configured — using WebSearch for all agents
```

### Step 2: Mandate Assignment

Split the research into three non-overlapping mandates:

| Agent | Mandate |
|-------|---------|
| 🔵 Claude | Technical details, specifications, architecture |
| 🟣 Perplexity | Comparisons, alternatives, competitive landscape |
| 🟢 Gemini | Recent developments, community sentiment, trends |

Adapt to fit the specific question. Goal: zero overlap, full coverage.

### Step 3: Parallel Execution

Launch all agents simultaneously. Each agent:
1. Gets ONE mandate with 1-4 queries
2. Executes searches using its provider
3. Returns findings with inline citations
4. Notes confidence per finding

### Step 4: Timeout Enforcement — 60 SECONDS

If any agent hasn't returned at 60 seconds:
- Proceed with agents that HAVE returned
- Note: "🟣 Perplexity: timed out" in results

### Step 5: Cross-Reference with Attribution

Merge findings. Attribute each finding to its source:

```
### Key Finding 1
[Finding text] — confirmed by 🔵 Claude + 🟣 Perplexity (HIGH confidence)

### Key Finding 2
[Finding text] — per 🟢 Gemini only (MEDIUM confidence, single source)

### Conflict
🔵 Claude says [X] while 🟣 Perplexity says [Y]. More recent source: [choice].
```

### Step 6: Quality Check + Citation Verification

Run quality scorer (6/10 minimum per axis). Verify all URLs.

## Output Format

```
## Research: [Topic]

**Tier:** 2 — Standard | **Timeout:** 60s
**Agents:** 🔵 Claude (WebSearch) • 🟣 Perplexity • 🟢 Gemini
**Status:** 3/3 returned in [elapsed]s

### Key Findings
[Findings organized by theme, each attributed to source agent]

### Per-Agent Insights
- 🔵 **Claude:** [unique analytical depth]
- 🟣 **Perplexity:** [unique cited findings]
- 🟢 **Gemini:** [unique cross-domain connections]

### Conflicts
[Disagreements with both positions and sources]

### Sources
1. [Name](url) — via 🔵 Claude
2. [Name](url) — via 🟣 Perplexity

### Confidence: [HIGH/MEDIUM/LOW]
```
