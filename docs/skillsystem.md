# Poseidon Skill System

**The specification for all Poseidon skills.**

## Naming Convention

Poseidon uses **lowercase-hyphen** naming (not TitleCase like PAI):

| Component | Example |
|-----------|---------|
| Skill directory | `research`, `cli-builder`, `content-analysis` |
| Workflow files | `create-skill.md`, `validate-skill.md` |
| Reference docs | `trait-guide.md`, `url-verification-protocol.md` |
| Tool files | `tier-classifier.ts`, `quality-scorer.ts` |
| YAML name | `name: research`, `name: skill-builder` |

**Exception:** `SKILL.md` is always uppercase (convention for the main skill file).

---

## SKILL.md Structure

### 1. YAML Frontmatter

```yaml
---
name: skill-name
description: >-
  What it does. Detailed description that includes USE WHEN trigger clause.
  USE WHEN trigger1, trigger2, trigger3, natural language triggers.
---
```

**Rules:**
- `name` uses **lowercase-hyphen**
- `description` can be multi-line with `>-` (YAML block scalar)
- `USE WHEN` keyword is **MANDATORY** (Claude Code parses this for skill activation)
- Use intent-based triggers with commas or natural language
- Max 1024 characters (Anthropic hard limit)
- No separate `triggers:` or `workflows:` arrays in YAML

### 2. Markdown Body

```markdown
# Skill Name

Brief description of what the skill does.

## Workflow Routing

| Request Pattern | Route To |
|---|---|
| Pattern description | `workflows/workflow-name.md` |

## Scope

**NOT for:**
- What this skill does NOT handle
- Where to go instead

## Examples

**Example 1: [Use case]**
```
User: "[request]"
→ Routes to workflow-name
→ [What happens]
→ [What user gets]
```
```

---

## Quality Gate (agentskills.io spec)

All skills must pass these checks:

1. **Name**: lowercase + hyphens only, 1-64 characters
2. **Description**: non-empty, max 1024 chars, includes "USE WHEN"
3. **No XML tags** in name or description
4. **Body**: SKILL.md under 500 lines (use workflows/ for depth)
5. **Scope boundary**: must include a "NOT for:" section
6. **Examples**: 2-3 concrete usage patterns (REQUIRED)
7. **References**: workflow files one level deep only

---

## Directory Structure

```
skill-name/
├── SKILL.md              # Main skill file (always uppercase)
├── trait-guide.md         # Reference docs in root (lowercase-hyphen)
├── examples.md            # Reference docs in root
├── workflows/             # Execution workflows
│   ├── create.md
│   └── validate.md
├── handlers/              # TypeScript handlers (optional)
│   ├── classifier.ts
│   └── scorer.ts
├── references/            # Reference data (optional)
│   └── example.yaml
└── data/                  # Data files (optional)
    └── traits.yaml
```

### Allowed Subdirectories

| Directory | Contents |
|-----------|----------|
| `workflows/` | Execution procedures only |
| `handlers/` | TypeScript automation scripts |
| `references/` | Reference data and schemas |
| `data/` | Configuration data files |

### Flat Structure Rule

**Maximum depth: 2 levels** — `skills/skill-name/category/file`

No deeper nesting. If you need subcategories, use compound names:
- ✅ `workflows/company-due-diligence.md`
- ❌ `workflows/company/due-diligence.md`

**Exception:** Security skill uses sub-skills (`security/recon/`, `security/web-assessment/`) because each is a distinct capability with its own SKILL.md.

---

## Dynamic Loading Pattern

Keep SKILL.md minimal (~30-50 lines routing), load additional docs on demand.

**SKILL.md contains:**
- ✅ YAML frontmatter with triggers
- ✅ Brief description
- ✅ Workflow routing table
- ✅ Quick reference
- ✅ Scope boundary (NOT for)
- ✅ Examples section

**Separate files contain:**
- Reference guides → `guide-name.md` in skill root
- API docs → `api-reference.md` in skill root
- Extended examples → `examples.md` in skill root
- Handler documentation → inline in handler files

**When to use:** Skills with SKILL.md > 100 lines should split into dynamic loading.

---

## Workflows vs References

### Workflows (`workflows/` directory)
**Action procedures** — step-by-step instructions for DOING something.
- Create, update, delete, deploy, sync operations
- Named with action verbs: `create-skill.md`, `validate-skill.md`

### References (skill root or `references/`)
**Information to read** — context, guides, specifications.
- Guides, schemas, examples, background context
- Named descriptively: `trait-guide.md`, `url-verification-protocol.md`

---

## Handlers (`handlers/` directory)

TypeScript automation scripts that provide programmatic capabilities:

```typescript
#!/usr/bin/env bun
// handler-name.ts — Brief description
// Called by: workflows/workflow-name.md
```

**Requirements:**
- TypeScript with `#!/usr/bin/env bun` shebang
- Support `--help` flag
- Use colored output for terminal feedback
- Handle errors gracefully with clear messages
- Expose configuration via CLI flags

---

## Canonicalization

**"Canonicalize a skill"** = restructure it to match this specification.

### Canonicalization Checklist

- [ ] Directory uses lowercase-hyphen naming
- [ ] SKILL.md has YAML frontmatter with `name` and `description`
- [ ] Description includes `USE WHEN` clause
- [ ] Description under 1024 characters
- [ ] Workflow routing table present
- [ ] Scope boundary (`NOT for:`) section present
- [ ] Examples section with 2-3 patterns
- [ ] No deep nesting beyond 2 levels
- [ ] Workflows contain only execution procedures
- [ ] Reference docs in skill root (not in workflows/)

### When to Canonicalize

- Skill missing `USE WHEN` in description
- Skill missing `NOT for:` scope boundary
- Skill missing Examples section
- Files using wrong naming convention
- Deep nesting beyond 2 levels

---

## Integration with Poseidon

### Skill Loading
- **Session start:** Only YAML frontmatter loads for routing
- **Skill invocation:** Full SKILL.md body loads
- **Workflow execution:** Workflow file loads when routed

### Project Scoping
Skills can be project-scoped — only available in specific project contexts.

### Effectiveness Tracking
Skill usage logged alongside other signals for learning system analysis.
