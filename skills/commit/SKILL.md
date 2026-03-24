---
name: commit
description: >-
  Generates conventional commit messages with scope detection from changed files.
  USE WHEN the user asks to commit, save changes, or create a git commit.
---

## Instructions

Create a conventional commit message by analyzing staged and unstaged changes.

### Step 1: Gather Context

Run these commands to understand the changes:
- `git status` to see all changed files
- `git diff --cached` to see staged changes
- `git diff` to see unstaged changes
- `git log --oneline -5` to match existing commit style

### Step 2: Detect Scope

Infer scope from the changed file paths:
- Files in `src/api/` or `routes/` -> scope: `api`
- Files in `src/components/` or `ui/` -> scope: `ui`
- Files in `tests/` or `__tests__/` -> scope: `tests`
- Files in `docs/` -> scope: `docs`
- Config files (package.json, tsconfig, etc.) -> scope: `config`
- Multiple directories -> pick the primary area of change

### Step 3: Determine Type

Select the commit type:
- `feat`: new feature or capability
- `fix`: bug fix
- `refactor`: code change that neither fixes nor adds
- `docs`: documentation only
- `test`: adding or updating tests
- `chore`: maintenance, dependencies, config
- `perf`: performance improvement
- `style`: formatting, whitespace, semicolons

### Step 4: Write the Message

Format: `type(scope): description`

Rules:
- Subject line under 72 characters
- Imperative mood ("add" not "added")
- No period at end of subject
- Body explains WHY, not WHAT (the diff shows what)
- Add blank line between subject and body if body exists

### Step 5: Add Co-Author

Append to every commit message:
```
Co-Authored-By: Claude <noreply@anthropic.com>
```

### Step 6: Stage and Commit

- Stage relevant files by name (avoid `git add .` unless appropriate)
- Create the commit using a heredoc for the message
- Run `git status` after to verify success

## Scope

NOT for:
- Amending previous commits (unless explicitly asked)
- Force pushing to remote
- Interactive rebasing
- Committing files containing secrets (.env, credentials)
