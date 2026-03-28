# Secret Management Guide

**How Poseidon manages API keys, tokens, and credentials.**

## Architecture

```
User pastes key in conversation
    ↓
pre-prompt.ts auto-detects (pattern match)
    ↓
Encrypted via age → secrets.enc
    ↓
secrets-registry.md updated (marked active)
    ↓
Available to all projects via SecretClient
```

## How to Add a Secret

**Method 1: Natural paste (recommended)**
Just paste the key in conversation:
```
"here's my Perplexity key: pplx-abc123..."
```
The pre-prompt hook auto-detects, encrypts, and stores it. You'll see a `🔐 SECRET AUTO-CAPTURED` confirmation.

**Method 2: CLI tool**
```bash
bun tools/secret.ts write perplexity api_key=pplx-abc123...
```

**Method 3: Installer**
```bash
bun tools/init.ts  → Choose "Add/update API keys only"
```

## How to Read a Secret

```typescript
// In any handler or tool
import { SecretClient } from "./hooks/handlers/secret-client";
const key = await SecretClient.read("perplexity", "api_key");
```

```bash
# CLI
bun tools/secret.ts read perplexity api_key
bun tools/secret.ts list
```

## Detected Patterns

The pre-prompt hook detects these patterns:
| Pattern | Service |
|---------|---------|
| `sk-ant-*` | Anthropic |
| `sk-*` (20+ chars) | OpenAI |
| `ghp_*` | GitHub |
| `pplx-*` | Perplexity |
| `AKIA*` | AWS |
| `xoxb-*` | Slack |
| 32+ alphanumeric + service keyword | Auto-detect |

## Storage

| File | Purpose |
|------|---------|
| `secrets.enc` | age-encrypted secret store |
| `~/.config/poseidon/age-key.txt` | Encryption key (NEVER share) |
| `security/secrets-registry.md` | What's configured (no actual keys) |
| `security/services.yaml` | Service definitions |

## Best Practices

1. **Never hardcode keys** in code, prompts, or docs
2. **Never log keys** — output scrubber catches sk-*, ghp_*, AKIA*, Bearer
3. **Keys are universal** — all projects access the same SecretClient
4. **One source of truth** — secrets.enc is the canonical store
5. **Rotate regularly** — re-paste to update (overwrite is safe)
6. **Check registry** — `security/secrets-registry.md` shows what's active
7. **If 401/403 error** — check if the key is configured before stopping

## Secret Lifecycle

```
Add → secrets.enc (encrypted at rest)
Use → /dev/shm (decrypted to RAM only)
Done → shred (secure delete from RAM)
Never → disk, logs, git, output, context window
```
