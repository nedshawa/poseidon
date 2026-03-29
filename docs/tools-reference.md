# Tools Reference

All tools live in `~/.poseidon/tools/` and are invoked with `bun tools/{name}`. Each tool is self-contained with no external dependencies beyond Bun built-ins.

## Installation

| Tool | Description |
|------|-------------|
| `init.ts` | Interactive installer. Creates ~/.poseidon/, scaffolds directories, generates initial settings.json and CLAUDE.md. |
| `setup.ts` | Post-install configuration. Wires hooks into Claude Code, sets up age encryption keys, validates environment. |

## Configuration

| Tool | Description |
|------|-------------|
| `rebuild.ts` | Regenerates CLAUDE.md from template, project memory, steering rules, and algorithm. Safe to run anytime. |
| `secret.ts` | Manages age-encrypted secrets. Subcommands: `set`, `get`, `list`, `delete`. Decrypts to RAM only. |
| `validate.ts` | Validates settings.json schema, hook registration, directory structure, and security patterns. |
| `wire-hooks.ts` | Registers Poseidon hooks with Claude Code's settings. Run after install or hook changes. |

## Management

| Tool | Description |
|------|-------------|
| `learning-status.ts` | Shows learning pipeline health: pending candidates, approved rules, signal counts, failure backlog. |
| `mine-reflections.ts` | Extracts patterns from algorithm-reflections.jsonl. Surfaces recurring mistakes and proposes rule candidates. |
| `upgrade-algorithm.ts` | Algorithm version management. Subcommands: `status`, `create v{N}`, `rollback`, `diff`. |
| `dashboard.ts` | TUI dashboard showing active projects, session status, learning metrics, and system health. |

## CLI Wrapper

| Tool | Description |
|------|-------------|
| `poseidon.ts` | Primary CLI entry point. Wraps LLM invocation with project detection, hook loading, and context injection. |
| `poseidon-ipc.ts` | IPC server for inter-session coordination, lock management, and background agent status. |

## Utilities

| Tool | Description |
|------|-------------|
| `channels.ts` | Manages notification channels (voice, desktop, webhook). Configure routing per event severity. |
| `onboard.ts` | Guided onboarding for new users. Walks through identity setup, project creation, and first session. |
| `llm-registry.ts` | Registers and configures LLM backends (claude, gemini, codex, ollama). Manages API keys and model preferences. |
| `port-skill.ts` | Ports a skill from PAI format to Poseidon format. Adapts paths, naming conventions, and handler references. |
| `banner.ts` | Prints the Poseidon ASCII banner with version, active project, and system status. |

## Governance

| Tool | Description |
|------|-------------|
| `regime-check.ts` | On-demand regime compliance checker. Runs all enabled regimes against all projects. Supports --regime, --project, --json flags. |
| `doc-freshness.ts` | Checks documentation freshness and generates version bumps + CHANGELOG entries. |
| `manifest.ts` | Manages poseidon-manifest.yaml — enable/disable services, check consistency. |
| `synthesize-learning.ts` | Aggregates weekly learning patterns from failure dumps and rule effectiveness. |

## Shell Scripts

| Script | Description |
|--------|-------------|
| `start.sh` | Starts Poseidon in the current terminal. Initializes IPC, loads project context, launches the LLM wrapper. |
| `start-systemd.sh` | Systemd-compatible startup script. Used by poseidon.service for 24/7 daemon mode. |
| `statusline.sh` | Shell/tmux status bar segment. Shows active project, session count, algorithm version, and health indicator. |
