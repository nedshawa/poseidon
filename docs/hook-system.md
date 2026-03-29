# Hook System

Poseidon uses 6 lifecycle hooks backed by 25 handler modules. Hooks are the orchestration layer; handlers provide reusable logic. All hooks are TypeScript, async, and fail-graceful — a broken hook never blocks Claude Code.

## Event Lifecycle

```
SessionStart ──> session-start.ts     (load project, rebuild context)
UserPromptSubmit ──> pre-prompt.ts    (classify mode, inject mistakes)
PreToolUse ──> pre-tool.ts            (security validation on all tools)
Stop ──> post-response.ts             (sentiment capture, learning)
SessionEnd ──> session-end.ts         (summarize, propose rules, cleanup)
```

## Latency Budgets

| Hook | Event | Budget | Purpose |
|------|-------|--------|---------|
| session-start.ts | SessionStart | <200ms | Project detection, TELOS load, CLAUDE.md rebuild |
| pre-prompt.ts | UserPromptSubmit | <100ms | Mode classification, context injection, mistake injection |
| pre-tool.ts | PreToolUse | <50ms | Security pattern matching on Bash, Edit, Write, Read |
| post-response.ts | Stop | <300ms | Sentiment analysis, learning pipeline, project state update |
| session-end.ts | SessionEnd | <500ms | Session summary, rule candidates, stale work cleanup |

Total per-prompt overhead target: under 150ms.

## Handlers

Handlers live in `hooks/handlers/` and are imported by hooks as needed.

| Handler | Purpose |
|---------|---------|
| complexity-scorer.ts | Scores task complexity to select effort tier and mode |
| mistake-injector.ts | Injects past failure context as constraints into prompts |
| output-scrubber.ts | Strips API keys, tokens, and secrets from responses |
| secret-client.ts | Decrypts and provides secrets from age-encrypted store |
| error-fingerprint.ts | Deduplicates errors by generating stable fingerprints |
| learning-metrics.ts | Tracks learning pipeline health (rule adoption, signal rates) |
| rule-scorer.ts | Scores and ranks steering rule candidates by evidence weight |
| thinking-tracker.ts | Monitors algorithm phase transitions and thinking depth |
| regime-runner.ts | Core enforcement engine for the governance regime system |
| agent-guard.ts | Validates subagent types and blocks injection patterns |
| skill-guard.ts | Validates skill names exist before invocation |
| data-source-router.ts | Routes data requests via cost-tier fallback chains |
| manifest-loader.ts | Loads and caches poseidon-manifest.yaml capabilities |
| skill-discovery.ts | 3-tier skill matching (universal/product/project) |
| preferences-loader.ts | Loads project-level skill preferences |
| doc-integrity.ts | Deterministic document integrity checker |
| drift-detection.ts | Detects behavioral drift in long sessions |
| prd-sync.ts | Syncs PRD frontmatter to work.json state |
| security-audit.ts | Logs all security events to audit JSONL |
| session-auto-name.ts | Auto-generates session names from first prompt |
| source-auto-indexer.ts | Auto-identifies new API keys via patterns |
| terminal-state.ts | Kitty terminal tab color management |
| voice-completion.ts | Voice notification on response completion |
| work-completion.ts | Captures work completion reflections |
| relationship-memory.ts | Extracts relationship notes from sessions |

Additionally, `error-capture.ts` at the hooks root provides shared error handling and graceful failure logging across all hooks.

## Configuration

Hooks are registered in `settings.json` under the `hooks` section. Each entry maps a Claude Code event to a hook file path with optional environment variables and timeout overrides.

## Key Principles

1. **Hooks orchestrate, handlers compute.** A hook file wires together handler calls for its lifecycle event. Handlers are stateless functions.
2. **Fail graceful.** Every hook wraps its body in try/catch. Errors are logged to `logs/` but never surfaced to the user or Claude Code.
3. **Stdin/stdout JSON.** Hooks communicate with Claude Code through JSON on stdin (event payload) and stdout (response directives).
4. **No side effects on USER files.** Hooks may only write to SYSTEM and MIXED ownership boundaries (see memory-system.md).
5. **Idempotent.** Running the same hook twice with the same input produces the same result.
