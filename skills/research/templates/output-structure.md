# Research Output Template

All research agents MUST structure their output using this template.
Unstructured or freeform research output will be rejected by the quality scorer.

## Required Sections

### Findings (numbered, specific)

Each finding must include:
1. **[Claim]** — [Specific evidence with numbers/dates] — Source: [URL or publication name]
2. **[Claim]** — [Specific evidence with numbers/dates] — Source: [URL or publication name]

Findings without a source are flagged as unverified and penalized in scoring.

### Data Points

| Metric | Value | Period | Source | Confidence |
|--------|-------|--------|--------|------------|
| [metric] | [value] | [timeframe] | [source] | high/medium/low |

Rules:
- Confidence is based on source reliability and recency
- "high" = primary source, verified, < 6 months old
- "medium" = secondary source or > 6 months old
- "low" = single unverified source or > 1 year old

### Gaps

What this agent could NOT find or verify:
- [gap 1]
- [gap 2]

Every research output must honestly disclose gaps. Omitting gaps
when they exist is worse than reporting them.

### Source List

All URLs used, verified status:
- [URL] — verified ✓ / unverified ⚠

Verification means the URL was fetched and the content matches the claim.
Agents should attempt to verify all sources before submission.

## Scoring

Output structured per this template is scored by `quality-scorer.ts` on:
completeness, synthesis, citations, and clarity (each 0-10, total 0-40).
