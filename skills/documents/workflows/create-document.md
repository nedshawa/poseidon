---
name: create-document
description: Generate structured documents from content and templates.
---

## Steps

### 1. Define Structure

| Document Type     | Sections                                                      |
|-------------------|---------------------------------------------------------------|
| Technical Report  | Summary, Background, Analysis, Recommendations, Appendix      |
| Meeting Notes     | Date, Attendees, Agenda, Discussion, Actions, Next Steps       |
| Project Proposal  | Problem, Solution, Scope, Timeline, Budget, Risks              |

### 2. Write Content

- Write clear, direct prose section by section
- Use tables for comparative data, lists for action items
- Include specifics over generalities

### 3. Format Output

**Default: Markdown.** Convert with `pandoc` (HTML, PDF) or `bunx playwright pdf` (browser-rendered PDF).

### Templates

**Technical Report:**
```markdown
# [Title]
**Version:** 1.0 | **Date:** [date] | **Author:** [name]
## Executive Summary
[3-5 sentences: what was done, found, recommended]
## Background
## Methodology
## Findings
## Recommendations
1. [Action with rationale]
## Appendix
```

**Meeting Notes:**
```markdown
# [Meeting Title] — [Date]
**Attendees:** [names]
## Agenda
1. [Topic]
## Discussion
### [Topic]
- [Key point or decision]
## Action Items
- [ ] [Task] — [owner] — [due date]
## Next Meeting
[Date and agenda]
```

**Project Proposal:**
```markdown
# [Project Name]
## Problem
[What this solves]
## Proposed Solution
[What will be built]
## Scope
**In scope:** [list] | **Out of scope:** [list]
## Timeline
| Phase | Duration | Deliverable |
|-------|----------|-------------|
## Risks
| Risk | Likelihood | Mitigation |
|------|-----------|------------|
```

### Rules

- Markdown default; tables over prose; action items need owners and dates
