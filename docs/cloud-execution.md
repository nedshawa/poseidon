# Cloud Execution Architecture

**Status:** Architecture spec only. Implementation deferred per zero-dependency principle.

## Overview

Poseidon's cloud execution follows the Actions/Pipelines pattern — each action is a standalone unit that does one thing, pipelines chain actions together.

## Architecture Pattern

```
┌──────────────────────────────────────────────────────┐
│              POSEIDON EXECUTION LAYER                  │
│                                                       │
│  LOCAL                         CLOUD (future)         │
│  ─────                         ──────────────         │
│  bun tools/action-runner.ts    Cloudflare Workers     │
│  --action ACTION_NAME          poseidon-a-action-name │
│  --input {...}                 .workers.dev            │
│                                                       │
│  Same action logic.            Each action = 1 Worker │
│  JSON stdin/stdout.            Bearer token auth.     │
│                                                       │
│  Pipe model: output of action N → input of action N+1 │
└──────────────────────────────────────────────────────┘
```

## Action Definition

An action is a TypeScript file that:
1. Reads JSON from stdin
2. Performs one operation
3. Writes JSON to stdout

```typescript
// actions/label-content.ts
const input = JSON.parse(await Bun.stdin.text());
const result = await processContent(input);
console.log(JSON.stringify(result));
```

## Pipeline Definition

A pipeline chains actions sequentially:

```yaml
# pipelines/process-and-rate.yaml
name: process-and-rate
actions:
  - label-content
  - rate-quality
  - store-result
```

## When to Implement

Cloud execution should be added when Poseidon needs:
- Scheduled tasks (cron-triggered AI operations)
- Webhook receivers (external events triggering AI work)
- Remote agents (AI operations running away from the local machine)
- Multi-user collaboration (shared AI infrastructure)

Until then, local execution via `bun` is sufficient and maintains the zero-dependency principle.

## Reference Implementation

PAI's Arbol system (Cloudflare Workers) serves as the reference:
- Actions as individual Workers (V8 isolates for LLM, Docker sandboxes for shell)
- Pipelines as Workers with service bindings (zero-hop internal calls)
- Bearer token auth with defense in depth
- Factory pattern: `createActionWorker()` eliminates boilerplate
