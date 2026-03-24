# Getting Started with Poseidon

## Prerequisites

- [Claude Code](https://claude.ai/code) installed and working
- [Bun](https://bun.sh) runtime (v1.0+)
- Optional: [age](https://age-encryption.org) for secret encryption

## Installation

```bash
git clone https://github.com/nedshawa/poseidon.git
cd poseidon
bun tools/init.ts
```

The installer walks you through five steps:

### Step 1: Identity

Choose your AI's name, enter yours, and pick a communication style (direct, friendly, formal, or casual). These get baked into `settings.json` and interpolated into CLAUDE.md at build time.

### Step 2: Mission (TELOS)

Define what you're working toward and your top goals. These go into `telos/MISSION.md` and `telos/GOALS.md` — loaded every session so your AI knows your direction.

### Step 3: Secret Encryption

If `age` is installed, the wizard generates a key pair and creates an empty encrypted secrets file. Secrets are decrypted to RAM only (`/dev/shm/`), never written to disk unencrypted. If age isn't installed, the wizard prints install instructions and skips ahead.

### Step 4: First Project (optional)

Create your first project with a name and description. This sets up isolated memory under `memory/projects/{slug}/` with context, goals, decisions, and rules files.

### Step 5: Build

The installer copies all system files to your install location (default: `~/.poseidon/`), generates `CLAUDE.md` from the template, and prints next steps.

## Using Poseidon

Once installed, start Claude Code in any project directory. Poseidon loads automatically through the hooks configured in `settings.json`.

Every prompt is classified into one of three modes:
- **MINIMAL** — Greetings, acknowledgments, quick answers
- **NATIVE** — Single-step tasks, lookups, simple work
- **ALGORITHM** — Multi-step complex work (triggers the 7-phase loop)

## Project Management

Projects are first-class citizens with isolated memory:

```
memory/projects/{project-id}/
  META.yaml       # Name, status, created, tags
  CONTEXT.md      # Current state (auto-updated each session)
  GOALS.md        # What this project is trying to achieve
  DECISIONS.md    # Architectural decision records
  RULES.md        # Project-specific steering rules
  knowledge/      # Specs, research, reference docs
  sessions/       # Links to work sessions
```

To create a new project, add a directory under `memory/projects/` following the template in `memory/projects/.template/`.

## Learning System

Poseidon learns from your corrections through a semi-autonomous loop:

1. **Detection** — Frustration patterns in your messages (e.g., "no, that's not...", "you forgot...") or explicit corrections trigger failure capture
2. **Analysis** — Failures are classified by type and severity, stored in `memory/learning/failures/`
3. **Rule proposal** — Major failures generate rule candidates in `memory/learning/candidates/`
4. **Approval** — You approve or reject proposed rules
5. **Injection** — Approved rules are loaded before each prompt, preventing the same mistake twice

## Security

### Secret Management (age encryption)

```bash
bun tools/secret.ts write api/openai OPENAI_API_KEY=sk-...
bun tools/secret.ts read api/openai OPENAI_API_KEY
bun tools/secret.ts list
```

Secrets are always encrypted on disk. When needed, they're decrypted to RAM-backed storage (`/dev/shm/`), used, then shredded.

### Tool Security

Every tool invocation (Bash, Edit, Write, Read) passes through `pre-tool.ts`:
- **Blocked** — Catastrophic commands (rm -rf /, fork bombs, secret exposure)
- **Confirm** — Destructive commands (force push, hard reset, DROP TABLE)
- **Scrubbed** — API keys, tokens, and secrets are redacted from all output

## Configuration

Edit `settings.json` to change identity, traits, or behavior. After changes, rebuild:

```bash
bun tools/rebuild.ts
```

This regenerates `CLAUDE.md` from `CLAUDE.md.template` with your current settings and steering rules. Never edit `CLAUDE.md` directly — it's generated output.
