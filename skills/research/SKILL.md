---
name: research
description: >-
  Conducts multi-depth research from memory recall to deep investigation.
  USE WHEN the user asks to research, investigate, look into, or find out about a topic.
---

## Instructions

Research topics at the appropriate depth tier. Start shallow, go deeper only if needed.

### Tier Selection

| Tier | Name    | When to Use                        | Time   |
|------|---------|------------------------------------|--------|
| 0    | Memory  | Answer is likely in project files  | <30s   |
| 1    | Quick   | Simple factual question            | <2min  |
| 2    | Standard| Needs comparison or analysis       | <10min |
| 3    | Deep    | Complex, multi-source investigation| <30min |

### Tier 0: Memory Recall

Check local sources first:
- Project documentation and README files
- Memory files and previous session notes
- Existing codebase for implementation details
- Config files for settings and versions

If the answer is found locally with confidence, return it. No external search needed.

### Tier 1: Quick Lookup

For straightforward factual questions:
- Use web search for current information
- Check official documentation
- One source is sufficient if authoritative
- No citation formatting needed, just name the source

### Tier 2: Standard Research

For questions requiring comparison or analysis:
- Consult 3-5 sources minimum
- Cross-reference claims across sources
- Note disagreements between sources
- Provide structured comparison if evaluating options

### Tier 3: Deep Investigation

For complex topics requiring thorough understanding:
- 5+ sources from diverse perspectives
- Primary sources preferred over summaries
- Evaluate source credibility and recency
- Identify gaps in available information
- Produce a structured report

### Source Quality Rules

- Official docs > blog posts > forum answers > AI-generated content
- Prefer sources from the last 2 years for technical topics
- Discard sources that contradict official documentation
- Flag when information may be outdated

### Output Format

```
## Research: [topic]

**Tier:** [0-3] | **Sources:** [count]

### Findings
[structured answer]

### Sources
1. [source name/url] - [what it contributed]
2. ...

### Confidence: [HIGH/MEDIUM/LOW] - [why]
```

## Scope

NOT for:
- Making decisions (present findings, let the user decide)
- Original analysis or opinions
- Accessing paywalled or private content
- Legal, medical, or financial advice
