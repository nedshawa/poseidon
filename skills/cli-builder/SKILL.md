---
name: cli-builder
description: >-
  Generates TypeScript CLI tools with argument parsing, help text, and structured
  output. Creates production-ready command-line interfaces from specifications.
  USE WHEN create CLI, build CLI, command-line tool, wrap API, TypeScript CLI,
  add command, CLI tool.
---

## Instructions

Generate TypeScript CLI tools that are production-ready from the start.

### Workflow Routing

| Request                          | Workflow      |
|----------------------------------|---------------|
| Create a new CLI from scratch    | create-cli    |
| Add command to existing CLI      | add-command   |
| Upgrade CLI sophistication       | upgrade-tier  |

### Tier System

Every CLI fits one of three tiers. Start at the lowest tier that meets requirements.

| Tier     | When                        | Framework        | Complexity    |
|----------|-----------------------------|------------------|---------------|
| Basic    | 1-3 commands, no deps       | `process.argv`   | ~100-200 lines |
| Standard | 4-10 commands, arg parsing  | Commander.js     | ~300-500 lines |
| Advanced | 10+ commands, config/plugins| oclif            | 500+ lines    |

**Default to Basic.** Most CLIs do not need a framework.

### What Every CLI Includes

1. **Entry point** with shebang (`#!/usr/bin/env bun`)
2. **Argument parsing** appropriate to tier
3. **Help text** via `--help` flag
4. **JSON output** via `--json` flag for scripted use
5. **Error handling** with meaningful messages and correct exit codes
6. **TypeScript types** for all inputs and outputs

### Technology Stack

Bun runtime, TypeScript strict mode, `bun test` for testing.

### Generated Structure

```
cli-name/
├── cli-name.ts        # Main entry point
├── package.json       # Bun configuration
├── tsconfig.json      # Strict TypeScript
├── README.md          # Usage and examples
└── cli-name.test.ts   # Tests
```

### Quality Gates

Before delivering a CLI, verify:
- [ ] TypeScript compiles with zero errors
- [ ] `--help` shows all commands and options
- [ ] `--json` produces parseable JSON output
- [ ] Error cases return exit code 1 with helpful messages
- [ ] README documents all commands with examples

### Rules

- Start with the simplest tier that works — upgrade only when needed
- Every command must have a `--json` output option
- Error messages must include what went wrong AND how to fix it
- No `any` types unless justified with a comment
- Tests must cover the happy path and at least one error path per command

## Scope

NOT for:
- GUI applications or TUI frameworks
- Shell scripts or non-TypeScript CLIs
- Package publishing workflows
