# Validate Skill

Runs the agentskills.io quality gate against an existing skill and reports pass/fail.

## Inputs

- **Skill path**: path to the skill directory (must contain SKILL.md)

## Procedure

### Step 1: Read SKILL.md

Read the file at `{skill-path}/SKILL.md`. If it does not exist, fail immediately.

### Step 2: Check frontmatter

Parse the YAML frontmatter between `---` delimiters. Verify:

| Check | Rule | Symbol |
|-------|------|--------|
| Name present | `name` field exists | pass/fail |
| Name format | lowercase + hyphens only, 1-64 chars | pass/fail |
| Name safe | no reserved words (anthropic, claude) | pass/fail |
| Description present | `description` field exists | pass/fail |
| Description length | non-empty, max 1024 chars | pass/fail |
| Description voice | third person (no imperative verbs at start) | pass/fail |
| USE WHEN clause | description contains "USE WHEN" | pass/fail |
| No XML in metadata | no `<` or `>` in name or description | pass/fail |

### Step 3: Check body

| Check | Rule | Symbol |
|-------|------|--------|
| Line count | SKILL.md body under 500 lines | pass/fail |
| Scope section | contains "NOT for:" with at least 2 items | pass/fail |
| Flat structure | workflows/ has no subdirectories | pass/fail |

### Step 4: Check workflows (if present)

For each file in `workflows/`:
- Confirm it is a `.md` file
- Confirm it has a top-level heading
- Confirm it has at least one "Step" section

## Output

Print a checklist like this:

```
Skill Validation: {name}
─────────────────────────
  Name present ............. [pass]
  Name format .............. [pass]
  Name safe ................ [pass]
  Description present ...... [pass]
  Description length ....... [pass]
  Description voice ........ [pass]
  USE WHEN clause .......... [pass]
  No XML in metadata ....... [pass]
  Line count ............... [pass]
  Scope section ............ [pass]
  Flat structure ........... [pass]
─────────────────────────
Result: PASS (11/11)
```

For any failing check, add a "Fix:" line with the specific correction needed.
