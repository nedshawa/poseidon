---
name: create-document
description: Generate structured documents from content and templates.
---

## Steps

### 1. Define Structure

Determine the document type and choose a template:

| Document Type     | Sections                                           |
|-------------------|----------------------------------------------------|
| Technical Report  | Title, Summary, Background, Analysis, Recommendations, Appendix |
| Meeting Notes     | Date, Attendees, Agenda, Discussion, Actions, Next Steps |
| Project Proposal  | Overview, Problem, Solution, Timeline, Budget, Risks |

### 2. Write Content

Generate content section by section. For each section:
- Write in clear, direct prose
- Include data and specifics over generalities
- Use tables for comparative information
- Use lists for action items and requirements

### 3. Format Output

**Default: Markdown** (most portable)

```markdown
# Document Title

**Date:** 2025-01-15
**Author:** [name]

## Executive Summary

[2-3 sentence overview]

## Section 1

[Content with subheadings as needed]

---
*Generated [date]*
```

**HTML** (when styling matters):

```bash
# Convert markdown to styled HTML
pandoc document.md -o document.html --standalone --css=style.css
```

**PDF** (when a final deliverable is needed):

```bash
# Via Playwright (best quality)
playwright pdf document.html document.pdf

# Via pandoc + LaTeX
pandoc document.md -o document.pdf

# Via Chrome headless
chromium --headless --print-to-pdf=document.pdf document.html
```

### Templates

#### Technical Report

```markdown
# [Title]

**Version:** 1.0 | **Date:** [date] | **Author:** [name]

## Executive Summary
[What was done, what was found, what to do next — 3-5 sentences]

## Background
[Context the reader needs]

## Methodology
[How the work was done]

## Findings
[Results with supporting data]

## Recommendations
1. [Action item with rationale]
2. [Action item with rationale]

## Appendix
[Supporting data, raw results, references]
```

#### Meeting Notes

```markdown
# [Meeting Title] — [Date]

**Attendees:** [names]

## Agenda
1. [Topic]

## Discussion
### [Topic]
- [Key point]
- [Decision made]

## Action Items
- [ ] [Task] — [owner] — [due date]

## Next Meeting
[Date and preliminary agenda]
```

#### Project Proposal

```markdown
# [Project Name]

## Problem
[What problem this solves — be specific]

## Proposed Solution
[What will be built and how it works]

## Scope
**In scope:** [list]
**Out of scope:** [list]

## Timeline
| Phase    | Duration | Deliverable          |
|----------|----------|----------------------|
| Phase 1  | 2 weeks  | [deliverable]        |

## Risks
| Risk          | Likelihood | Mitigation          |
|---------------|-----------|----------------------|
| [risk]        | Medium    | [mitigation]         |
```

### Rules

- Markdown is the default unless the user specifies otherwise
- Every document must have a title and date
- Tables over prose for structured data
- Action items must have owners and dates
- Keep sections focused — split rather than merge
