# Canonicalize Skill Workflow

**Purpose:** Restructure an existing skill to match the Poseidon skill system specification.

## When to Use

- Skill missing `USE WHEN` in description
- Skill missing scope boundary (`NOT for:`)
- Skill missing Examples section
- Files using wrong naming convention
- Deep nesting beyond 2 levels
- General quality improvement of skill structure

## Steps

### Step 1: Identify Target Skill

```
User provides skill name or path.
Read the skill's SKILL.md.
```

### Step 2: Run Quality Gate Checks

Check each item against `docs/skillsystem.md`:

| Check | Pass/Fail | Fix |
|-------|-----------|-----|
| **Name** | lowercase-hyphen, 1-64 chars | Rename directory |
| **Description** | Non-empty, max 1024 chars | Rewrite description |
| **USE WHEN** | Present in description | Add trigger clause |
| **No XML tags** | None in name/description | Remove any XML |
| **Body length** | SKILL.md under 500 lines | Split into workflows |
| **Scope boundary** | `NOT for:` section present | Add scope section |
| **Examples** | 2-3 concrete patterns | Add examples |
| **Flat structure** | Max 2 levels deep | Flatten nesting |
| **Workflow routing** | Table present | Add routing table |

### Step 3: Report Findings

```markdown
## Canonicalization Report: {skill-name}

### Checks
| Check | Status | Action Needed |
|-------|--------|---------------|
| [check] | ✓/✗ | [what to fix] |

### Passing: X/9
```

### Step 4: Apply Fixes

For each failing check, make the minimal fix:

1. **Missing USE WHEN:** Add trigger clause to description
2. **Missing scope:** Add `## Scope` section with `**NOT for:**` list
3. **Missing examples:** Add `## Examples` section with 2-3 patterns
4. **Wrong naming:** Rename files to lowercase-hyphen
5. **Deep nesting:** Flatten to max 2 levels
6. **No routing table:** Add `## Workflow Routing` table
7. **Too long:** Extract content to separate reference docs

### Step 5: Verify

Re-run all 9 checks. All must pass.

Output:
```markdown
## Canonicalization Complete: {skill-name}
All 9/9 checks passing.
Changes made:
- [list of changes]
```
