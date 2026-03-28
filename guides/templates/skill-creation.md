# Skill Creation Guide

**How to create, validate, and maintain skills in Poseidon.**

## Quick Start

1. Create directory: `skills/[skill-name]/`
2. Create `SKILL.md` with YAML frontmatter + workflow routing
3. Create `workflows/` directory with workflow files
4. Validate: run canonicalize workflow

## SKILL.md Template

```yaml
---
name: skill-name
description: >-
  What this skill does. Detailed description including all trigger phrases.
  USE WHEN trigger1, trigger2, trigger3, natural language triggers.
---
```

```markdown
# Skill Name

Brief description.

## Workflow Routing

| Request Pattern | Route To |
|---|---|
| Pattern description | `workflows/workflow-name.md` |

## Examples

**Example 1: [Use case]**
```
User: "[request]"
→ Routes to workflow
→ [What happens]
→ [What user gets]
```

## Scope

**NOT for:**
- What this skill does NOT handle
- Where to go instead
```

## Rules (MANDATORY)

1. **Name:** lowercase-hyphen, 1-64 characters
2. **Description:** includes `USE WHEN`, max 1024 characters
3. **Examples:** 2-3 concrete usage patterns
4. **Scope:** `NOT for:` section present
5. **Workflows:** All referenced workflows exist as files
6. **Body:** SKILL.md under 500 lines (use workflows for depth)
7. **No XML tags** in name or description

## Skill Structure

```
skill-name/
├── SKILL.md                ← Main file (routing + examples + scope)
├── reference-doc.md        ← Context files in root (loaded on demand)
├── workflows/              ← Execution procedures
│   ├── create.md
│   └── validate.md
├── handlers/               ← TypeScript automation (optional)
│   └── classifier.ts
├── data/                   ← Configuration data (optional)
│   └── config.yaml
└── references/             ← Reference data (optional)
    └── schema.yaml
```

## Dynamic Loading Pattern

Keep SKILL.md minimal (30-50 lines). Put detailed docs in separate files:
- SKILL.md = routing + quick reference + scope
- Separate .md files = detailed guides, API reference, examples
- Workflows load only when routed to

## Handler Pattern

For skills with automation, create TypeScript handlers:

```typescript
#!/usr/bin/env bun
/**
 * handler-name.ts — Brief description
 */
import { readFileSync, existsSync } from "fs";

export function myFunction(input: string): Result {
  // Handler logic
}

// CLI entry point
if (import.meta.main) {
  const input = await Bun.stdin.text();
  console.log(JSON.stringify(myFunction(input)));
}
```

Requirements:
- `#!/usr/bin/env bun` shebang
- Export named functions (not default)
- Support `--help` flag
- Handle errors gracefully (try/catch)
- CLI entry via `import.meta.main`

## Validation

Run the canonicalize workflow:
```
"canonicalize the [skill-name] skill"
```

This checks all 7 rules and fixes violations automatically.

## Best Practices

1. **Intent matching, not string matching** — USE WHEN should describe intent, not exact phrases
2. **Scope boundaries prevent confusion** — Always include NOT for section
3. **Examples improve activation accuracy** — 72% → 90% with examples (Anthropic research)
4. **One skill, one domain** — Don't combine unrelated capabilities
5. **Workflows are scripts** — Follow them step by step, don't analyze
6. **Test with real prompts** — Does the skill activate correctly?
