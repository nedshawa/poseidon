# Extract Wisdom

The flagship extraction mode. Distills content into its most valuable
intellectual components: ideas, frameworks, quotes, surprises, and actions.

## When to Use

- "Extract wisdom from this video"
- "What are the key insights?"
- "What mental models does the author use?"

## Extraction Sections

### 1. Key Ideas (3-5)
The central arguments or insights. Each idea gets one sentence of context
explaining why it matters. Prioritize non-obvious ideas over commonly known ones.

### 2. Mental Models & Frameworks
Identify any thinking frameworks the author uses explicitly or implicitly.
Name the model, describe how it was applied, and note where it could be
reused in other contexts.

### 3. Impactful Quotes (3-5)
Direct quotes that capture the essence of the content. Include speaker
attribution and enough surrounding context to make each quote standalone.

### 4. Surprising Claims
Statements that challenge conventional wisdom or contradict common assumptions.
Flag whether evidence was provided and rate the strength of the argument
(strong / moderate / weak).

### 5. Recommendations
Concrete suggestions the author makes. Distinguish between explicit
recommendations ("you should do X") and implied ones ("people who succeed
tend to do X").

## Process

1. Retrieve full content via the transcript-extractor handler
2. Read the content completely before extracting -- do not stream partial results
3. Extract each section independently, then cross-check for consistency
4. Deduplicate overlapping points across sections
5. Format using the wisdom template from `references/extraction-formats.md`

## Example Invocation

```
Extract wisdom from https://youtube.com/watch?v=example
```

Expected output: a structured markdown document with all five sections,
each clearly labeled with the content that fills it.

## Works With

- Articles and blog posts (via WebFetch)
- YouTube videos (via transcript extraction)
- Podcasts (via audio transcription)
- Academic papers (via PDF reading)
- Raw pasted text (direct processing)
