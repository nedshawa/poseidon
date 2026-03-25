# Structured Extract

Pulls structured data from unstructured content. Produces tables, entity
lists, and relationship maps suitable for knowledge bases and databases.

## When to Use

- "Extract all the companies mentioned"
- "What facts and statistics are cited?"
- "Build a structured summary of this paper"

## Extraction Categories

### Named Entities
| Entity | Type | Context |
|---|---|---|
| [name] | person / company / technology / product / place | [how it appears in content] |

### Factual Claims
| Claim | Source | Verifiable |
|---|---|---|
| [statement] | [who said it / where cited] | yes / no / partially |

### Statistics & Numbers
| Metric | Value | Context | Source |
|---|---|---|---|
| [what is measured] | [number] | [surrounding context] | [attribution] |

### Relationships
| Subject | Relationship | Object |
|---|---|---|
| [entity A] | uses / competes with / acquired / founded / partners with | [entity B] |

## Process

1. Retrieve full content via the transcript-extractor handler
2. Extract named entities in a single pass, tagging each by type
3. Identify factual claims and separate them from opinions
4. Pull all statistics and numbers with their surrounding context
5. Map relationships between extracted entities
6. Format output as markdown tables (default) or JSON when requested

## Output Formats

- **Markdown tables** (default): as shown in the templates above
- **JSON**: when the caller specifies `--format json` or asks for
  machine-readable output, use the JSON template from
  `references/extraction-formats.md`

## Example Invocation

```
Structured extract from this article:
https://example.com/industry-report
```

## Works With

All content types. Most productive with research papers, industry
reports, news articles, and interview transcripts. Less useful for
purely opinion-based or narrative content.
