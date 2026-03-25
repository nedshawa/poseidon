# Research Methodology

Reference document for conducting effective AI-assisted research across multiple sources.

## Core Principle

**Match research depth to question complexity. Match research source to question type.**

## The Research Spectrum

```
Quick (10s)     Standard (30s)    Extensive (90s)    Deep (3-60min)
    │                │                  │                  │
 1 agent         3 agents          12 agents         Iterative
 1 query         3-6 queries       12-24 queries     Progressive
 1 source        3 sources         4 source types    All sources
 Facts           Analysis          Landscape         Knowledge vault
```

## Source Selection Guide

### Source Profiles

#### Perplexity
- **Strength:** Real-time web search, current events, factual lookups
- **Weakness:** Less depth on technical/scholarly topics
- **Speed:** ~10s
- **Cost:** API key required
- **Use when:** "What happened?", "What's the latest?", "How much does X cost?"
- **PAI agent:** PerplexityResearcher

#### Claude WebSearch
- **Strength:** Scholarly synthesis, analytical depth, free
- **Weakness:** May not have latest real-time info
- **Speed:** ~15s
- **Cost:** Free (included with Claude)
- **Use when:** "How does X work?", "Compare X and Y", academic topics
- **PAI agent:** ClaudeResearcher

#### Gemini
- **Strength:** Google ecosystem, technical docs, multimodal
- **Weakness:** May over-index on Google products
- **Speed:** ~15s
- **Cost:** API key required
- **Use when:** Google/GCP topics, technical documentation, video/image analysis
- **PAI agent:** GeminiResearcher

#### Brave WebSearch
- **Strength:** Privacy-focused, alternative results, fast
- **Weakness:** Lower depth than dedicated research agents
- **Speed:** ~5s
- **Cost:** Free
- **Use when:** Quick web lookups, privacy-sensitive topics, alternative viewpoints
- **PAI tool:** WebSearch

#### Fabric Patterns
- **Strength:** 242+ specialized extraction patterns, deterministic
- **Weakness:** Pattern must exist for the task
- **Speed:** ~5s
- **Cost:** Local (free)
- **Use when:** Structured extraction (summarize, extract wisdom, threat model, etc.)
- **PAI tool:** Fabric CLI

### Decision Matrix

| Question Type | Primary | Secondary | Mode |
|--------------|---------|-----------|------|
| Current events | Perplexity | Brave | Quick |
| Technical how-to | Claude | Gemini | Quick-Standard |
| Product comparison | Perplexity | Claude | Standard |
| Architecture decision | Claude | Gemini | Standard |
| Academic/scholarly | Claude | — | Quick-Standard |
| Google ecosystem | Gemini | Claude | Quick |
| Market landscape | All three | — | Standard-Extensive |
| Security intelligence | Perplexity | Claude | Standard |
| Deep domain expertise | All + iterative | — | Deep Investigation |

## Single vs Multi-Agent Decision

### Use Single Agent When:
- Simple factual question with one answer
- Time-sensitive (need answer in <15s)
- Question has a clear best source
- Depth > breadth for this question

### Use Multi-Agent (3) When:
- Question benefits from multiple perspectives
- Comparing options or trade-offs
- Question spans multiple domains
- Synthesis quality matters more than speed

### Use Extensive (12) When:
- Mapping a landscape or market
- Comprehensive coverage required
- Multiple sub-questions within the topic
- Building a knowledge base

### Use Deep Investigation When:
- Building expertise over time
- Progressive deepening required
- Entity discovery and scoring needed
- Knowledge vault should persist

## Research Quality Signals

### Good Research
- Multiple sources corroborate key claims
- URLs are verified (not hallucinated)
- Findings include dates/versions (for currency)
- Distinguishes fact from opinion
- Identifies conflicting information

### Bad Research
- Single-source answers for complex questions
- Hallucinated URLs
- No dates (can't tell if current)
- Presents opinions as facts
- Ignores contradictory evidence

## Anti-Patterns

| Anti-Pattern | Fix |
|-------------|-----|
| Using extensive for "what is X?" | Quick mode — one source is enough |
| All agents searching identical queries | Differentiate: factual / analytical / technical angles |
| Skipping URL verification | ALWAYS verify before delivery |
| Research without a clear question | Define the question FIRST |
| Ignoring source strengths | Match source to question type |
| Over-researching known topics | Check if answer is already in memory/context |
| Under-researching critical decisions | Architecture/security decisions need Standard minimum |

## Research Integration with AGI Skill

When the AGI skill needs to refresh its knowledge:
1. Use Research skill's appropriate mode
2. Update reference docs with findings
3. Version the update (date-stamp)
4. Flag stale information in existing docs
