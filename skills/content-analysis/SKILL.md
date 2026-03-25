---
name: content-analysis
description: >-
  Extracts insights from videos, podcasts, articles, papers, and any content.
  Five extraction modes: wisdom, summary, action items, structured data, and
  deep analysis. Auto-detects content type from URLs. USE WHEN extract wisdom,
  summarize, key takeaways, analyze content, what did I miss, extract insights,
  action items from, structured extract, analyze video, analyze podcast.
---

# Content Analysis

Turns raw content into structured knowledge. Accepts URLs, text, PDFs, and
file paths. The content-detector handler identifies the input type and the
transcript-extractor handler retrieves text when needed.

## Extraction Modes

| Mode | Workflow | Use When |
|---|---|---|
| Wisdom | `workflows/extract-wisdom.md` | "extract wisdom", "key insights", "mental models" |
| Summary | `workflows/summarize.md` | "summarize", "tl;dr", "what's this about" |
| Action Items | `workflows/action-items.md` | "action items", "what should I do", "takeaways" |
| Structured | `workflows/structured-extract.md` | "extract entities", "facts", "structured data" |
| Deep Analysis | `workflows/deep-analysis.md` | "deep analysis", "cross-reference", "what's new here" |

Default mode is **Wisdom** when no specific mode is requested.

## Content Type Detection

The `handlers/content-detector.ts` handler classifies input automatically:

- **YouTube** -- youtube.com or youtu.be URLs, uses transcript extraction
- **Article** -- any other HTTP/HTTPS URL, fetched via WebFetch
- **PDF** -- .pdf file paths or URLs, read directly
- **Audio** -- .mp3, .wav, .m4a paths, transcribed via whisper
- **Text** -- no URL detected, treated as raw input

## Depth Tiers

| Tier | Time | Description |
|---|---|---|
| Quick | ~30s | Key points only, bullet format |
| Standard | ~2min | Full extraction per the selected mode |
| Deep | ~5min | Cross-references project knowledge base |

Default tier is **Standard**. Deep tier requires an active project context.

## Deduplication

Before processing, check `memory/projects/{project-id}/knowledge/` for prior
extractions matching the same URL or content hash. If found, return the cached
result with a note: "Previously extracted in session {id}. Re-extract? (y/n)".

## Project Integration

Completed extractions are stored at:
```
memory/projects/{project-id}/knowledge/{date}_{mode}_{slug}.md
```

Each file includes source URL, extraction mode, timestamp, and the structured
output. This feeds the deep-analysis mode for cross-referencing.

## Output Formats

See `references/extraction-formats.md` for output templates per mode.

## Routing

1. Detect content type via `handlers/content-detector.ts`
2. Extract transcript if needed via `handlers/transcript-extractor.ts`
3. Route to the appropriate workflow based on requested mode
4. Store result in project knowledge directory
5. Return formatted output to the caller
