# Claude Best Practices

Reference document for Claude Code best practices, features, and optimal usage patterns.

## Claude Code Architecture

### Core Concepts

- **CLAUDE.md:** Project instructions loaded at session start. Hierarchical: global (~/.claude/CLAUDE.md) → project (.claude/CLAUDE.md) → directory-level
- **Skills:** Self-activating capabilities with `USE WHEN` triggers. YAML frontmatter parsed at startup for routing
- **Hooks:** TypeScript/shell scripts triggered at lifecycle events (PreToolUse, PostToolUse, SessionStart, Stop)
- **Tools:** Built-in tool set (Read, Write, Edit, Bash, Glob, Grep, Agent, etc.)
- **MCP Servers:** External tool providers via Model Context Protocol

### Skill System Best Practices

1. **Description max 1024 chars** — Anthropic hard limit
2. **USE WHEN is mandatory** — Claude Code parses this for activation
3. **Intent matching, not string matching** — Use conceptual triggers
4. **TitleCase naming** — All directories, files, workflows
5. **Flat structure** — Max 2 levels deep
6. **Dynamic loading** — Keep SKILL.md minimal, load docs on demand
7. **Examples section required** — 2-3 concrete patterns improve selection accuracy 72% → 90%

### Hook System Best Practices

1. **PreToolUse hooks** — Must complete in <50ms to not block
2. **PostToolUse hooks** — Can be longer but should not block user flow
3. **Fire and forget for notifications** — Never let notification failure block execution
4. **Shared libraries** — Use `hooks/lib/` for common functions
5. **TypeScript for logic** — Richer than shell scripts, type-safe

### Agent Patterns

| Pattern | When to Use |
|---------|------------|
| **Single agent** | Simple task delegation, focused research |
| **Parallel agents** | Independent tasks that can run concurrently |
| **Background agents** | Non-blocking work, research while building |
| **Agent teams** | Complex multi-agent coordination with shared tasks |
| **Worktree isolation** | Parallel code changes that might conflict |
| **Competing hypotheses** | Debugging with multiple theories |
| **Writer/reviewer** | Quality assurance via role separation |

### Tool Usage Guidelines

| Tool | Use For | Never Use For |
|------|---------|--------------|
| Read | Reading file contents | (prefer over cat/head/tail) |
| Edit | Modifying existing files | Creating new files |
| Write | Creating new files | Modifying (use Edit) |
| Glob | Finding files by pattern | (prefer over find/ls) |
| Grep | Searching file contents | (prefer over grep/rg) |
| Bash | System commands, builds, tests | Reading/editing files |
| Agent | Complex multi-step delegation | Simple file searches |

### Context Management

1. **Read before modifying** — Always understand existing code first
2. **Parallel tool calls** — Make independent calls in same message
3. **Context compaction** — At phase transitions in long sessions
4. **Preserve critical info during compaction** — ISC status, key decisions, next actions
5. **Discard verbose tool output** — Raw search results, intermediate reasoning

### Prompt Engineering for Claude

1. **Be specific** — Vague prompts get vague results
2. **Provide examples** — Show desired input/output patterns
3. **Structure with XML tags** — Claude processes structured prompts better
4. **Use thinking blocks** — For complex reasoning tasks
5. **Separate instructions from data** — Clear boundary between what to do and what to process

## Claude Model Selection

| Model | Best For | Trade-off |
|-------|---------|-----------|
| **Opus 4.6** | Complex reasoning, architecture, multi-step | Slowest, most expensive, highest quality |
| **Sonnet 4.6** | General tasks, code generation, balanced | Good balance of speed and quality |
| **Haiku 4.5** | Simple tasks, classification, quick lookups | Fastest, cheapest, lower quality ceiling |

### When to Use Which Model

- **Opus:** Architecture decisions, complex debugging, multi-file refactors, deep analysis
- **Sonnet:** Most coding tasks, research synthesis, documentation, standard work
- **Haiku:** Classification, simple transformations, formatting, quick lookups

## Claude Code Configuration

### Key Settings

- `settings.json` — Global and project-level settings
- `permissions` — Tool allowlists and blocklists
- `hooks` — Lifecycle event handlers
- `env` — Environment variables for tools

### Performance Optimization

1. **Use /compact** — Manually compact context when it grows large
2. **Use /clear** — Reset context for unrelated tasks
3. **Prefer focused prompts** — Don't bundle unrelated requests
4. **Use tasks for tracking** — TaskCreate/TaskUpdate for progress
5. **Batch file reads** — Read multiple files in parallel when possible
