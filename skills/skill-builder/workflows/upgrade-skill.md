# Upgrade Skill

Improves an existing skill to better meet quality standards and reduce scope overlap.

## Inputs

- **Skill path**: path to the skill directory
- **Other skills path** (optional): path to skills/ directory for overlap detection

## Procedure

### Step 1: Validate current state

Run [validate-skill](validate-skill.md) on the skill. Record which checks pass and fail.

### Step 2: Identify improvements

Review the skill for these common issues:

**Structural issues:**
- Missing or weak "NOT for:" section (fewer than 2 items)
- SKILL.md over 500 lines (move content to workflows/)
- Missing workflow files referenced in SKILL.md

**Description issues:**
- Missing "USE WHEN" trigger phrases
- Too vague (does not explain what the skill actually does)
- Imperative voice instead of third person

**Scope issues:**
- Overlapping capabilities with sibling skills (if other skills path provided)
- Too broad (trying to do too many things)
- Too narrow (should be merged with another skill)

### Step 3: Present recommendations

List each finding with:
- **Issue**: what is wrong
- **Severity**: high (blocks quality gate) / medium (hurts usability) / low (polish)
- **Fix**: specific change to make

Ask the user which changes to apply.

### Step 4: Apply approved changes

Make the changes to SKILL.md and any workflow files.

### Step 5: Re-validate

Run [validate-skill](validate-skill.md) again. Confirm all checks now pass.
Report the before/after comparison.

## Output

Updated skill files that pass all quality gates, with a summary of changes made.
