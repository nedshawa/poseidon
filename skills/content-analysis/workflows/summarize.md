# Summarize

Produces concise summaries at three depth levels. Focuses on preserving
the author's argument, not just listing facts.

## When to Use

- "Summarize this article"
- "Give me the tl;dr"
- "What is this about?"

## Depth Levels

### Brief (~30s)
- 3-5 bullet points covering the core argument
- Each bullet is one sentence maximum
- No context or nuance, just the essentials

### Standard (~1min)
- 1-2 paragraphs capturing the main argument and supporting points
- Includes the author's conclusion or call to action
- Preserves the logical flow of the original

### Comprehensive (~3min)
- Structured summary with labeled sections:
  - **Main Argument**: the central thesis in 2-3 sentences
  - **Supporting Points**: each major supporting argument
  - **Evidence Used**: types of evidence (data, anecdotes, research)
  - **Conclusion**: what the author wants the reader to walk away with
  - **Meta-Analysis**: what the author is really saying beneath the surface

Default depth is **Standard** unless the caller specifies otherwise.

## Meta-Analysis

Every summary at Standard or Comprehensive depth includes a "What the
author is REALLY saying" line. This captures the subtext: the implicit
argument, the audience being targeted, the unstated assumptions, or the
rhetorical strategy at play.

## Process

1. Retrieve full content via the transcript-extractor handler
2. Identify the central thesis before summarizing supporting material
3. Distinguish between the author's claims and cited evidence
4. Write the summary at the requested depth level
5. Append the meta-analysis line for Standard and Comprehensive depths

## Example Invocation

```
Summarize this article at comprehensive depth:
https://example.com/article
```

## Works With

All content types: articles, videos, podcasts, papers, and raw text.
