---
name: research
description: >-
  Conducts multi-depth research from quick lookups to deep investigations with
  parallel agents, citation verification, and quality scoring. Auto-selects
  research depth from prompt complexity. USE WHEN research, investigate, look
  into, find out, deep dive, what do we know about, compare, analyze landscape,
  map the market, extensive research, quick research.
---

## Overview

Multi-tier research system with automatic depth selection, parallel agent execution,
mandatory citation verification, and quality scoring. Provider-agnostic: works with
WebSearch alone, scales with Perplexity/Gemini APIs when available.

## Research Tiers

| Tier | Name               | Agents | Queries | Time     | Trigger Score |
|------|--------------------|--------|---------|----------|---------------|
| 1    | Quick              | 1      | 1-3     | <30s     | 0-30          |
| 2    | Standard (default) | 3      | 3-10    | 1-3 min  | 31-55         |
| 3    | Extensive          | 4-10   | 10-50   | 5-20 min | 56-75         |
| 4    | Deep Investigation | N      | 50+     | 20-60min | 76+           |

## Tier Auto-Selection

The tier classifier scores prompt complexity (0-100) across five signals:
entity count, temporal scope, comparison breadth, abstraction level, and explicit depth cues.

**Keyword overrides** (bypass scoring):
- "quick research", "quick lookup" --> Tier 1
- "extensive research", "comprehensive" --> Tier 3
- "deep investigation", "map the landscape" --> Tier 4

Run `handlers/tier-classifier.ts` to classify programmatically.

## Workflow Routing

| Request Pattern                        | Workflow                        |
|----------------------------------------|---------------------------------|
| Simple fact, definition, date          | workflows/quick.md              |
| "Research X", comparison, multi-part   | workflows/standard.md           |
| "Extensive", "deep dive", "comprehensive" | workflows/extensive.md       |
| "Investigate", "map landscape"         | workflows/deep-investigation.md |
| "Extract insights", "key takeaways"   | workflows/extract-alpha.md      |
| URL blocked, CAPTCHA, content needed   | workflows/retrieve.md           |

## Mandatory: URL Verification

Every URL included in research output MUST be verified before delivery.
See `references/url-verification-protocol.md` for the full protocol.
Never generate URLs from memory. Only use URLs found in search results.

## Quality Rubric

Four axes, each scored 0-10. Tier 2+ requires 6/10 minimum on the first three:

| Axis                  | What It Measures                              |
|-----------------------|-----------------------------------------------|
| Explicit Completeness | All aspects of the question addressed          |
| Synthesis Quality     | Cross-source integration, not just listing     |
| Citation Integrity    | Sources real, relevant, and properly attributed |
| Clarity               | Well-structured, scannable, actionable         |

If any axis falls below threshold, the quality scorer triggers a re-research cycle
targeting the weak axis. Run `handlers/quality-scorer.ts` for programmatic scoring.

## Project Integration

Research output persists to `memory/projects/{id}/knowledge/research/` when a project
context is active. File naming: `{date}_{slug}.md`.

## Scope

This skill handles research and information gathering. It does NOT handle:
- Code writing or implementation (use coding skills)
- Security scanning or vulnerability assessment
- People search or personal investigations (use investigation skill)
- Decision-making (present findings; the user decides)
- Legal, medical, or financial advice

## Handlers

| Handler                       | Purpose                                 |
|-------------------------------|-----------------------------------------|
| handlers/tier-classifier.ts   | Auto-select tier from prompt signals    |
| handlers/citation-verifier.ts | Verify all URLs are live before delivery |
| handlers/quality-scorer.ts    | 4-axis rubric scoring with thresholds   |
