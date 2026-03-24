---
name: document
description: >-
  Generates documentation from code including READMEs, API docs, and architecture guides.
  USE WHEN the user asks to document, write docs, create a README, or explain a codebase.
---

## Instructions

Generate documentation by reading and understanding the actual codebase.

### Workflow Routing

| Request                    | Workflow         |
|---------------------------|-----------------|
| "document this project"   | Full README      |
| "API docs"                | API Reference    |
| "architecture doc"        | Architecture     |
| "document this function"  | Inline/Focused   |

### Workflow: Full README

Read these to understand the project:
- package.json / Cargo.toml / go.mod (name, deps, scripts)
- Entry point files (index.ts, main.go, etc.)
- Existing README (if any, to preserve structure)
- Test files (reveal usage patterns)

Generate:
```markdown
# Project Name

One-line description of what this does.

## Quick Start

[Install and run commands — copy-pasteable]

## Usage

[Primary use cases with code examples]

## Configuration

[Environment variables, config files, flags]

## Development

[How to set up dev environment, run tests, contribute]
```

### Workflow: API Reference

- Scan route definitions and handler files
- Extract endpoint, method, params, request/response types
- Include example requests with curl or fetch
- Group by resource or domain

### Workflow: Architecture

- Map the directory structure
- Identify layers (API, service, data, infrastructure)
- Document data flow for key operations
- List external dependencies and integrations
- Include a text-based diagram if the system has 3+ components

### Rules

- Every code example must be tested or derived from actual code
- Use the project's actual commands, not generic ones
- Link to files using relative paths
- Keep language plain and direct — no marketing fluff
- If something is unclear from the code, say so rather than guessing

## Scope

NOT for:
- Writing tutorials or blog posts
- Generating changelog entries (use commit skill)
- Creating user-facing help text inside the application
- Documenting external APIs the project consumes
