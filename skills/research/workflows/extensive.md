# Extensive Research (Tier 3)

Large-scale parallel research across multiple providers with quality enforcement.

## Parameters

| Field   | Value                                                    |
|---------|----------------------------------------------------------|
| Agents  | 4-10 (parallel, named by provider)                       |
| Queries | 10-50 total                                              |
| Time    | 5-20 minutes                                             |
| Timeout | 3 minutes hard ceiling                                   |

## Agent Types and Providers

Extensive mode uses ALL available providers, 2-3 threads each:

| Provider | Threads | Strength |
|----------|---------|----------|
| 🔵 Claude (WebSearch) | 3 | Academic depth, technical detail, scholarly sources |
| 🟣 Perplexity | 3 | Cited web answers, real-time data, aggregated sources |
| 🟢 Gemini | 3 | Multi-perspective synthesis, Google Knowledge Graph |
| 🟠 Grok | 2-3 | Contrarian analysis, unfiltered perspectives, social data |

**Total: up to 12 agents.** Scale down based on available APIs.

**Fallback:** Only WebSearch available → 4-6 agents, all ClaudeResearcher, different mandates.

## Workflow

### Step 0: Generate Research Angles

Think deeply to generate 3 unique angles per provider (9-12 total queries).
Each angle must be independently searchable and non-overlapping.

### Step 1: Announce Agents

```
🔍 Launching Extensive Research (Tier 3):
  🔵 Claude WebSearch × 3 — angles 1-3 (academic, technical, historical)
  🟣 Perplexity × 3 — angles 4-6 (market, comparison, current state)
  🟢 Gemini × 3 — angles 7-9 (ecosystem, cross-domain, emerging)
  🟠 Grok × 2 — angles 10-11 (contrarian, social sentiment)
  ⏱️ Timeout: 3 minutes | Total agents: 11
```

### Step 2: Parallel Execution

Launch ALL agents simultaneously. Each gets ONE angle, does 1-3 searches, returns findings.

### Step 3: Timeout — 3 MINUTES NON-NEGOTIABLE

At 3 minutes, proceed with whatever has returned.
Note timed-out agents: "🟠 Grok agent 2: timed out"

### Step 4: Comprehensive Synthesis with Attribution

```
## Key Findings by Theme

### Theme 1: [Topic]
[Finding] — confirmed by 🔵 Claude + 🟣 Perplexity + 🟢 Gemini (HIGH)
[Finding] — per 🟠 Grok (contrarian view, MEDIUM)

### Unique Insights by Provider
- 🔵 **Claude:** [analytical depth not found elsewhere]
- 🟣 **Perplexity:** [cited real-time data]
- 🟢 **Gemini:** [cross-domain connection]
- 🟠 **Grok:** [contrarian perspective]
```

### Step 5: Quality Gate

Run quality scorer. 6/10 minimum on completeness, synthesis, citation.
Max 2 re-research cycles for gaps.

### Step 6: Citation Verification

Verify EVERY URL. Remove broken links.

## Output Format

```
## Extensive Research: [Topic]

**Tier:** 3 | **Timeout:** 3min
**Agents:** 🔵 Claude×3 • 🟣 Perplexity×3 • 🟢 Gemini×3 • 🟠 Grok×2
**Status:** [N]/11 returned in [elapsed]s | Timed out: [list or "none"]
**Quality:** C:[score] S:[score] I:[score] R:[score]

### Executive Summary
[3-5 sentences]

### Findings by Theme
[Each finding attributed to source providers]

### Unique Insights by Provider
[What each provider uniquely contributed]

### Conflicts and Uncertainties
[Disagreements with both positions]

### Sources
1. [Name](url) — via 🔵 Claude
2. [Name](url) — via 🟣 Perplexity

### Confidence: [HIGH/MEDIUM/LOW]
```
