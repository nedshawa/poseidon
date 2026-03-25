# Poseidon

Personal AI infrastructure for [Claude Code](https://claude.ai/code). Poseidon gives your AI persistent memory, learns from every mistake, isolates project context, protects your secrets, and connects via multiple channels — all through a lightweight hook system.

## Key Features

- **Project-Scoped Memory** — Each project gets isolated context, goals, decisions, and rules. No cross-contamination.
- **Smart Mode Escalation** — 11-signal complexity scorer auto-detects when to use the Algorithm. Learns from your usage patterns.
- **Error Intelligence** — Every tool error fingerprinted, deduplicated, and tracked. Learning Score shows how much smarter your AI has gotten.
- **Pre-Prompt Mistake Injection** — Past mistakes injected as constraints before similar future tasks. Never make the same mistake twice.
- **Full-Spectrum Security** — PreToolUse validation on Bash, Edit, Write, and Read. Auto-scrubs secrets from output.
- **Multi-Channel** — Terminal + Telegram + Discord + Voice (ElevenLabs). systemd service for 24/7 availability.
- **18 Skills** — Thinking (7 modes), Research (4 tiers), Security (4 sub-skills), Agents, Content Analysis, Documents, Browser, CLI Builder, Evals, and more.
- **Configurable Everything** — Name, personality, channels, error scope, thresholds — all via settings.json or the installer.

## Quick Install

```bash
git clone https://github.com/nedshawa/poseidon.git
cd poseidon
bun tools/init.ts
```

The installer checks prerequisites (bun, git, claude-code, age), walks you through identity, mission, secrets, channels, and project setup.

## How It Works

```
SessionStart    → Load mission, project, steering rules, show Learning Score
PromptSubmit    → Complexity scoring (11 signals), auto-escalation, mistake injection
PreToolUse      → Security validation on every tool call
PostToolUse     → Error capture, fingerprinting, classification
Stop            → Frustration detection, ratings, project state update
SessionEnd      → Rule candidates, abandonment detection, CLAUDE.md rebuild
```

Three modes, auto-classified:
- **MINIMAL** — Greetings, ratings, acknowledgments
- **NATIVE** — Simple tasks, quick questions
- **ALGORITHM** — Complex work via 7-phase loop (Observe → Think → Plan → Build → Execute → Verify → Learn)

## Skills (18)

| Category | Skills | Highlights |
|----------|--------|-----------|
| **Thinking** | first-principles, red-team, council, creative, science, world-model, iterative-depth | 7 reasoning modes with chaining |
| **Research** | quick, standard, extensive, deep-investigation | 4-tier with auto-classification and citation verification |
| **Security** | recon, web-assessment, prompt-injection, monitoring | Project-scoped scanning, CVE watching |
| **Code** | commit, code-review, debug, refactor, test | Development lifecycle |
| **Content** | extract-wisdom, summarize, action-items, structured-extract, deep-analysis | 5 extraction modes |
| **Utilities** | documents, browser, cli-builder, skill-builder, evals | PDF/DOCX, Playwright, CLI gen, self-building skills |
| **Meta** | agents, project-init, deploy, document | Composable agents, project management |

## Architecture

```
~/.poseidon/
├── CLAUDE.md.template        # Personality (edit this)
├── settings.json             # All configuration
├── algorithm/                # 7-phase execution loop
├── hooks/                    # 6 lifecycle hooks + 9 handler modules
│   ├── handlers/
│   │   ├── complexity-scorer.ts    # 11-signal mode classifier
│   │   ├── error-fingerprint.ts    # Error deduplication
│   │   ├── learning-metrics.ts     # Learning Score computation
│   │   ├── rule-scorer.ts          # Top-5 relevance injection
│   │   ├── mistake-injector.ts     # Past mistakes → constraints
│   │   ├── secret-client.ts        # age encryption
│   │   └── output-scrubber.ts      # Secret redaction
│   └── lib/                        # Shared utilities
├── skills/                   # 18 skills with workflows
├── telos/                    # Mission, goals, projects
├── memory/
│   ├── projects/             # Isolated per-project memory
│   └── learning/             # Errors, rules, metrics, signals
├── security/                 # Patterns for tool validation + error classification
└── tools/                    # CLI: init, rebuild, secret, channels, validate, learning-status
```

## Multi-Channel

```bash
# Start with Telegram + Discord in persistent tmux
bash ~/.poseidon/tools/start.sh

# Or as a systemd service
cp tools/poseidon.service ~/.config/systemd/user/
systemctl --user enable --now poseidon
```

See [docs/channels/](docs/channels/) for setup guides.

## Learning Score

Displayed at every session start:
```
📊 Learning Score: 73/100 (↑4 from last week)
   Errors prevented: 84%  |  Rules active: 12  |  Coverage: 71%
```

Check detailed metrics: `bun ~/.poseidon/tools/learning-status.ts`

## Contributing

1. Fork and clone
2. `bun tools/init.ts` for dev instance
3. All hooks are TypeScript in `hooks/`
4. Run `bun tools/validate.ts` before submitting
5. Submit a PR

## License

MIT
