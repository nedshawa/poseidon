# Deep Analysis

The premium extraction mode. Cross-references new content against the
project knowledge base to identify what is genuinely new, what confirms
existing knowledge, and what contradicts it.

## When to Use

- "What does this add that we didn't know?"
- "Deep analysis of this paper against our research"
- "Does this contradict anything we've collected?"

## Requirements

- An active project context with a populated knowledge directory
- Prior extractions stored at `memory/projects/{project-id}/knowledge/`
- Without existing knowledge, falls back to a comprehensive wisdom extraction

## Output Sections

### 1. New Insights
Ideas, facts, or frameworks not present in the project knowledge base.
Each item includes a relevance score (high / medium / low) indicating
how useful it is to the project's goals.

### 2. Confirmations
Points that align with and reinforce existing knowledge entries.
References the specific prior extraction that matches.

### 3. Contradictions
Claims that conflict with existing knowledge. Presents both sides:
the new claim and the existing entry, with an assessment of which
has stronger evidence.

### 4. Remaining Gaps
Questions raised by the new content that neither it nor the existing
knowledge base answers. These become candidates for future research.

## Process

1. Retrieve full content via the transcript-extractor handler
2. Load existing knowledge entries from the project directory
3. Extract key claims and insights from the new content
4. Compare each claim against the knowledge base:
   - No match found: classify as New Insight
   - Supporting match found: classify as Confirmation
   - Conflicting match found: classify as Contradiction
5. Identify questions the content raises but does not answer
6. Format output with cross-reference links to prior extractions

## Example Invocation

```
Deep analysis of this paper against project alpha:
https://example.com/new-research.pdf
```

## Works With

All content types. Requires at least 3-5 prior extractions in the
project knowledge base to produce meaningful cross-references.
Thin knowledge bases will yield mostly New Insights.
