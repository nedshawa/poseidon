# API Key Handling Guide

**Lifecycle management for API keys and credentials.**

## The 6 Persistence Points

Secrets can leak through 6 channels. Poseidon protects all of them:

| Point | Risk | Protection |
|-------|------|-----------|
| **Screen** | Key visible in terminal | pre-prompt hook captures before display |
| **Logs** | Key logged in tool output | output-scrubber.ts redacts 5 patterns |
| **Git** | Key committed to repo | .gitignore + patterns.yaml blocks `echo $KEY` |
| **Context window** | Key in AI conversation | pre-prompt captures, injects "NEVER repeat" |
| **Bash history** | Key in shell history | Commands with keys not logged |
| **Tool arguments** | Key in Edit/Write tool calls | PreToolUse validates, scrubs if needed |

## Key Lifecycle

```
1. ONBOARD  → User pastes naturally, hook auto-captures
2. ENCRYPT  → age encryption to secrets.enc
3. STORE    → Never disk, only /dev/shm (RAM)
4. USE      → SecretClient.read() → decrypts to RAM → shreds after
5. ROTATE   → Re-paste to update (safe overwrite)
6. REVOKE   → Remove from secrets.enc, update registry
```

## What to Do When...

| Situation | Action |
|-----------|--------|
| Tool returns 401/403 | Check `security/secrets-registry.md` for key status |
| Need to add a new key | Tell user to paste it naturally in conversation |
| Key might be leaked | Check logs, scrub immediately, rotate key |
| Key stopped working | May be expired — ask user to paste new key |
| Key needed for new service | Check `security/services.yaml` for supported services |

## Output Scrubber Patterns

These patterns are automatically redacted from all tool output:

```
sk-ant-[a-zA-Z0-9\-]{20,}     → [REDACTED-ANTHROPIC]
sk-[a-zA-Z0-9]{20,}           → [REDACTED-OPENAI]
ghp_[a-zA-Z0-9]{36}           → [REDACTED-GITHUB]
AKIA[0-9A-Z]{16}              → [REDACTED-AWS]
Bearer [a-zA-Z0-9\-._~+/]+=* → [REDACTED-BEARER]
```
