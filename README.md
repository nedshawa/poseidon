# Poseidon

Personal AI infrastructure for [Claude Code](https://claude.ai/code). Poseidon gives your AI persistent memory across sessions, learns from your corrections, isolates project context, and protects your secrets — all through a lightweight hook system with zero external dependencies.

## Key Features

- **Project-Scoped Memory** — Each project gets isolated context, goals, decisions, and rules. No cross-contamination between projects.
- **Mistake Learning** — Detects frustration signals and explicit corrections, proposes steering rules, and injects past mistakes as constraints to prevent recurrence.
- **Full-Spectrum Security** — PreToolUse validation on Bash, Edit, Write, and Read. Auto-scrubs API keys and tokens from output.
- **Zero-Infrastructure Secrets** — age encryption for secrets at rest. Decrypted to RAM only, never written to disk unencrypted. No Vault server required.
- **Configurable Personality** — Name your AI, set communication style, tune behavioral traits. Interactive installer gets you running in under 2 minutes.

## Quick Install

```bash
git clone https://github.com/nedshawa/poseidon.git
cd poseidon
bun tools/init.ts
```

The installer walks you through identity setup, mission definition, secret encryption, and optional project creation.

**Prerequisites:** [Bun](https://bun.sh) v1.0+ and [Claude Code](https://claude.ai/code). Optional: [age](https://age-encryption.org) for secret encryption.

## How It Works

Poseidon hooks into Claude Code's lifecycle events:

```
SessionStart    → Load mission, detect active project, rebuild CLAUDE.md
PromptSubmit    → Classify mode, load project context, inject past mistakes
PreToolUse      → Security validation on every tool call
Stop            → Capture feedback, detect frustration, update project state
SessionEnd      → Summarize session, propose rules, rebuild
```

Every prompt is classified into one of three modes:
- **MINIMAL** — Quick acknowledgments
- **NATIVE** — Single-step tasks
- **ALGORITHM** — Multi-step work using a 7-phase execution loop (Observe, Think, Plan, Build, Execute, Verify, Learn)

## Architecture

```
~/.poseidon/
├── CLAUDE.md.template     # Personality template (edit this)
├── settings.json          # All configuration
├── algorithm/             # 7-phase execution loop
├── hooks/                 # TypeScript lifecycle handlers
├── skills/                # Curated skill definitions
├── telos/                 # Your mission, goals, projects
├── memory/
│   ├── projects/          # Isolated per-project memory
│   ├── learning/          # Mistake tracking + rule generation
│   └── steering-rules.md  # Active behavioral rules
├── security/              # Tool validation patterns
└── tools/                 # CLI: init, rebuild, secret
```

See [docs/architecture.md](docs/architecture.md) for the full system overview.

## Usage

After installation, start Claude Code in any project directory. Poseidon loads automatically.

```bash
# Regenerate CLAUDE.md after editing settings or template
bun ~/.poseidon/tools/rebuild.ts

# Manage encrypted secrets
bun ~/.poseidon/tools/secret.ts write api/openai OPENAI_API_KEY=sk-...
bun ~/.poseidon/tools/secret.ts read api/openai OPENAI_API_KEY
```

## Contributing

1. Fork and clone the repository
2. Run `bun tools/init.ts` to set up a development instance
3. Make changes — all hooks are TypeScript in `hooks/`
4. Ensure hooks stay within their latency budgets (see [docs/architecture.md](docs/architecture.md))
5. Submit a PR

## License

MIT
