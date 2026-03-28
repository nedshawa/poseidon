# Tool Safety Guide

**Safe patterns for Bash, Edit, Write, and Read operations.**

## Security Tiers

| Tier | Action | Example |
|------|--------|---------|
| **BLOCK** | Hard stop, exit(2) | `rm -rf /`, fork bomb, `mkfs`, secret exfiltration |
| **CONFIRM** | Ask user for approval | `git push --force`, `DROP TABLE`, `systemctl stop` |
| **ALERT** | Log and allow | `sudo`, `npm publish`, `ssh` |
| **ALLOW** | Proceed silently | `git status`, `ls`, `cat` |

## Hardcoded Blocks (Always Active)

Even without patterns.yaml, these are ALWAYS blocked:
- `rm -rf /` — filesystem destruction
- `:(){ :|:& };:` — fork bomb
- `mkfs.` — filesystem format
- `dd if=/dev/(zero|random) of=/dev/sd` — disk overwrite
- `chmod 777` — world-writable permissions
- `echo $*_KEY` / `cat .vault-token` — secret exposure
- `curl -d $*_KEY` — secret exfiltration

## Path Restrictions

| Category | Paths | Action |
|----------|-------|--------|
| **Zero Access** | ~/.ssh/id_*, ~/.gnupg/private*, ~/.aws/credentials, age-key.txt | BLOCK |
| **Read Only** | /etc/passwd, /etc/shadow, /etc/sudoers | BLOCK write/edit |
| **Confirm Write** | ~/.bashrc, ~/.zshrc, settings.json | ASK user |
| **No Delete** | telos/*, project GOALS.md, project DECISIONS.md | BLOCK delete |

## Safe Patterns for Agents

When spawning agents (Task/Agent tool):
1. **agent-guard.ts** checks for prompt injection patterns
2. Blocks: "ignore previous instructions", "disregard", "system prompt"
3. Validates subagent_type is a known Claude Code type

When invoking skills:
1. **skill-guard.ts** verifies skill directory exists
2. Blocks: known false-positive skills (position bias)

## Best Practices

1. **Read before modify** — always understand code/files before changing
2. **Ask before destructive** — never assume permission for irreversible operations
3. **One change when debugging** — isolate, verify, proceed
4. **Validate paths** — check file exists before operating on it
5. **Never pipe from internet to shell** — `curl | bash` is always blocked
6. **Log every security event** — all PreToolUse decisions go to audit.jsonl
