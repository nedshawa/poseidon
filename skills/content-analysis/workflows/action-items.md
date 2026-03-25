# Action Items

Extracts only the actionable takeaways from content. Filters out
philosophical, theoretical, and background material to surface things
the reader can actually do.

## When to Use

- "What should I do after reading this?"
- "Give me the action items"
- "What are the practical takeaways?"

## Output Format

Each action item is a numbered entry with three attributes:

```
1. [Action description]
   Priority: high | medium | low
   Effort: quick (<30min) | medium (hours) | significant (days+)
   Category: [domain tag]
```

## Extraction Rules

- Include only items where someone could start doing something today
- Skip general philosophy ("think bigger") unless paired with a method
- Convert vague advice into specific actions when the content supports it
- Preserve the author's ordering when it implies priority
- Group related actions under a shared category tag

## Categories

Categories are inferred from the content. Common examples:
- process, tooling, hiring, strategy, health, finance, communication,
  learning, automation, relationships

## Process

1. Retrieve full content via the transcript-extractor handler
2. Scan for imperative statements, recommendations, and how-to sequences
3. Filter: discard anything that lacks a concrete "do this" component
4. Assign priority based on the author's emphasis and potential impact
5. Assign effort based on implied complexity
6. Group by category and sort by priority within each group

## Example Invocation

```
Action items from https://youtube.com/watch?v=example
```

## Works With

All content types. Most productive with how-to content, interviews
with practitioners, and strategy-focused material. Less useful for
purely theoretical or historical content.
