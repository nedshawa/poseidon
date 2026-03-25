# Extraction Output Formats

Templates for each extraction mode. All outputs include a metadata header.

## Metadata Header (all modes)

```markdown
---
source: [URL or "raw text"]
type: [youtube | article | pdf | audio | text]
mode: [wisdom | summary | action-items | structured | deep-analysis]
extracted: [ISO 8601 timestamp]
project: [project-id if applicable]
---
```

## Wisdom Template

```markdown
## Key Ideas
1. **[Idea]** -- [one sentence of context]

## Mental Models & Frameworks
- **[Model name]**: [how it was applied], [where it could be reused]

## Impactful Quotes
> "[Quote]" -- [Speaker/Author]

## Surprising Claims
- [Claim] (evidence: strong | moderate | weak)

## Recommendations
- [Explicit/Implied]: [recommendation]
```

## Summary Template

```markdown
## Summary ([brief | standard | comprehensive])
[Content at the requested depth level]

**What the author is REALLY saying:** [meta-analysis line]
```

## Action Items Template

```markdown
## Action Items
1. [Action description]
   - Priority: [high | medium | low]
   - Effort: [quick | medium | significant]
   - Category: [tag]
```

## Structured Extract Template

```markdown
## Entities
| Entity | Type | Context |
|---|---|---|

## Claims
| Claim | Source | Verifiable |
|---|---|---|

## Statistics
| Metric | Value | Context | Source |
|---|---|---|---|

## Relationships
| Subject | Relationship | Object |
|---|---|---|
```

## Deep Analysis Template

```markdown
## New Insights
- [Insight] (relevance: high | medium | low)

## Confirmations
- [Point] -- confirms [prior extraction reference]

## Contradictions
- [New claim] vs [existing knowledge] -- [evidence assessment]

## Remaining Gaps
- [Unanswered question]
```
