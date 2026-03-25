# ResearchStrategy Workflow

**Purpose:** Guide optimal research source selection, determine when to use single vs multi-agent research, and calibrate research depth to the question.

## When to Use

- Deciding which research source to use for a given question
- Calibrating research depth (quick vs deep)
- Understanding research source strengths and weaknesses
- Designing a research plan for a complex topic

## Research Source Guide

### Source Capabilities

| Source | Best For | Latency | Depth | Cost | Agent Type |
|--------|---------|---------|-------|------|-----------|
| **Perplexity** | Current facts, recent events, quick lookups | ~10s | Medium | API key | PerplexityResearcher |
| **Claude WebSearch** | Free research, scholarly analysis, synthesis | ~15s | High | Free | ClaudeResearcher |
| **Gemini** | Google ecosystem, technical docs, multimodal | ~15s | High | API key | GeminiResearcher |
| **Brave WebSearch** | Privacy-focused, general web, alternative results | ~5s | Low | Free | WebSearch tool |
| **Fabric Patterns** | Structured extraction (242+ patterns) | ~5s | Varies | Local | Fabric CLI |

### When to Use Each Source

| Question Type | Primary Source | Why |
|--------------|---------------|-----|
| "What happened today/recently?" | Perplexity | Best real-time web search |
| "How does X work?" (technical) | Claude WebSearch + Gemini | Deep synthesis + Google docs |
| "Compare X vs Y" | Standard (3 agents) | Need multiple perspectives |
| "What's the latest on X?" | Perplexity | Freshest results |
| "Deep dive into X landscape" | Deep Investigation (iterative) | Progressive deepening |
| Google-specific topics (GCP, Android, etc.) | Gemini | Native understanding |
| Academic/scholarly | Claude WebSearch | Best synthesis of papers |
| Extracting from specific content | Fabric | Purpose-built patterns |

### Single vs Multi-Agent Decision Matrix

| Scenario | Agents | Mode | Reasoning |
|----------|--------|------|-----------|
| Simple factual question | 1 (Perplexity) | Quick | One source sufficient |
| Technical how-to | 1 (Claude) | Quick | Synthesis > breadth |
| Current events | 1 (Perplexity) | Quick | Freshness matters most |
| Comparative analysis | 3 (all) | Standard | Need multiple perspectives |
| Market landscape | 3+ (all) | Standard/Extensive | Breadth critical |
| Architecture decision | 3 (all) | Standard | Trade-offs need angles |
| Deep domain investigation | 12 (4 types × 3) | Extensive | Maximum coverage |
| Progressive research | Iterative | Deep | Building knowledge vault |

### Research Depth Calibration

```
                    Quick           Standard        Extensive       Deep
Time budget:        10-15s          15-30s          60-90s          3-60min
Agents:             1               3               12              Iterative
Queries:            1               3-6             12-24           Progressive
Sources:            1               3               4 types         All
Output:             Facts           Analysis        Comprehensive   Knowledge vault
Use when:           Know what       Need analysis   Need landscape  Building expertise
                    you want        and synthesis   and coverage    over time
```

### PAI Research Configuration

Current PAI Research skill routing:
- **Quick:** 1 Perplexity agent (was ClaudeResearcher, changed per user preference)
- **Standard:** 3 agents (Perplexity + Claude + Gemini)
- **Extensive:** 12 agents (4 types × 3 threads)
- **Deep Investigation:** Progressive iterative with entity scoring

### Research Anti-Patterns

| Anti-Pattern | Why It Fails | Fix |
|-------------|-------------|-----|
| Using extensive for simple questions | Wastes time and tokens | Use quick mode |
| Using quick for complex topics | Insufficient depth | Use standard minimum |
| All agents searching same query | Redundant results | Differentiate queries |
| No URL verification | Hallucinated links | Always verify URLs |
| Ignoring source strengths | Suboptimal results | Match source to question type |
| Research without clear question | Unfocused results | Define question before searching |

### Workflow Steps

1. **Understand the research need:**
   - What specific question(s) need answering?
   - How current does the information need to be?
   - What depth is required?
   - Is this for decision-making or learning?

2. **Select research configuration:**
   - Choose mode (quick/standard/extensive/deep)
   - Select primary source(s) based on question type
   - Define differentiated queries if multi-agent

3. **Output research plan:**

```markdown
## Research Strategy

**Question:** [the core question]
**Mode:** [Quick/Standard/Extensive/Deep]
**Reasoning:** [why this mode]

### Agent Configuration
| Agent | Source | Query | Purpose |
|-------|--------|-------|---------|
| 1 | [source] | [query] | [what this agent finds] |
| 2 | [source] | [query] | [what this agent finds] |

### Expected Output
- Format: [facts/analysis/landscape/vault]
- Depth: [surface/moderate/deep]
- Time estimate: [Xs]
```
