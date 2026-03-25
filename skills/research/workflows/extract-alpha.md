# Extract Alpha

Deep insight extraction from provided content. Surfaces what most readers miss.

## Parameters

| Field   | Value                                       |
|---------|---------------------------------------------|
| Input   | URL, pasted text, or document reference     |
| Agents  | 1-2 (content retrieval + analysis)          |
| Time    | 1-5 minutes                                 |
| Output  | Structured insight report                   |

## When to Use

- "Extract alpha from this article"
- "What are the key insights from this?"
- "Deep analysis of this content"
- "What is everyone missing in this report?"
- Given a URL, document, or pasted text to analyze

## Workflow

### Step 1: Content Acquisition

If given a URL: retrieve content using the retrieve workflow (workflows/retrieve.md).
If given text: use directly.
If content is too long (>10,000 words): identify and extract the highest-signal sections.

### Step 2: Surface-Level Extraction

Read the content and extract:
- **Stated conclusions:** What the author explicitly claims
- **Key data points:** Numbers, metrics, dates, comparisons
- **Named entities:** People, companies, technologies mentioned
- **Author's framing:** How the author wants the reader to interpret this

### Step 3: Deep Extraction

Go beyond what is stated:
- **Unstated assumptions:** What the author takes for granted
- **Conspicuous omissions:** What topics are avoided or underdeveloped
- **Second-order implications:** If X is true, what else must be true?
- **Contradictions:** Where the content contradicts itself or common knowledge
- **Signal vs noise:** Which claims are backed by evidence vs. asserted without support

### Step 4: Alpha Synthesis

Produce the insight report. "Alpha" means information advantage. Focus on insights
that a casual reader would miss but that change how one should think about the topic.

## Output Format

```
## Alpha Extract: [Content Title or Topic]

**Source:** [url or "provided text"]
**Content Length:** [word count estimate]

### Key Findings
[3-5 bullet points: the most important facts and claims]

### Contrarian Insights
[What the content reveals that goes against conventional wisdom]

### What Everyone Misses
[Unstated assumptions, omissions, second-order implications]

### Contradictions and Weak Claims
[Claims without evidence, internal contradictions, logical gaps]

### Actionable Takeaways
[Concrete actions or decisions this content should inform]

### Confidence Notes
[How reliable is this content? What would strengthen or weaken its claims?]
```

## Examples

**Prompt:** "Extract alpha from https://example.com/quarterly-earnings-report"
**Process:** Retrieve content, extract stated metrics, identify what management emphasized
vs. buried, note margin trends they did not highlight, flag optimistic projections.

**Prompt:** "What are the key insights from this whitepaper?" [pasted text]
**Process:** Extract core thesis, identify unstated assumptions about market conditions,
note which claims lack citations, surface second-order effects of the proposal.
