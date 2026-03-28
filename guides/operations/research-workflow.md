# Research Workflow Guide

**How to conduct effective research in Poseidon.**

## Research Tiers

| Tier | Agents | Time | When |
|------|--------|------|------|
| ✦ **Quick** | 1 (Perplexity) | ~15s | Simple factual question |
| ✦◈◆ **Standard** | 3 (Claude + Perplexity + Gemini) | ~30s | Default, most questions |
| ✦◈◆✕ **Extensive** | 4-12 | ~90s | Landscape mapping, comprehensive |
| 🔄 **Deep** | Iterative | 3-60min | Progressive deepening, knowledge vault |

## How Research Works

```
Project preferences loaded (domain, preferred_sources, default_tier)
    ↓
Context injector reads existing knowledge/ (skip known facts)
    ↓
Agents dispatched in parallel:
  ✦ Claude — scholarly synthesis
  ◈ Perplexity — real-time web data
  ◆ Gemini — technical docs
    ↓
Research iterator identifies gaps → Round 2 fills holes
    ↓
Research verifier cross-checks conflicting claims
    ↓
Quality scorer grades on 4 axes (6/10 minimum)
    ↓
Results persisted to project knowledge/research/
    ↓
Source reliability recorded to learning signals
```

## Source Selection Guide

| Question Type | Best Source | Why |
|--------------|------------|-----|
| "What happened recently?" | ◈ Perplexity | Real-time web search |
| "How does X work?" | ✦ Claude | Scholarly synthesis |
| Google ecosystem topics | ◆ Gemini | Native understanding |
| Academic/scholarly | ✦ Claude | Paper synthesis |
| Market landscape | All three | Maximum coverage |

## Project Preferences

Each project can customize research via `preferences/research.yaml`:
```yaml
default_tier: extensive
preferred_sources: [perplexity, gemini]
domain: finance
auto_persist: true
output_format: structured
```

## Quality Rubric (4 Axes)

| Axis | What It Measures | Minimum |
|------|-----------------|---------|
| Completeness | All aspects of question addressed | 6/10 |
| Synthesis | Cross-source integration, not just listing | 6/10 |
| Citations | Sources real, relevant, attributed | 6/10 |
| Clarity | Well-structured, scannable, actionable | (no minimum) |

If any axis falls below 6/10, re-research targeting the weak axis.

## Best Practices

1. **Define the question first** — vague prompts → vague results
2. **Check existing knowledge** — don't re-research known facts
3. **Verify all URLs** — research agents hallucinate links
4. **Match depth to need** — don't use extensive for simple questions
5. **Differentiate queries** — give each agent a different angle
6. **Save results** — auto_persist writes to project knowledge/
