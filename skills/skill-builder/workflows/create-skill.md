# Create Skill

Scaffolds a new Poseidon skill with correct structure and quality gates enforced.

## Inputs

Gather from the user (ask if not provided):

1. **Skill name** - kebab-case (e.g., `data-fetcher`)
2. **Description** - what it does + when it triggers (must include "USE WHEN")
3. **Type** - `simple` (single SKILL.md) or `complex` (SKILL.md + workflows/)

## Procedure

### Step 1: Validate inputs

Name rules: lowercase + hyphens only, 1-64 chars, no reserved words (anthropic, claude), no XML tags.

Description rules: non-empty, max 1024 chars, third person voice, must contain "USE WHEN", no XML tags.

If validation fails, tell the user what to fix and ask again.

### Step 2: Create directory structure

Simple: `skills/{name}/SKILL.md`
Complex: `skills/{name}/SKILL.md` + `skills/{name}/workflows/{workflow}.md`

Ask the user for workflow names if complex type is chosen.

### Step 3: Generate SKILL.md

```markdown
---
name: {name}
description: >
  {description}
---
# {Title Case Name}

{One paragraph explaining what this skill does.}

## Capabilities
- **{Capability}**: {what it does}

## Scope
{What this skill covers.}

**NOT for:**
- {Out-of-scope item 1}
- {Out-of-scope item 2}
- {Out-of-scope item 3}

## Workflows  (if complex)
- [{Workflow Title}](workflows/{file}.md) - {summary}
```

### Step 4: Generate workflow files (complex only)

Each workflow follows: heading, one-line description, Inputs section, Procedure with numbered steps, Output section.

### Step 5: Validate

Run [validate-skill](validate-skill.md) against the new skill. Fix any issues before considering complete.

## Output

A fully scaffolded skill directory that passes all quality gates.
