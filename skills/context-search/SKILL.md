---
name: context-search
description: >-
  Search across Poseidon's context — docs, skills, memory, projects — to find
  relevant information quickly. Shorthand: cs. USE WHEN context search, find in
  docs, search memory, where is, cs, find context, search skills, look up.
---

# Context Search

Quick search across all Poseidon context sources.

## Commands

| Command | Shorthand | Route To |
|---------|-----------|----------|
| context-search | cs | `commands/context-search.md` |

## Examples

**Example 1: Find documentation**
```
User: "cs hook system"
→ Searches docs/, skills/, algorithm/ for "hook system"
→ Returns matching files and relevant sections
```

**Example 2: Find in memory**
```
User: "context-search learning rules"
→ Searches memory/learning/ for rule-related content
→ Returns active rules and candidates
```

## Scope

**NOT for:**
- Web search (use research skill)
- File system operations (use Bash/Glob/Grep directly)
- Project switching (use project system)
