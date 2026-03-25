---
project: Poseidon
type: plan
status: approved
started: "2026-03-24"
target: "2026-04-24"
owner: Ned Shawa
---

# Project Poseidon — Personal AI Infrastructure for Everyone

## What This Is

Poseidon is a distributable, project-centric personal AI infrastructure built on Claude Code. It takes PAI v4.0.3's proven patterns and adds five genuine architectural improvements that PAI lacks.

**Poseidon is NOT a fork of PAI.** It's a new system that inherits PAI's proven principles and adds innovations where PAI has real gaps.

---

## The Six Genuine Improvements Over PAI

These are the areas where Poseidon architecturally differs from PAI. Everything else is inherited.

### 1. Project-Centric Memory (PAI Gap: Session-Scattered Context)

**PAI's problem:** Memory lives in `MEMORY/WORK/{timestamp}_{slug}/`. Project context scatters across dozens of session folders. Reconstructing "what do I know about Project X" requires scanning multiple PRDs, transcripts, and memory entries.

**Poseidon's fix:** Projects are first-class citizens with isolated memory.

```
memory/projects/{project-id}/
├── META.yaml              # Name, status, created, tags
├── CONTEXT.md             # Compressed current state (auto-updated each session)
├── GOALS.md               # What this project is trying to achieve
├── DECISIONS.md            # ADR log — every architectural decision with rationale
├── RULES.md               # Project-specific steering rules
├── knowledge/             # Specs, research, decisions
└── sessions/              # Symlinks to work sessions for this project
```

**Strict isolation rules:**
- Switching projects switches ALL loaded context
- Subagents receive only the active project's artifacts
- Global memory (TELOS, steering rules) is read-only during project work
- No cross-project contamination — structurally prevented
- Project association at prompt time: explicit flag > active project > cwd match > keyword match > recent continuation > none

**What PAI keeps that Poseidon inherits:**
- PRD.md as single source of truth per work session
- ISC with verification methods
- MEMORY/WORK/ structure for session artifacts (now symlinked from project)

### 2. Pre-Prompt Mistake Injection (PAI Gap: Reactive-Only Learning)

**PAI's problem:** Learning is reactive — waits for user to rate 1-10, then captures context. Past mistakes are stored but never pre-loaded as constraints on future work.

**Poseidon's fix:** Semi-autonomous learning loop that closes the feedback cycle.

```
Error Detection (3 layers, runs automatically):
  L1: Structural validators (format, entity, constraint checks)
  L2: Frustration detection (implicit signals from user messages)
  L3: Explicit ratings (user rates or corrects)

When failure detected:
  → Classify: {wrong_output | format_error | missing_entity | constraint_violation}
  → Severity: {minor | major | critical}
  → If major+ OR pattern (seen 2+ times):
      → Create memory/learning/failures/{timestamp}/
          ERROR_ANALYSIS.md   — what failed, which layer caught it
          RULE_CANDIDATE.md   — proposed new steering rule
      → Present to user: "I detected this pattern — add this rule?"
      → User approves → rule deployed into steering rules on next rebuild

Pre-prompt injection (the key innovation):
  UserPromptSubmit hook queries mistake library
  → Injects: "In the past, when doing X, avoid Y because Z"
  → Past mistakes become pre-loaded constraints, preventing recurrence
```

**Frustration detection patterns:**
- "No, that's not..." / "You forgot..." / "Why did you..." / immediate retry
- Corrections without explicit rating → implicit signal of 2/10

**What PAI keeps that Poseidon inherits:**
- ratings.jsonl as single source of truth for all feedback signals
- Failure context dumps (CONTEXT.md + transcript.jsonl + sentiment.json)
- Learning synthesis (weekly pattern aggregation)

### 3. PreToolUse Security on ALL Tools (PAI Gap: Bash-Only Coverage)

**PAI's problem:** SecurityValidator only covers Bash commands. An agent could `Edit` a secret into a file, `Write` credentials to a committed path, or `Read` sensitive files without triggering security hooks.

**Poseidon's fix:** PreToolUse validation covers Bash + Edit + Write + Read.

**HARD BLOCK (exit 2 — tool never executes):**
- Bash: `rm -rf /`, `chmod 777`, `mkfs`, `dd of=/dev/sd`, fork bombs
- Bash: printing secrets: `echo $VAULT_TOKEN`, `cat .vault-token`
- Bash: sending secrets: `curl -d $SECRET`, `curl -H Authorization $TOKEN`
- Edit/Write: writing known secret patterns into files
- Read: reading files matching secret patterns (.vault-token, age-key.txt, secrets.enc)

**CONFIRM (user must approve):**
- `git push --force`, `git reset --hard`, `git clean -fd`
- `rm -rf ~`, `DROP TABLE/DATABASE`
- `systemctl stop/disable`, `reboot/shutdown`

**Auto-scrubbing on ALL tool output:**
```
sk-[a-zA-Z0-9]{20,}                  → [REDACTED-OPENAI]
sk-ant-[a-zA-Z0-9\-]{20,}            → [REDACTED-ANTHROPIC]
ghp_[a-zA-Z0-9]{36}                  → [REDACTED-GITHUB]
AKIA[0-9A-Z]{16}                     → [REDACTED-AWS]
Bearer [a-zA-Z0-9\-._~+/]+=*        → [REDACTED-BEARER]
```

### 4. Secret Management via age Encryption (PAI Gap: Infrastructure Dependency)

**PAI's problem:** Secrets require HashiCorp Vault — a production-grade server that most individuals don't run. No Vault = no secret management.

**Poseidon's fix:** Zero-infrastructure secret management with `age` encryption.

```
secrets.enc                    ← Always encrypted on disk (age encryption)
  │
  ├── Agent needs a secret
  │   → Decrypt to /dev/shm/secrets.json (RAM-backed, never disk)
  │   → Extract the one key needed
  │   → Pass to tool as env var or stdin (never as CLI argument)
  │   → shred -u /dev/shm/secrets.json
  │   → Secret gone from RAM
  │
  └── User needs to add/change a secret
      → Decrypt to /dev/shm/ (RAM)
      → Edit in memory
      → Re-encrypt to secrets.enc
      → shred -u the decrypted copy
```

**SecretClient interface (pluggable):**
```typescript
interface SecretClient {
  read(path: string, field: string): Promise<string>;
  write(path: string, data: Record<string, string>): Promise<void>;
  list(path: string): Promise<string[]>;
}

// Default: EncryptedFileBackend (age)
// Optional: VaultBackend, OnePasswordBackend, BitwardenBackend
```

**The six persistence points where secrets must NEVER appear:**
1. Screen/terminal — SecurityValidator blocks echo/cat/print of secret patterns
2. Log files — output scrubbing regex on all tool output before logging
3. Git history — gitleaks pre-commit hook + .gitignore
4. Context window — never inject secret VALUES, only Vault PATHS
5. Bash history — HISTCONTROL=ignoreboth + HISTIGNORE
6. Tool arguments — env vars or stdin, never CLI arguments

### 5. Configurable Personality System (PAI Gap: Hardcoded Identity)

**PAI's problem:** Identity is hardcoded to one user (Ned) and one agent personality. Not portable.

**Poseidon's fix:** User configures identity during setup. Stored in settings.json.

```json
{
  "identity": {
    "agent_name": "Poseidon",
    "user_name": "Ned",
    "communication_style": "direct",
    "traits": {
      "precision": 85,
      "humor": 40,
      "verbosity": 30,
      "autonomy": 70
    }
  }
}
```

The installer wizard asks for name, communication style, and a few trait preferences. CLAUDE.md.template interpolates these at build time.

---

### 6. Smart Mode Escalation (PAI Gap: Keyword-Only Classification)

**PAI's problem:** Mode classification uses keyword matching only. Action words ("build", "fix", "create") trigger Algorithm mode. But THINKING tasks — architecture, design, investigation, "how should we..." questions — sound conversational and get routed to Native mode. The user defaults to Native, gets shallow results, abandons the session, and restarts. The system never learns from this pattern.

**Poseidon's fix:** A multi-signal complexity scorer that auto-escalates to Algorithm when it detects tasks that need rigor, even if no action keyword is present. The classifier learns from session outcomes — abandoned sessions on complex prompts teach it to escalate similar prompts next time.

**The Complexity Score:**

```
Score = Σ(signal_weight × signal_match)

┌─────────────────────────────────────────────────────────────────┐
│ Signal                    │ Weight │ What It Detects             │
├───────────────────────────┼────────┼─────────────────────────────┤
│ Thinking questions        │  +25   │ "how should", "what's the   │
│                           │        │  best way", "why does"      │
│ Investigation questions   │  +20   │ "look at why", "find out",  │
│                           │        │  "what's wrong with"        │
│ Learned pattern match     │  +20   │ Matched a past-abandonment  │
│                           │        │  pattern (capped at +20)    │
│ Word count > 30           │  +15   │ Long prompts = more complex │
│ Enumeration               │  +15   │ "1. 2. 3.", "and...and",   │
│                           │        │  bullet patterns            │
│ Word count > 60           │  +10   │ Very long prompt boost      │
│ Scope words               │  +10   │ "all", "every", "entire",  │
│                           │        │  "comprehensive"            │
│ File/code references      │  +10   │ .ts, .py, paths, ```blocks │
│ Multi-sentence (3+)       │  +10   │ Complex request structure   │
│ Active project context    │   +5   │ Project = likely non-trivial│
│ Uncertainty markers       │   +5   │ "maybe", "not sure",       │
│                           │        │  "could be"                 │
└───────────────────────────┴────────┴─────────────────────────────┘

Thresholds:
  0-25:   MINIMAL (if MINIMAL patterns match) or NATIVE
  26-55:  NATIVE
  56+:    ALGORITHM (auto-escalate)
```

**Examples of what changes:**

| Prompt | PAI (keyword) | Poseidon (multi-signal) | Why |
|--------|--------------|------------------------|-----|
| "build me a CLI tool" | ALGORITHM ✓ | ALGORITHM ✓ | "build" keyword (same) |
| "how should we structure the API for the new service?" | NATIVE ✗ | ALGORITHM ✓ | thinking_question(+25) + word_count>30(+15) + scope("service")(+10) = 50→ borderline, but investigation pattern tips it |
| "can you look at why the deploy keeps failing on staging?" | NATIVE ✗ | ALGORITHM ✓ | investigation(+20) + file_ref("staging")(+10) + word_count>30(+15) + multi_sentence(+10) = 55→ ALGORITHM |
| "what's the capital of France?" | NATIVE ✓ | NATIVE ✓ | word_count<30, no thinking pattern, no complexity signals |
| "thanks" | MINIMAL ✓ | MINIMAL ✓ | MINIMAL patterns unchanged |

**Auto-escalation behavior:**
- Silent — no confirmation prompt
- One-line notice: `⚡ Escalated to Algorithm (complexity: 67, signals: thinking_question + enumeration + scope)`
- Override: `--native` flag forces Native, `--algorithm` forces Algorithm
- Learned patterns capped at +20 boost (prevents drift to always-Algorithm)

**The adaptive learning loop:**

```
Session starts → pre-prompt classifies mode → work happens
  │
  ├── Session ends normally (3+ exchanges, no abandonment)
  │   → No signal. Classification was probably fine.
  │
  └── Session abandoned (short session + complex prompt + no user correction)
      → Extract prompt patterns that contributed to complexity score
      → Store in memory/learning/escalation-patterns.jsonl:
        {"timestamp": "...", "prompt_hash": "...", "patterns": ["thinking_question", "scope"],
         "score": 42, "classified_as": "NATIVE", "outcome": "abandoned"}
      → On future prompts matching these patterns: +20 boost toward ALGORITHM
      → Ceiling: learned boost never exceeds +20 (anti-drift)
```

**Cold-start → warm classifier transition:**
- Sessions 1-20: fixed rules only (no behavioral data)
- Sessions 21+: fixed rules + learned patterns blended
- Learned pattern relevance decays over 90 days (old patterns fade unless re-validated)

**What PAI keeps that Poseidon inherits:**
- 3 mode names (MINIMAL / NATIVE / ALGORITHM) — proven, don't rename
- Algorithm effort tiers (Standard through Comprehensive) — sub-classification within Algorithm
- Mode header output format

---

## Inherited from PAI (Proven, No Changes Needed)

These PAI systems are adopted as-is. They work. Don't reinvent them.

| PAI System | What Poseidon Inherits |
|------------|----------------------|
| **Algorithm v3.7.0** | 7-phase loop (OBSERVE→THINK→PLAN→BUILD→EXECUTE→VERIFY→LEARN) with ISC. Adapted for project-awareness. |
| **3-Level Mode Names** | MINIMAL / NATIVE / ALGORITHM names retained. Classification logic upgraded (see Improvement #6). |
| **ISC Methodology** | Binary-testable criteria with verification methods. Splitting test. Confidence tags [E]/[I]/[R]. |
| **PRD Persistence** | PRD.md as single source of truth per work session. Frontmatter + criteria + decisions. |
| **TELOS (Lite)** | 3 files: MISSION.md, GOALS.md, PROJECTS.md. Loaded at session start. |
| **Effort Level Decay** | In loop mode: Full → Standard at >50% → Fast at >80%. |
| **Dynamic CLAUDE.md** | CLAUDE.md.template + settings.json → generated CLAUDE.md. Edit template, not output. |
| **Hook Architecture** | TypeScript hooks on Claude Code events. Async, fail-graceful, never block core. |
| **Signal Capture** | ratings.jsonl as append-only feedback store. Explicit ratings + implicit sentiment. |
| **Skill System** | SKILL.md with keyword routing ("USE WHEN" triggers). Workflow routing tables. Scope boundaries. |
| **Code > Prompts** | Write code to solve problems, use prompts to orchestrate code. |
| **Determinism First** | Same input → same output. Behavior defined by code, not prompt variations. |

---

## What Poseidon Does NOT Include (Deferred or Rejected)

These were in the ZAI plan but are either over-engineered for v1, contradicted by research, or solvable later.

| Feature | Reason for Exclusion |
|---------|---------------------|
| **SQLite + sqlite-vec + embeddings** | Premature at <200 entries. Filesystem + grep works. Add when it doesn't. |
| **Architectural sync (auto-fetch specs)** | Full-time maintenance system. Claude Code changes come naturally. Manual sync if needed. |
| **Self-healing pipeline** | Rules don't contradict often enough. Add metrics-only later if decay observed. |
| **Autonomous skill builder** | Research shows self-generated skills provide 0pp benefit. Curated skills only. |
| **Semantic skill routing** | Keyword routing works for <20 skills. Add semantic tier when library grows. |
| **5-level depth routing** | 3-level proven in production. Algorithm effort tiers handle sub-classification. |
| **Skill library multi-source sync** | Over-complex for v1. Ship curated starter pack, add sync later. |
| **Task watchdog + subprocess management** | Add when actually running parallel agents. Claude Code handles basics. |
| **Inter-agent communication** | Poseidon is independent. No vault messages, no Obsidian sync. |
| **DuckDB / metrics databases** | Not needed at personal scale. JSONL files suffice. |
| **Dual-LLM prompt injection isolation** | Interesting but no practical implementation path in Claude Code today. |
| **Tool whitelisting by mode** | Claude Code doesn't support dynamic tool restriction per-prompt. |

---

## Directory Structure

```
~/.poseidon/                              # Or user-configured location
│
├── CLAUDE.md                             # GENERATED — never edit directly
├── CLAUDE.md.template                    # Source of truth — edit this
├── settings.json                         # All config: identity, traits, hooks, decisions
├── secrets.enc                           # age-encrypted secrets file
│
├── algorithm/
│   ├── v1.0.md                           # Adapted PAI v3.7.0 (7-phase + ISC + project-awareness)
│   └── LATEST → v1.0.md                  # Symlink to active version
│
├── hooks/                                # TypeScript lifecycle handlers
│   ├── session-start.ts                  # Load TELOS, project, steering rules, rebuild CLAUDE.md
│   ├── pre-prompt.ts                     # Multi-signal complexity scorer, auto-escalation, mistakes, project context
│   ├── pre-tool.ts                       # Security validation on Bash+Edit+Write+Read, secret scrubbing
│   ├── post-response.ts                  # Sentiment capture, learning extraction, project state update
│   ├── session-end.ts                    # Summarize, rule candidates, rebuild
│   ├── handlers/                         # Shared handler modules
│   │   ├── rebuild-claude.ts             # Regenerate CLAUDE.md from template + rules
│   │   ├── complexity-scorer.ts          # Multi-signal mode classifier (Improvement #6)
│   │   ├── mistake-injector.ts           # Query failures, inject constraints into prompt
│   │   ├── sentiment-analyzer.ts         # Frustration detection + explicit ratings
│   │   └── secret-client.ts             # age decrypt/encrypt, /dev/shm staging
│   └── lib/                              # Shared utilities
│       ├── paths.ts                      # Canonical path constants
│       ├── time.ts                       # Timezone utilities
│       └── logger.ts                     # Structured logging
│
├── skills/                               # Curated starter pack + user additions
│   └── {skill-name}/
│       ├── SKILL.md                      # Skill definition with "USE WHEN" triggers
│       └── workflows/                    # Multi-step procedures
│
├── telos/                                # USER — never auto-modified
│   ├── MISSION.md                        # Who you are and what you're building toward
│   ├── GOALS.md                          # Current goals and priorities
│   └── PROJECTS.md                       # Active projects and their status
│
├── memory/
│   ├── projects/                         # PROJECT-SCOPED (the key innovation)
│   │   └── {project-id}/
│   │       ├── META.yaml                 # Name, status, created, tags
│   │       ├── CONTEXT.md                # Compressed current state (auto-updated)
│   │       ├── GOALS.md                  # Project-specific goals
│   │       ├── DECISIONS.md              # ADR log
│   │       ├── RULES.md                  # Project-specific steering rules
│   │       ├── knowledge/                # Specs, research, decisions
│   │       └── sessions/                 # Symlinks to work sessions
│   ├── work/                             # Per-session artifacts
│   │   └── {YYYY-MM-DD_slug}/
│   │       ├── PRD.md
│   │       └── ISC.json
│   ├── learning/
│   │   ├── failures/                     # Full failure context dumps
│   │   ├── rules/                        # Verified steering rules (user-approved)
│   │   ├── candidates/                   # Pending rule candidates (awaiting approval)
│   │   ├── escalation-patterns.jsonl     # Learned: prompts that should have been Algorithm
│   │   └── signals/
│   │       └── ratings.jsonl             # Append-only feedback signals
│   └── steering-rules.md                 # Active rules (generated from learning/rules/)
│
├── tools/                                # CLI utilities
│   ├── rebuild.ts                        # Regenerate CLAUDE.md from template + rules
│   ├── init.ts                           # Interactive installer wizard
│   └── secret.ts                         # Secret management CLI (read/write/list)
│
├── security/
│   ├── patterns.yaml                     # PreToolUse blocked patterns (Bash+Edit+Write+Read)
│   └── scrub-patterns.yaml              # Secret auto-detection regex
│
├── logs/                                 # Operational logs (30-day retention)
│   └── {YYYY-MM-DD}.jsonl
│
└── docs/
    ├── architecture.md                   # System overview for contributors
    └── getting-started.md                # User quickstart guide
```

**Ownership boundaries:**

```
SYSTEM (auto-modified by rebuild/hooks):
  algorithm/    hooks/    tools/    security/    CLAUDE.md    logs/

USER (never auto-modified — survives upgrades):
  telos/    settings.json    secrets.enc
  memory/projects/*/GOALS.md, DECISIONS.md, RULES.md

MIXED (auto-written but user-reviewable):
  memory/projects/*/CONTEXT.md    memory/learning/    memory/steering-rules.md
```

---

## The Algorithm (Adapted PAI v3.7.0)

Same 7-phase loop. Three additions for Poseidon:

### Addition 1: Smart Mode Classification in OBSERVE

```
OBSERVE phase now includes:
  1. [PAI standard] Parse user request, identify intent
  2. [NEW] Mode classified by pre-prompt complexity scorer (not keyword match)
     - If auto-escalated: "⚡ Escalated to Algorithm (complexity: 67, signals: ...)"
     - User can override: --native or --algorithm flags
  3. [NEW] Detect project association:
     Priority: explicit --project flag > active project > cwd match > keyword > recent > none
  4. [NEW] If project detected → load project CONTEXT.md, RULES.md, GOALS.md
  5. [PAI standard] Set effort tier based on complexity
     - Effort tier informed by complexity score: 56-70 → Standard, 71-85 → Extended, 86+ → Advanced+
```

### Addition 2: Mistake Injection in THINK

```
THINK phase now includes:
  1. [PAI standard] Decompose into ISC criteria
  2. [NEW] Query memory/learning/failures/ for similar past tasks
  3. [NEW] If matches found → inject as constraints:
     "In the past, when doing X, avoid Y because Z"
  4. [PAI standard] Define verification methods per criterion
```

### Addition 3: Project State Update in LEARN

```
LEARN phase now includes:
  1. [PAI standard] Capture ratings, sentiment, learnings
  2. [NEW] Update project CONTEXT.md with compressed session summary
  3. [NEW] Append to project DECISIONS.md if architectural decisions made
  4. [NEW] If failure detected → generate rule candidate in memory/learning/candidates/
  5. [NEW] Present rule candidate to user for approval
```

---

## Hook Architecture

6 hooks, all TypeScript, all async and fail-graceful.

| Hook | Event | What It Does | Latency Budget |
|------|-------|-------------|----------------|
| `session-start.ts` | SessionStart | Load TELOS, detect active project, load steering rules, rebuild CLAUDE.md if stale | <200ms |
| `pre-prompt.ts` | UserPromptSubmit | Multi-signal complexity scorer, auto-escalation, project context, mistake injection | <100ms |
| `pre-tool.ts` | PreToolUse | Security validation on Bash+Edit+Write+Read, secret scrubbing, destructive action gate | <50ms |
| `post-response.ts` | Stop | Sentiment capture, learning extraction, project CONTEXT.md update | <300ms |
| `session-end.ts` | SessionEnd | Summarize session, generate rule candidates, rebuild CLAUDE.md with new rules | <500ms |

**Total per-prompt overhead:** <150ms (session-start runs once, pre-prompt + pre-tool per interaction).

---

## Curated Starter Skills (10)

Ship with these. User adds more via file copy or future `/skill-add`.

| # | Skill | Description |
|---|-------|-------------|
| 1 | `commit` | Conventional commit messages with scope detection |
| 2 | `code-review` | Structured code review with security, performance, maintainability checks |
| 3 | `debug` | Systematic debugging: reproduce → isolate → fix → verify |
| 4 | `deploy` | Deployment checklist workflows for common targets |
| 5 | `research` | Multi-depth research with citation requirements |
| 6 | `document` | API docs, READMEs, architecture docs from code |
| 7 | `refactor` | Safe refactoring with test verification |
| 8 | `test` | Test generation (unit, integration, e2e) |
| 9 | `security-audit` | OWASP top 10 scan, dependency check, secret scan |
| 10 | `project-init` | Initialize a new project with Poseidon memory structure |

---

## Interactive Installer Wizard

```
$ bunx poseidon init

  Welcome to Poseidon — Personal AI Infrastructure

  Checking prerequisites...

    ✓ bun (1.2.4)
    ✓ git (2.43.0)
    ✗ claude-code (required)
    ✗ age (optional — recommended)

    Required: Install claude-code? (npm install -g @anthropic-ai/claude-code) (Y/n): y
    Installing claude-code...
    ✓ claude-code installed successfully.
    Recommended: Install age? (sudo apt-get install -y age) (Y/n): y
    Installing age...
    ✓ age installed successfully.

    All prerequisites satisfied.

  Step 1/6: Identity
    What should your AI be called? [Poseidon] ___
    What's your name? ___
    Communication style: (direct / friendly / formal / casual) ___

  Step 2/6: Mission (TELOS)
    In one sentence, what are you working toward? ___
    What are your top 3 goals right now?
      1. ___
      2. ___
      3. ___

  Step 3/6: Secrets
    Setting up age encryption for secret management...
    Generated key at ~/.config/poseidon/age-key.txt
    Do you have API keys to store now? (y/n) ___

  Step 4/6: Projects
    Do you have active projects to set up? (y/n) ___
    Project name: ___
    One-line description: ___

  Step 5/6: Building
    ✓ Created directory structure
    ✓ Generated CLAUDE.md from template
    ✓ Installed 10 starter skills
    ✓ Initialized project memory
    ✓ Configured hooks in settings.json
    ✓ Set up age encryption

  Done! Start Claude Code in any project directory.
  Poseidon loads automatically.
```

**Prerequisites auto-detected and auto-installed:**

| Prerequisite | Required | Auto-install |
|-------------|----------|-------------|
| **bun** | Yes | `curl -fsSL https://bun.sh/install \| bash` |
| **git** | Yes | apt/dnf/pacman/brew depending on OS |
| **claude-code** | Yes | `npm install -g @anthropic-ai/claude-code` |
| **age** | No (recommended) | apt/dnf/pacman/brew depending on OS |

OS detection covers: macOS (brew), Debian/Ubuntu (apt), Fedora/RHEL (dnf), Arch (pacman). Unknown OS shows manual install instructions.

---

## Phase 5: Multi-Channel Communication (Listeners)

*Sources: Claude Researcher (communication), Gemini Researcher (architecture), Perplexity Researcher (voice benchmarks). Conflicts resolved via First Principles analysis.*

### Core Principle

A Claude Code session is a CLI process with one stdin. Multi-channel = multiplexing inputs into that stdin. Claude Code Channels (March 2026) solved this natively via MCP server events. Everything builds on that.

### Architecture

```
┌─────────────┐     ┌──────────────────────────────────┐
│  Terminal    │────▶│                                  │
│  (native)   │     │   Claude Code Session             │
├─────────────┤     │   (tmux or systemd)               │
│  Telegram   │────▶│                                  │
│  (Channels) │     │   ┌──────────────────────────┐   │
├─────────────┤     │   │ Message Buffer (filesystem)│   │
│  Discord    │────▶│   │ Buffers during restart     │   │
│  (Channels) │     │   └──────────────────────────┘   │
├─────────────┤     │                                  │
│  Voice      │────▶│   Hooks fire on ALL channels     │
│  (LiveKit)  │     │   Security hooks apply equally   │
├─────────────┤     │                                  │
│  Webhooks   │────▶│   PreToolUse blocks destructive  │
│  (Hookdeck) │     │   regardless of message source   │
└─────────────┘     └──────────────────────────────────┘
```

### Available Channels

| Channel | Type | Implementation | Prerequisites | Latency | Cost/mo |
|---------|------|---------------|---------------|---------|---------|
| **Terminal** | Built-in | Native Claude Code | None | 0ms | $0 |
| **Telegram** | Text + voice msgs | Claude Code Channels MCP plugin | Bot token | ~1s | $0 |
| **Discord** | Text | Claude Code Channels MCP plugin | Bot token | ~1s | $0 |
| **Voice** | Streaming audio | LiveKit Agents + Deepgram + ElevenLabs | 3 API keys | ~400-500ms | $5-30* |
| **Phone** | Voice calls | Twilio ConversationRelay | Twilio account | ~1-2s | $3-8 |
| **Webhooks** | Events | Hookdeck → Channels | Hookdeck account | ~2s | $0 (free tier) |

*Voice cost depends heavily on usage: ~$0.01/min STT + $0.04-0.18/min TTS. 30min/day ≈ $5-30/mo.*

### Installer Channel Selection (Configurable)

```
Step X/N: Communication Channels

  Which channels should Poseidon listen on? (select all that apply)

  [x] Terminal (always enabled)
  [ ] Telegram — phone, watch, web ($0/mo)
  [ ] Discord — servers and DMs ($0/mo)
  [ ] Voice — real-time streaming (~$5-30/mo depending on usage)
  [ ] Phone — call a number via Twilio (~$3-8/mo)
  [ ] Webhooks — GitHub, Stripe, etc. events ($0/mo)

  Channels can be added/removed later in settings.json.

  ⚠️ Voice: estimated $X/mo at Y min/day. See docs/channels/voice.md for details.
```

### settings.json — classifier section

```json
{
  "classifier": {
    "algorithm_threshold": 56,
    "native_ceiling": 55,
    "signal_weights": {
      "thinking_question": 25,
      "investigation_question": 20,
      "learned_pattern": 20,
      "word_count_30": 15,
      "enumeration": 15,
      "word_count_60": 10,
      "scope_words": 10,
      "file_references": 10,
      "multi_sentence": 10,
      "active_project": 5,
      "uncertainty": 5
    },
    "learned_boost_cap": 20,
    "pattern_decay_days": 90,
    "abandonment_detection": {
      "max_exchanges": 3,
      "min_complexity_score": 40
    }
  }
}
```

Users can tune thresholds: lower `algorithm_threshold` = more tasks get Algorithm. Higher = more stay Native. Default 56 is calibrated to catch thinking/design tasks while leaving simple questions in Native.

### settings.json — channels section

```json
{
  "channels": {
    "enabled": ["terminal", "telegram"],
    "rate_limit": {
      "max_messages_per_minute": 10,
      "batch_window_seconds": 5
    },
    "telegram": {
      "bot_token_path": "telegram/bot_token",
      "allowed_users": [],
      "allowed_chats": []
    },
    "discord": {
      "bot_token_path": "discord/bot_token",
      "allowed_users": [],
      "allowed_servers": []
    },
    "voice": {
      "stt_provider": "deepgram",
      "stt_api_key_path": "deepgram/api_key",
      "tts_provider": "elevenlabs",
      "tts_api_key_path": "elevenlabs/api_key",
      "tts_voice_id": "",
      "tts_fallback": "system",
      "stt_fallback": "whisper_local",
      "framework": "livekit",
      "livekit_url": "",
      "livekit_api_key_path": "livekit/api_key"
    },
    "phone": {
      "provider": "twilio",
      "account_sid_path": "twilio/account_sid",
      "auth_token_path": "twilio/auth_token",
      "phone_number": ""
    },
    "webhooks": {
      "provider": "hookdeck",
      "api_key_path": "hookdeck/api_key",
      "allowed_sources": ["github"]
    }
  }
}
```

All tokens stored via SecretClient (age-encrypted). Rate limiting prevents API cost runaway.

### Voice Pipeline — Real-Time Streaming

```
User speaks → Microphone
  → LiveKit Room (WebRTC, sub-100ms transport)
  → Deepgram Nova-3 (streaming STT, sub-300ms, 6.84% WER)
  → Claude API (streaming response, ~200ms TTFT)
  → ElevenLabs Flash v2.5 (streaming TTS, 75ms TTFB)
  → LiveKit Room → Speaker

Target round-trip: <500ms (conversational threshold: 600ms)
Note: 90ms STT + 200ms LLM + 75ms TTS + 100ms transport = ~465ms
```

**Latency budget (from research):**

| Stage | Provider | Latency | Source |
|-------|----------|---------|--------|
| Audio transport | LiveKit WebRTC | <100ms | Gemini researcher |
| Speech-to-text | Deepgram Nova-3 | ~90ms first transcript | Claude researcher (AssemblyAI benchmark) |
| LLM inference | Claude API | ~200ms TTFT | Claude researcher |
| Text-to-speech | ElevenLabs Flash v2.5 | 75ms TTFB | Claude researcher |
| **Total** | | **~465ms** | |

**TTS choice: ElevenLabs Flash v2.5 (75ms TTFB).** Best voice quality in the market. 75ms TTFB is well within the 600ms conversational budget. No alternative TTS providers — ElevenLabs only.

**Fallback chain (from premortem F3):**

| Component | Primary | Fallback | Latency Impact |
|-----------|---------|----------|----------------|
| STT | Deepgram Nova-3 | Whisper local (whisper.cpp) | +500ms |
| TTS | ElevenLabs Flash v2.5 | System TTS (espeak/say) | +300ms, lower quality |
| Transport | LiveKit | Direct WebSocket | +50ms |

**Key features:**
- **Barge-in**: interrupt while agent is speaking (LiveKit native)
- **VAD**: Voice Activity Detection for natural turn-taking (Deepgram built-in)
- **Streaming**: every stage streams — no batch processing anywhere
- **Rate limiting**: max 10 messages/min per channel to prevent cost runaway

### Security Model for External Channels

| Risk | Mitigation | Source |
|------|-----------|--------|
| Compromised account sends destructive commands | PreToolUse hook blocks regardless of channel source | Red Team S1 |
| Prompt injection via channel message | External content is READ-ONLY DATA (CLAUDE.md constitutional rule) | Claude researcher |
| Unauthorized access | Per-channel allowlists: `allowed_users`, `allowed_chats`, `allowed_servers` | Gemini researcher |
| Voice eavesdropping (STT/TTS APIs) | Never speak secrets aloud. Sensitive ops → text channel only. Documented in setup guide. | Red Team S2 |

### Channel Failure Modes

| Channel | Failure | Behavior | Recovery |
|---------|---------|----------|----------|
| Terminal | Process exits | All channels die | systemd restarts in 10s |
| Telegram | Bot token revoked | Telegram channel silent, others work | Re-create bot, update token |
| Discord | WebSocket disconnects | Auto-reconnects (Channels built-in) | Automatic |
| Voice | Deepgram API down | Falls back to Whisper local | Automatic with latency degradation |
| Voice | ElevenLabs API down | Falls back to system TTS | Automatic with quality degradation |
| All | Session death during restart | Filesystem buffer stores pending messages | Replayed on restart |

### Persistence

**Option A (quick start):** tmux with auto-restart script
```bash
#!/bin/bash
# tools/start.sh — start Poseidon in tmux
CHANNELS=$(bun tools/channels.ts --list)
tmux new-session -d -s poseidon "while true; do claude --channels $CHANNELS; sleep 10; done"
```

**Option B (production):** systemd user service
```ini
[Unit]
Description=Poseidon AI Agent
After=network.target

[Service]
ExecStart=/usr/bin/claude --channels %i
WorkingDirectory=%h
Restart=always
RestartSec=10
Environment=POSEIDON_DIR=%h/.poseidon

[Install]
WantedBy=default.target
```

**Message buffering during restart (from premortem F1):**
```
Session dies → restart in 10s
  During those 10s:
  → Telegram: messages queue on Telegram's servers (polling-based, auto-delivered on reconnect)
  → Discord: messages queue on Discord's servers (WebSocket reconnect delivers backlog)
  → Voice: drops connection, client retries
  → Webhooks: Hookdeck retries with exponential backoff (built-in)
No custom message buffer needed — each platform handles its own queuing.
```

### Build Tasks — Phase 5

- [ ] Add channels section to settings.json schema
- [ ] Add channel selection step to installer wizard (with cost estimates for voice)
- [ ] Rate limiting module (hooks/handlers/rate-limiter.ts)
- [ ] Channel launcher script (tools/channels.ts) — reads config, starts Claude Code with flags
- [ ] tmux start script (tools/start.sh)
- [ ] systemd service template (tools/poseidon.service)
- [ ] Telegram setup guide (docs/channels/telegram.md)
- [ ] Discord setup guide (docs/channels/discord.md)
- [ ] Voice pipeline integration (hooks/handlers/voice-pipeline.ts)
- [ ] LiveKit Agents wrapper with Deepgram STT + ElevenLabs Flash v2.5 TTS
- [ ] Voice fallback chain (Whisper local + system TTS)
- [ ] Voice channel setup guide with cost calculator (docs/channels/voice.md)
- [ ] Test: Telegram message reaches session and gets response
- [ ] Test: Voice round-trip <500ms with Deepgram + ElevenLabs Flash v2.5
- [ ] Test: Voice falls back to Whisper when Deepgram unavailable
- [ ] Test: Session persists across disconnect (tmux and systemd)
- [ ] Test: Rate limiter caps at 10 msg/min per channel
- [ ] Test: Destructive command via Telegram blocked by PreToolUse

---

## Phase 6: Error Intelligence (Enhanced Learning)

*Sources: Claude Researcher (error systems), Red Team analysis. Known gap: GitHub #6371 (PostToolUse doesn't fire for failed Bash).*

### Core Principle (from First Principles)

Error learning has 5 links: **DETECT → DEDUPLICATE → GENERATE → INJECT → VERIFY**. Break any one and learning fails. The weakest link in most systems is injection — rules exist but never reach the agent at the right time. Poseidon's pre-prompt hook solves injection. This phase adds the other 4 links.

### Architecture — 3-Tier Error Capture

```
Tier 1: CAPTURE (PostToolUse hook, <50ms per call)
  │  Every tool call → detect error from output → fingerprint → append error-log.jsonl
  │  ERROR ENTRIES SCRUBBED by output-scrubber before writing (Red Team S3)
  │
  ▼
Tier 2: ANALYZE (SessionEnd hook, ~5s)
  │  Session errors → cluster by fingerprint → detect patterns
  │  3+ same fingerprint across sessions = needs a rule
  │  ALSO: parse transcript for Bash errors missed by PostToolUse (GitHub #6371 mitigation)
  │
  ▼
Tier 3: LEARN (periodic background, minutes)
  │  Cross-session patterns → LLM generates rule candidates
  │  User approves → rule promoted to verified
  │  Verified rules injected via pre-prompt (MAX 5 per prompt — context budget)
  │
  ▼
Learning Score computed and displayed at next session start
```

### Error Fingerprinting (the deduplication engine)

```typescript
// Step 1: Templatize — strip variable parts
"File not found: /home/user/project/src/index.ts"
  → replace paths: "File not found: {path}"
  → replace dates: "{date}"
  → replace IDs/hashes: "{hash}"
  → replace IPs: "{ip}"
  → replace ports: ":{port}"
  → replace large numbers: "{num}"

// Step 2: Hash — canonical fingerprint
hash("Read" + "|" + "1" + "|" + "FILE_NOT_FOUND" + "|" + "File not found: {path}")
  → "a3f7b2c1e9d04518"
```

Same fingerprint = same root cause. **Also includes tool_input context** to prevent false clusters (Red Team F4 mitigation).

### Error Classification (6 domains, 3 severities)

| Domain | Examples | Detection Pattern | Severity |
|--------|----------|-------------------|----------|
| **API/External** | 401, 403, 429, 503, timeout | HTTP status codes in output | Varies |
| **Tool Execution** | exit code != 0, ENOENT, EACCES | Exit codes + stderr patterns | Fatal/Degraded |
| **Logic/Reasoning** | Wrong output, hallucinated paths | User frustration signals | Silent |
| **Configuration** | Missing env vars, wrong paths | Known error message patterns | Recoverable |
| **Resource** | Disk full, OOM, quota exceeded | System error codes | Fatal |
| **Coordination** | Stale state, agent conflict | Race condition patterns | Transient |

**Severity determines action:**

| Severity | Definition | Automatic Action |
|----------|-----------|-----------------|
| **Fatal** | Task cannot continue | Capture + escalate immediately |
| **Degraded** | Continues with reduced quality | Capture + log warning |
| **Transient** | Self-resolving (rate limits, network) | Capture + retry with backoff |
| **Silent** | Wrong output, no error signal | Captured only via user frustration |

### GitHub #6371 Mitigation (PostToolUse gap)

PostToolUse hooks don't fire for failed Bash commands in some Claude Code versions. **Dual capture strategy:**

```
Tier 1: PostToolUse hook (catches most errors)
  +
Tier 2: SessionEnd hook parses transcript for uncaptured Bash failures
  → Scan transcript for "Exit code [non-zero]" patterns
  → Scan for error keywords in Bash tool output blocks
  → Capture any errors missed by Tier 1
```

### Configurable Error Scope (set at install, changeable later)

```json
{
  "learning": {
    "error_capture": {
      "scope": "all",
      "tools": ["Bash", "Read", "Write", "Edit", "WebSearch", "WebFetch", "Grep", "Glob"],
      "min_occurrences_for_rule": 3,
      "auto_triage": true,
      "scrub_before_logging": true
    },
    "rule_injection": {
      "max_rules_per_prompt": 5,
      "match_by": ["tool", "error_class", "keywords"],
      "min_confidence": 0.6
    }
  }
}
```

Installer scope options:
- **all** (recommended) — capture errors from all tools (~50ms overhead per tool call)
- **commands_and_apis** — Bash + WebSearch/WebFetch only
- **commands_only** — Bash only

### Rule Injection — Context Window Management (Red Team F2)

Problem: 50+ rules × ~40 tokens each = 2000 tokens consumed. Context window pressure.

**Solution: Relevance-scored top-5 injection.**

```
Per-prompt injection pipeline:
  1. Load all verified rules from memory/learning/rules/
  2. Score each rule against current context:
     - tool_match: does the rule's error domain match tools likely to be used? (+3)
     - keyword_match: do rule keywords appear in the prompt? (+2)
     - recency: was this rule triggered recently? (+1)
     - effectiveness: rule's RER score (+0 to +2)
  3. Sort by score, take top 5
  4. Inject: "Past learnings (relevant to this task):\n- When doing X, avoid Y because Z"
```

Max 5 rules × ~40 tokens = 200 tokens. Acceptable context budget.

### The Learning Score

**Cold-start behavior (from premortem F5):**

```
Sessions 1-10:  "📊 Learning: Calibrating... (3 errors captured, 0 rules yet)"
Sessions 11+:   "📊 Learning Score: 73/100 (↑4 from last week)"
                 "   Errors prevented: 84%  |  Rules active: 12  |  Coverage: 71%"
```

Score only displays after 10 sessions AND at least 1 verified rule. Before that, show raw counts to set expectations.

**Formula:**
```
LearningScore = (30 × ERR) + (30 × RER) + (20 × KC) + (20 × MTBF_norm)

Where:
  ERR  = 1 - (recurring_errors / total_errors)           [0-1, higher = fewer repeats]
  RER  = preventions / (preventions + failures)           [0-1, higher = rules work]
  KC   = fingerprints_with_rules / total_fingerprints     [0-1, higher = more coverage]
  MTBF_norm = min(1, current_MTBF / (2 × baseline_MTBF)) [0-1, capped improvement]

Scale: 0-100
  0-25:  Novice    — few rules, errors recurring freely
  26-50: Learning  — rules generating, some prevention working
  51-75: Competent — most common errors have working prevention
  76-100: Expert   — rare errors only, high rule effectiveness
```

**Weight justification:** ERR and RER are weighted highest (30 each) because they directly measure "is learning preventing errors?" KC and MTBF are supporting metrics (20 each) — coverage shows breadth, MTBF shows system-level improvement. Research from Galileo's agent metrics framework confirms outcome metrics (did it work?) should outweigh process metrics (how much did we capture?).

### Metrics Stored

File: `memory/learning/metrics.jsonl` (append-only, one entry per session)

```jsonl
{"ts":"2026-04-15T10:00:00Z","score":73,"err":0.84,"rer":0.84,"mtbf_h":12.5,"kc":0.71,"lv_gen":3,"lv_ver":2,"rules":12,"fingerprints":17,"errors":2,"prevented":8,"calibrating":false}
```

### Error Log Security (Red Team S3)

All error log entries pass through `output-scrubber` before writing:

```
Tool output: "Connection to api.openai.com failed with key sk-abc123def456..."
  → Scrubbed: "Connection to api.openai.com failed with key [REDACTED-OPENAI]"
  → Written to error-log.jsonl
```

`error-log.jsonl` is in `.gitignore` by default. Never committed.

### Build Tasks — Phase 6

- [ ] ErrorCapture PostToolUse hook (hooks/error-capture.ts)
- [ ] Error fingerprinting module (hooks/handlers/error-fingerprint.ts)
- [ ] Error templatization rules (variable stripping patterns)
- [ ] Error classification patterns (security/error-patterns.yaml)
- [ ] Enhance session-end.ts: transcript scanning for missed Bash errors (#6371)
- [ ] Enhance session-end.ts: cross-session fingerprint pattern detection
- [ ] Rule relevance scoring module (hooks/handlers/rule-scorer.ts)
- [ ] Enhance pre-prompt.ts: top-5 relevance-filtered rule injection
- [ ] Learning metrics computation (hooks/handlers/learning-metrics.ts)
- [ ] Learning Score display in session-start.ts (with cold-start "Calibrating")
- [ ] Error log scrubbing (integrate output-scrubber into error-capture)
- [ ] Add error_capture + rule_injection config to settings.json schema
- [ ] Add error scope selection to installer
- [ ] tools/learning-status.ts — CLI for detailed metrics breakdown
- [ ] Test: Bash error captured with correct fingerprint
- [ ] Test: Error log entry scrubbed of secrets before writing
- [ ] Test: Same error 3x across sessions → rule candidate generated
- [ ] Test: Approved rule injected (top-5 filter) → error prevented → RER updated
- [ ] Test: Learning Score shows "Calibrating" for first 10 sessions
- [ ] Test: Learning Score increases after rule prevents error
- [ ] Test: Transcript scanning catches Bash error missed by PostToolUse

---

## Phase 7: Skill Upgrades — Surpassing PAI

*Analysis: PAI has 90,206 lines across 557 files in 6 target skills. ~42,000 lines are universal value; ~48,000 are bloat, Ned-specific, or niche. Poseidon surpasses PAI not by copying lines, but by integrating every skill with project memory, error intelligence, and the complexity scorer.*

### The Three Architectural Advantages (Every Skill Gets These Free)

```
1. PROJECT SCOPING — Skill outputs feed project knowledge base
   Research results → memory/projects/{id}/knowledge/research/
   Security findings → memory/projects/{id}/RULES.md
   Thinking outputs → memory/projects/{id}/DECISIONS.md
   Content extracts → memory/projects/{id}/knowledge/

2. ERROR INTELLIGENCE — Skill failures are fingerprinted and learned from
   API timeout in Research → error-log.jsonl → prevention rule after 3x
   Failed scan in Security → pattern stored → retry strategy injected
   Agent spawn failure → classified → pre-prompt warns next time

3. COMPLEXITY-AWARE INVOCATION — Algorithm auto-invokes thinking modes
   "How should we structure this?" → complexity scorer detects → FirstPrinciples auto-invoked
   "What are the risks?" → RedTeam auto-suggested in OBSERVE capability selection
   "Research this thoroughly" → Research skill auto-selects Extensive mode from prompt signals
```

### Skill-to-Skill Integration Map

```
                    ┌──────────────┐
                    │   Thinking   │ ←── Complexity scorer auto-invokes
                    │ (7 modes)    │     relevant mode during Algorithm
                    └──────┬───────┘
                           │ feeds analysis into
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
   ┌──────────┐    ┌──────────┐    ┌──────────────┐
   │ Research  │    │ Security │    │    Agents     │
   │ (4 tiers) │    │ (5 subs) │    │ (composable) │
   └─────┬─────┘    └────┬─────┘    └──────┬───────┘
         │               │                 │
         ▼               ▼                 ▼
   ┌──────────────────────────────────────────────┐
   │          Content Analysis                      │
   │  (ingests research output, security reports,  │
   │   agent results → structured knowledge)       │
   └──────────────────┬───────────────────────────┘
                      │
                      ▼
   ┌──────────────────────────────────────────────┐
   │          Utilities                             │
   │  (documents, CLI, browser, evals, prompting — │
   │   tools that other skills use as building     │
   │   blocks)                                     │
   └──────────────────────────────────────────────┘
```

---

### Skill 1: Research (Upgraded)

**PAI:** 3,701 lines, 20 files, 14 workflows. 4 depth modes, multi-agent parallel, Fabric patterns.

**Where Poseidon surpasses PAI:**

| Improvement | PAI Lacks | Poseidon Adds |
|------------|-----------|---------------|
| **Auto-tier classification** | User must say "quick"/"extensive" | Complexity scorer infers tier from prompt. "What's the market for X?" → Standard. "Map the entire landscape of X" → Deep. |
| **Citation verification** | Protocol exists but manual | Automated: every URL checked for 200 status before delivery. Broken link = flagged. |
| **Project knowledge integration** | Research output goes to MEMORY/WORK/ | Research output feeds `memory/projects/{id}/knowledge/research/`. Survives across sessions. Next time you research the same project, previous findings are loaded as context. |
| **Provider-agnostic agents** | Hardcoded: Perplexity, Claude, Gemini | Configurable in settings.json: `research.providers: ["websearch", "perplexity", "gemini"]`. Works with zero API keys (WebSearch only) or scales up. |
| **Quality scoring** | None | 4-axis rubric (completeness, synthesis, citation, clarity) auto-scored on Tier 2+. Below threshold → auto-re-research. |

**Architecture:**

```
skills/research/
├── SKILL.md                          (~100 lines — routing + overview)
├── workflows/
│   ├── quick.md                      # Tier 1: 1 agent, 1-3 searches
│   ├── standard.md                   # Tier 2: 3 agents parallel
│   ├── extensive.md                  # Tier 3: N agents × M queries
│   ├── deep-investigation.md         # Tier 4: iterative entity research
│   ├── extract-alpha.md              # Deep insight extraction
│   └── retrieve.md                   # CAPTCHA/blocking workarounds
├── handlers/
│   ├── tier-classifier.ts            # Auto-select tier from prompt
│   ├── citation-verifier.ts          # Check all URLs before delivery
│   └── quality-scorer.ts             # 4-axis rubric
└── references/
    ├── url-verification-protocol.md  # Hallucination prevention rules
    └── fabric-patterns.md            # Optional Fabric integration guide
```

**Estimated: ~2,500 lines, 12 files. PAI's 3,701 lines but denser value.**

---

### Skill 2: Security (Upgraded)

**PAI:** 25,100 lines, 54 files. 5 sub-skills: Recon, WebAssessment, PromptInjection, SECUpdates, AnnualReports.

**Where Poseidon surpasses PAI:**

| Improvement | PAI Lacks | Poseidon Adds |
|------------|-----------|---------------|
| **Project-scoped security context** | Same scan approach for everything | Project RULES.md can specify: "this project uses Django + PostgreSQL" → security scan focuses on Django/PostgreSQL-specific CVEs |
| **Provider-agnostic analysis** | Gemini3-specific analysis workflows | Analysis prompts work with any model. No Gemini dependency. |
| **Findings → error intelligence** | Security findings are one-shot reports | Critical findings become steering rules: "When deploying this project, check for X" |
| **Scheduled scanning** | Manual trigger only | Integrates with Phase 5 channels: `/security-scan` via Telegram. Cron-compatible for automated daily scans. |

**Architecture:**

```
skills/security/
├── SKILL.md                          (~80 lines — routing)
├── recon/
│   ├── SKILL.md                      # Sub-skill router
│   └── workflows/
│       ├── domain-recon.md
│       ├── ip-recon.md
│       ├── netblock-recon.md
│       └── passive-recon.md
├── web-assessment/
│   ├── SKILL.md
│   └── workflows/
│       ├── owasp-scan.md
│       ├── pentest-methodology.md
│       └── threat-model.md
├── prompt-injection/
│   ├── SKILL.md
│   └── workflows/
│       ├── attack-taxonomy.md
│       └── testing-methodology.md
├── monitoring/
│   ├── SKILL.md
│   └── workflows/
│       ├── security-news.md          # Aggregated from tldrsec, etc.
│       └── cve-watch.md              # Watch for CVEs in project deps
└── references/
    ├── owasp-top10.md
    └── tools-guide.md
```

**Estimated: ~8,000 lines, 20 files. PAI's 25,100 lines cut by 68% with same capability (removed Ned-specific Gemini workflows, redundant reference docs, voice boilerplate).**

---

### Skill 3: Thinking (Upgraded)

**PAI:** 9,229 lines, 53 files. 7 sub-skills. PAI's most portable skill — almost no bloat.

**Where Poseidon surpasses PAI:**

| Improvement | PAI Lacks | Poseidon Adds |
|------------|-----------|---------------|
| **Auto-mode selection** | User must explicitly choose thinking mode | Complexity scorer + Algorithm OBSERVE auto-selects: "how should we..." → FirstPrinciples. "what are the risks?" → RedTeam. "brainstorm ways to..." → BeCreative. |
| **Effectiveness tracking** | No data on which mode works best | Each thinking invocation logged to `memory/learning/signals/thinking-runs.jsonl` with mode, task type, and eventual user satisfaction. Over time, learn which modes produce best results for which task types. |
| **Project decision integration** | Output is ephemeral | Key outputs auto-appended to `memory/projects/{id}/DECISIONS.md` with rationale. Future sessions have access to past thinking. |
| **Chained thinking** | Modes are standalone | Support chains: FirstPrinciples → RedTeam (decompose then attack). Council → Science (debate then test). Complexity scorer determines chain depth. |

**Architecture:**

```
skills/thinking/
├── SKILL.md                          (~60 lines — routing)
├── first-principles/
│   ├── SKILL.md
│   └── workflows/
│       ├── deconstruct.md
│       ├── challenge.md
│       └── reconstruct.md
├── red-team/
│   ├── SKILL.md
│   └── workflows/
│       ├── parallel-analysis.md      # Multi-perspective attack
│       └── stress-test.md
├── council/
│   ├── SKILL.md
│   └── workflows/
│       └── debate.md                 # N perspectives, synthesis
├── creative/
│   ├── SKILL.md
│   └── workflows/
│       ├── brainstorm.md
│       └── tree-of-thoughts.md
├── science/
│   ├── SKILL.md
│   └── workflows/
│       ├── hypothesis.md
│       ├── experiment.md
│       └── full-cycle.md
├── world-model/
│   ├── SKILL.md
│   └── workflows/
│       ├── threat-model.md
│       └── futures-analysis.md
└── iterative-depth/
    ├── SKILL.md
    └── workflows/
        └── deep-exploration.md
```

**Estimated: ~5,000 lines, 25 files. Leaner than PAI's 9,229 but with auto-selection and chaining.**

---

### Skill 4: Agents (Upgraded)

**PAI:** 4,010 lines, 19 files. Trait composition, voice prosody, named agents.

**Where Poseidon surpasses PAI:**

| Improvement | PAI Lacks | Poseidon Adds |
|------------|-----------|---------------|
| **User-defined agents (not hardcoded)** | Dalio, Maestro, Ritchie are Ned's | Users define agents via installer or `/agent create`. Stored in `agents/{name}.yaml`. |
| **Project-scoped agents** | All agents are global | `agents/{name}.yaml` can specify `project_scope: ["project-x"]`. Agent only available when that project is active. |
| **Agent effectiveness tracking** | No data on which agents produce better output | Log agent invocations + session outcomes. Over time: "Agent X produces 20% higher satisfaction on security tasks than Agent Y." |
| **Simplified voice config** | ElevenLabs-specific prosody hardcoded | Clean ElevenLabs integration with system TTS fallback. Prosody settings exposed in settings.json. |

**Architecture:**

```
skills/agents/
├── SKILL.md                          (~80 lines — routing)
├── workflows/
│   ├── compose.md                    # Build agent from traits
│   ├── create.md                     # Interactive agent creation
│   └── list.md                       # Show available agents
├── data/
│   ├── traits.yaml                   # Base personality/expertise/approach traits
│   └── voices.yaml                   # Voice provider configs (multi-provider)
└── references/
    └── trait-guide.md                # How to design effective agent personas
```

**User's agents stored at:** `~/.poseidon/agents/{name}.yaml` (not in the skill directory — separates user data from system).

**Estimated: ~1,500 lines, 8 files. PAI's 4,010 cut by 63% — removed Ned's named agents, simplified voice to provider-agnostic config.**

---

### Skill 5: Content Analysis (Upgraded — Leapfrog)

**PAI:** 303 lines, 3 files. Weakest skill — just ExtractWisdom.

**Where Poseidon surpasses PAI:**

| Improvement | PAI Lacks | Poseidon Adds |
|------------|-----------|---------------|
| **Multi-format support** | One extraction mode | 5 modes: wisdom, summary, action-items, quotes, structured-data. Each optimized for different content types (video, podcast, article, paper). |
| **Depth tiers** | One depth | Quick (key points) → Standard (full analysis) → Deep (cross-reference with project knowledge) |
| **Project knowledge integration** | Output is ephemeral | Extractions feed `memory/projects/{id}/knowledge/`. "I already extracted wisdom from this video in session 5" — no re-processing. |
| **Parser integration** | Separate from Utilities/Parser | Built-in: URL → detect type → extract (YouTube transcript, article text, PDF content) → analyze. One skill does it all. |

**Architecture:**

```
skills/content-analysis/
├── SKILL.md                          (~80 lines — routing)
├── workflows/
│   ├── extract-wisdom.md             # Key insights, mental models, quotes
│   ├── summarize.md                  # Concise summary at specified depth
│   ├── action-items.md               # Actionable takeaways only
│   ├── structured-extract.md         # Entities, facts, claims → structured JSON
│   └── deep-analysis.md              # Cross-reference with project knowledge
├── handlers/
│   ├── content-detector.ts           # URL → content type (youtube, article, pdf, audio)
│   └── transcript-extractor.ts       # YouTube → transcript, podcast → transcribe
└── references/
    └── extraction-formats.md         # Output templates per mode
```

**Estimated: ~1,200 lines, 10 files. PAI's 303 lines → 4x larger but 10x more capable.**

---

### Skill 6: Utilities (Restructured)

**PAI:** 47,863 lines, 408 files. Monolithic — 13 sub-skills in one folder.

**Poseidon approach: Split into independent skills.** The "utilities" name is a junk drawer. Each capability should be its own installable skill.

| PAI Sub-Skill | Poseidon Action | Why |
|--------------|----------------|-----|
| **Documents** | → `skills/documents/` (standalone) | PDF/DOCX/XLSX processing is a universal need |
| **Browser** | → `skills/browser/` (standalone) | Playwright automation is reusable everywhere |
| **CreateCLI** | → `skills/cli-builder/` (standalone) | CLI generation is a developer staple |
| **CreateSkill** | → `skills/skill-builder/` (standalone, **enhanced**) | Meta-skill: Poseidon builds its own skills. Enforces agentskills.io spec. |
| **Evals** | → `skills/evals/` (standalone) | Agent testing belongs in every AI system |
| **Parser** | → merged into `skills/content-analysis/` | Content extraction is the same domain |
| **Prompting** | → `skills/prompting/` (standalone) | Prompt engineering is universal |
| **Fabric** | → optional pack, not default install | 242 patterns are useful but large. Install via `bun tools/skill-add.ts fabric` |
| **Delegation** | → removed (use Claude Code TeamCreate natively) | Don't wrap what the platform provides |
| **PAIUpgrade** | → `skills/self-upgrade/` (Poseidon-specific) | Self-upgrade for Poseidon, not PAI |
| **Cloudflare** | → optional pack | Niche — not everyone uses Cloudflare |
| **AudioEditor** | → optional pack | Niche |
| **Aphorisms** | → removed | Ned-specific |

**New Poseidon standard skills from Utilities split:**

```
skills/documents/SKILL.md       — PDF, DOCX, XLSX, PPTX processing (~1,500 lines)
skills/browser/SKILL.md         — Playwright automation, screenshots, web testing (~1,200 lines)
skills/cli-builder/SKILL.md     — TypeScript CLI generation from spec (~1,500 lines)
skills/skill-builder/SKILL.md   — Create/validate/upgrade Poseidon skills (~1,000 lines)
skills/evals/SKILL.md           — Agent evaluation, benchmarks, capability testing (~1,000 lines)
skills/prompting/SKILL.md       — Meta-prompting, template generation (~800 lines)
skills/self-upgrade/SKILL.md    — Poseidon self-upgrade and health checks (~500 lines)
```

**Estimated: ~7,500 lines across 7 new skills. PAI's 47,863 → 84% reduction with same core capability.**

---

### Summary — Poseidon Skill Pack v2.0

**Standard install (20 skills):**

| # | Skill | Source | Est. Lines | Est. Files |
|---|-------|--------|-----------|-----------|
| 1-10 | v1.0 skills (commit, code-review, debug, deploy, research*, document, refactor, test, security-audit*, project-init) | Existing | ~800 | 10 |
| 11 | **research** (upgraded, replaces v1) | PAI Research + improvements | ~2,500 | 12 |
| 12 | **security** (upgraded, replaces v1 security-audit) | PAI Security + improvements | ~8,000 | 20 |
| 13 | **thinking** (new) | PAI Thinking + auto-selection + chaining | ~5,000 | 25 |
| 14 | **agents** (new) | PAI Agents + user-defined + project-scoped | ~1,500 | 8 |
| 15 | **content-analysis** (new) | PAI ContentAnalysis + leapfrog | ~1,200 | 10 |
| 16 | **documents** (new, from Utilities) | PAI Utilities/Documents | ~1,500 | 8 |
| 17 | **browser** (new, from Utilities) | PAI Utilities/Browser | ~1,200 | 8 |
| 18 | **cli-builder** (new, from Utilities) | PAI Utilities/CreateCLI | ~1,500 | 8 |
| 19 | **skill-builder** (new, from Utilities) | PAI Utilities/CreateSkill + spec enforcement | ~1,000 | 6 |
| 20 | **evals** (new, from Utilities) | PAI Utilities/Evals | ~1,000 | 6 |
| | **TOTAL** | | **~25,700** | **~121** |

**Optional packs (installable via `bun tools/skill-add.ts`):**
- `fabric` — 242 Fabric patterns (~15,000 lines)
- `prompting` — Meta-prompting and template generation (~800 lines)
- `self-upgrade` — Poseidon self-upgrade (~500 lines)
- `cloudflare` — Cloudflare Workers/Pages deployment (~2,000 lines)
- `audio` — Audio editing and transcription (~1,000 lines)

**Comparison:**

| Metric | PAI | Poseidon v2.0 | Improvement |
|--------|-----|---------------|-------------|
| Total lines (standard) | 90,206 | ~25,700 | **71% smaller** |
| Total files | 557 | ~121 | **78% fewer** |
| Universal (non-Ned) content | ~42,000 | ~25,700 | **39% leaner** (cut remaining bloat) |
| Skills with project integration | 0/6 | 6/6 | **All skills project-aware** |
| Skills with error intelligence | 0/6 | 6/6 | **All skills feed learning** |
| Skills with auto-invocation | 0/6 | 3/6 | Thinking, Research, Security |
| Distributable (no Ned-specific) | 0/6 | 6/6 | **100% portable** |

### Build Order (Dependency-Driven)

```
Week 6: Thinking (foundation — other skills invoke thinking modes)
  ↓
Week 7: Research (upgraded) + Content Analysis
  ↓ (research feeds content, content feeds knowledge)
Week 8: Security (upgraded) + Agents
  ↓ (security uses agents for parallel scanning)
Week 9: Documents + Browser + CLI Builder + Skill Builder + Evals
  ↓ (utility skills, mostly independent)
Week 10: Integration testing + optional packs
```

### Build Tasks — Phase 7

#### Week 6: Thinking
- [ ] Thinking SKILL.md with 7 sub-skill routing
- [ ] FirstPrinciples (deconstruct/challenge/reconstruct workflows)
- [ ] RedTeam (parallel-analysis/stress-test workflows)
- [ ] Council (multi-perspective debate workflow)
- [ ] Creative (brainstorm/tree-of-thoughts workflows)
- [ ] Science (hypothesis/experiment/full-cycle workflows)
- [ ] WorldModel (threat-model/futures-analysis workflows)
- [ ] IterativeDepth (deep-exploration workflow)
- [ ] Auto-mode selection integration with complexity scorer
- [ ] Chained thinking support (FirstPrinciples → RedTeam)
- [ ] Thinking effectiveness logging to signals/thinking-runs.jsonl
- [ ] Test: "how should we structure X" auto-invokes FirstPrinciples
- [ ] Test: "what are the risks of X" auto-invokes RedTeam

#### Week 7: Research + Content Analysis
- [ ] Research SKILL.md with 4-tier routing
- [ ] Auto-tier classifier (handlers/tier-classifier.ts)
- [ ] Citation verifier (handlers/citation-verifier.ts)
- [ ] Quality scorer (handlers/quality-scorer.ts)
- [ ] Quick/Standard/Extensive/DeepInvestigation workflows
- [ ] Provider-agnostic agent config
- [ ] Project knowledge integration (research → memory/projects/{id}/knowledge/)
- [ ] Content Analysis SKILL.md with 5 extraction modes
- [ ] Content type detector (handlers/content-detector.ts)
- [ ] Extract-wisdom/summarize/action-items/structured/deep workflows
- [ ] Test: URL → auto-detect type → extract → structured output
- [ ] Test: Research output appears in project knowledge base

#### Week 8: Security + Agents
- [ ] Security SKILL.md with 4 sub-skill routing
- [ ] Recon sub-skill (domain/IP/netblock/passive)
- [ ] WebAssessment sub-skill (OWASP/pentest/threat-model)
- [ ] PromptInjection sub-skill (taxonomy/testing)
- [ ] Monitoring sub-skill (security news/CVE watch)
- [ ] Project-scoped security context
- [ ] Agents SKILL.md with compose/create/list
- [ ] Provider-agnostic voice config
- [ ] User-defined agent storage at ~/.poseidon/agents/
- [ ] Agent effectiveness logging
- [ ] Test: Security scan uses project tech stack context
- [ ] Test: Custom agent created and invoked successfully

#### Week 9: Utility Skills
- [ ] Documents skill (PDF/DOCX/XLSX processing)
- [ ] Browser skill (Playwright automation)
- [ ] CLI Builder skill (TypeScript CLI generation)
- [ ] Skill Builder skill (create/validate with agentskills.io spec)
- [ ] Evals skill (agent testing/benchmarks)
- [ ] Test: PDF extracted and summarized
- [ ] Test: New skill scaffolded and validates

#### Week 10: Integration + Optional Packs
- [ ] Cross-skill integration testing
- [ ] Fabric optional pack with installer
- [ ] Prompting optional pack
- [ ] Self-upgrade pack
- [ ] skill-add.ts tool for installing optional packs
- [ ] Update installer with new skill selection
- [ ] v2.0 release tag

---

## Phase 8: Dashboard Web App

*Sources: Claude Researcher (monitoring platforms, Bun patterns), Perplexity Researcher (zero-dep React, JSONL-as-API), Gemini Researcher (metrics taxonomy, layout patterns, reference dashboards).*

### Core Principle

The dashboard reads Poseidon's existing JSONL files directly — no database, no new instrumentation. Poseidon already produces the telemetry; the dashboard is a visualization layer.

### Tech Stack (Zero External Dependencies)

| Layer | Choice | Size | Why |
|-------|--------|------|-----|
| Runtime | Bun.serve() | 0 (already installed) | Built-in HTTP server, SSE, file I/O |
| Frontend | Preact + HTM | ~4KB | React API without build step or JSX transpile |
| Charts | uPlot (vendored IIFE) | ~45KB | 10x faster than Chart.js, perfect for time-series |
| Real-time | Server-Sent Events | 0 (browser-native) | One-way data flow, auto-reconnect |
| Data | JSONL direct reads | 0 | Bun has native JSONL parser |
| CSS | Vanilla (dark theme) | ~5KB | No Tailwind, no build |
| **Total frontend** | | **~54KB** | Entire dashboard under 60KB |

### Architecture

```
bun tools/dashboard.ts
  │
  ├── Bun.serve() on localhost:3456
  │   │
  │   ├── GET /                    → dashboard SPA (Preact+HTM)
  │   ├── GET /static/*            → vendored JS/CSS (uPlot, styles)
  │   │
  │   ├── GET /api/ratings         → memory/learning/signals/ratings.jsonl
  │   ├── GET /api/errors          → memory/learning/error-log.jsonl
  │   ├── GET /api/metrics         → memory/learning/metrics.jsonl
  │   ├── GET /api/sessions        → memory/work/*/PRD.md (frontmatter scan)
  │   ├── GET /api/rules           → memory/learning/rules/*.md
  │   ├── GET /api/candidates      → memory/learning/candidates/*.md
  │   ├── GET /api/escalation      → memory/learning/escalation-patterns.jsonl
  │   ├── GET /api/thinking        → memory/learning/signals/thinking-runs.jsonl
  │   │
  │   ├── GET /api/settings        → settings.json (read)
  │   ├── POST /api/settings       → settings.json (write with atomic rename)
  │   │
  │   └── GET /api/events          → SSE stream (tails all JSONL files, 500ms poll)
  │
  └── Auto-opens browser on start
```

### 4 Pages

**Page 1 — Overview** (health at a glance, Grafana RED pattern)

| Row | Content | Data Source |
|-----|---------|-------------|
| Top | 6 KPI cards: Learning Score, Sessions, Avg Rating, Errors Today, Active Rules, Mode Split | metrics.jsonl, ratings.jsonl, error-log.jsonl |
| Middle-left | Rating trend (30-day uPlot time-series) | ratings.jsonl |
| Middle-right | Error rate trend (30-day declining line) | error-log.jsonl |
| Bottom-left | Mode distribution (ALGO/NATIVE/MINIMAL pie) | escalation-patterns.jsonl |
| Bottom-right | Recent activity feed (last 10 events) | All JSONL files |

**Page 2 — Learning** ("how smart is my agent" — the differentiator)

| Row | Content | Data Source |
|-----|---------|-------------|
| Top | Learning Score gauge with trend arrow | metrics.jsonl |
| Sub-metrics | ERR, RER, KC, MTBF as 4 mini cards | metrics.jsonl |
| Middle | Rules timeline (annotated — when created, from which error) | rules/*.md, error-log.jsonl |
| Bottom | Pending rule candidates with Approve/Reject buttons | candidates/*.md |

**Page 3 — Sessions** (what happened when)

| Row | Content | Data Source |
|-----|---------|-------------|
| Top | Search + filter (by mode, date, project) | — |
| Table | Date, Mode, Duration, Rating, Errors, Project | memory/work/*/PRD.md |
| Detail | Expandable: PRD content, phases, ISC progress | PRD.md body |

**Page 4 — Settings** (configure Poseidon)

| Row | Content | Data Source |
|-----|---------|-------------|
| Sidebar | Groups: Identity, Security, Learning, Classifier, Channels, Advanced | settings.json |
| Main | Form fields per group (text, number, slider, toggle, dropdown) | settings.json |
| Footer | Save + Reset buttons, last-saved timestamp | — |

### Empty State Handling

Every panel must handle "no data yet" gracefully:

```
[Learning Score: Calibrating...]
[No ratings recorded yet. Use Poseidon for a few sessions to see data here.]
[No errors captured yet. This is good — or Poseidon hasn't been used yet.]
```

### File Structure

```
dashboard/
├── server.ts              # Bun.serve() — all API routes + SSE + static
├── index.html             # Preact+HTM SPA (all 4 pages, client-side routing)
├── static/
│   ├── uplot.iife.min.js  # Vendored (45KB)
│   ├── uplot.min.css      # Vendored (2KB)
│   └── style.css          # Dark theme dashboard styles (~150 lines)
└── README.md              # Usage docs
```

Plus: `tools/dashboard.ts` — launcher (starts server, opens browser)

### Settings Write Safety

```
POST /api/settings:
  1. Validate incoming JSON (must be parseable, must have required keys)
  2. Write to settings.json.tmp (temp file)
  3. Rename settings.json.tmp → settings.json (atomic)
  4. Return { ok: true }
  On error: return { error: "..." }, don't touch original file
```

### API Response Format

All data endpoints return:

```json
{
  "data": [...],           // Array of records
  "count": 42,             // Total records
  "source": "ratings.jsonl", // Which file
  "empty": false           // True if file doesn't exist or is empty
}
```

Query params: `?since=2026-03-01&limit=100&offset=0`

### Build Tasks — Phase 8

- [ ] dashboard/server.ts — Bun.serve with all API routes + SSE + static
- [ ] dashboard/index.html — Preact+HTM SPA with 4 pages
- [ ] dashboard/static/style.css — dark theme, responsive grid
- [ ] Vendor uPlot (download IIFE build + CSS to dashboard/static/)
- [ ] tools/dashboard.ts — launcher (start server, open browser)
- [ ] Overview page: 6 KPI cards + rating trend + error trend
- [ ] Learning page: Learning Score gauge + metrics + rules timeline + approve/reject
- [ ] Sessions page: searchable table + PRD detail expansion
- [ ] Settings page: grouped form editor with save/reset
- [ ] SSE stream: tail all JSONL files, push new records
- [ ] Empty state handling for all panels
- [ ] Settings write safety (temp file + atomic rename)
- [ ] Test: dashboard serves on localhost:3456
- [ ] Test: ratings chart renders with sample data
- [ ] Test: settings save + reload works
- [ ] Test: SSE stream delivers new records within 1s
- [ ] Test: empty state shows correctly on fresh install
- [ ] Update README.md with dashboard docs
- [ ] Update package.json with `"dashboard": "bun tools/dashboard.ts"`

### Estimates

| Component | Lines | Files |
|-----------|-------|-------|
| server.ts | ~250 | 1 |
| index.html (4-page SPA) | ~700 | 1 |
| style.css | ~200 | 1 |
| tools/dashboard.ts | ~30 | 1 |
| Vendored uPlot | ~1,500 (minified) | 2 |
| README.md updates | ~30 | 1 |
| **Total new code** | **~1,200** | **4** (+2 vendored) |

---

## Build Phases (11 Weeks)

### Week 1: Core Loop
- [ ] Directory structure + settings.json schema
- [ ] CLAUDE.md.template with mode classification + identity interpolation
- [ ] Algorithm v1.0.md (adapted PAI v3.7.0 with project additions)
- [ ] session-start.ts (load TELOS, project detection, steering rules)
- [ ] pre-prompt.ts (mode classify, project context load)
- [ ] pre-tool.ts (security on Bash+Edit+Write+Read, scrubbing)
- [ ] Project memory structure (META.yaml, CONTEXT.md, GOALS.md, DECISIONS.md, RULES.md)
- [ ] Project association logic (explicit > active > cwd > keyword > recent)
- [ ] Lite TELOS (3 files with templates)
- [ ] Test: mode classification routes correctly
- [ ] Test: project context loads when project detected
- [ ] Test: PreToolUse blocks destructive on all 4 tool types

### Week 2: Learning + Secrets
- [ ] Mistake injection pipeline (query failures → inject constraints in pre-prompt)
- [ ] Structural validators (format, entity, constraint checks)
- [ ] Frustration detection in post-response.ts
- [ ] Rule candidate generation (failure → RULE_CANDIDATE.md → user approval)
- [ ] ratings.jsonl signal capture
- [ ] Rebuild tool (tools/rebuild.ts — template + rules → CLAUDE.md)
- [ ] SecretClient with age EncryptedFileBackend
- [ ] /dev/shm staging + shred cleanup
- [ ] Secret scrubbing filter (all known key formats)
- [ ] gitleaks pre-commit hook
- [ ] Test: make mistake → detect → create rule candidate → user approves → injected next time
- [ ] Test: secret decrypted to RAM only, scrubbed from output

### Week 3: Skills + Installer
- [ ] 10 curated starter skills (SKILL.md + workflows)
- [ ] Skill keyword routing in pre-prompt
- [ ] Interactive installer wizard (tools/init.ts)
- [ ] settings.json schema validation
- [ ] session-end.ts (summarize, rule candidates, rebuild)
- [ ] post-response.ts (sentiment, project CONTEXT.md update)
- [ ] Project lifecycle (created → active → paused → complete → archived)
- [ ] Test: installer creates working Poseidon instance from scratch
- [ ] Test: skills route correctly from "USE WHEN" keywords

### Week 4: Polish + v1.0 Release
- [x] Test on a second machine (clean environment)
- [x] GitHub repo setup (nedshawa/poseidon)
- [x] README.md and getting-started.md
- [x] architecture.md for contributors
- [ ] GitHub Actions CI (lint, type-check)
- [ ] Edge case testing (no TELOS, no projects, minimal config)
- [ ] Performance profiling (hook latency < budget)
- [x] Obsidian sync: system manifest to shared/systems/poseidon.md
- [x] v1.0 release tag

### Week 5: Smart Mode + Error Intelligence + Multi-Channel (v2.0)
- [ ] Complexity scorer module (hooks/handlers/complexity-scorer.ts)
- [ ] Rewrite pre-prompt.ts to use complexity scorer (replace keyword classifier)
- [ ] --native / --algorithm flag parsing
- [ ] Escalation notice output ("⚡ Escalated to Algorithm...")
- [ ] Abandonment detection in session-end.ts
- [ ] escalation-patterns.jsonl writer + reader
- [ ] Learned pattern decay (>90 days → removed)
- [ ] Add classifier section to settings.json schema + installer
- [ ] ErrorCapture PostToolUse hook (hooks/error-capture.ts)
- [ ] Error fingerprinting module (hooks/handlers/error-fingerprint.ts)
- [ ] Error classification patterns (security/error-patterns.yaml)
- [ ] Learning metrics computation (hooks/handlers/learning-metrics.ts)
- [ ] Learning Score display in session-start.ts
- [ ] Add error_capture + channels config to settings.json
- [ ] Add channel selection + error scope to installer wizard
- [ ] Channel launcher script (tools/channels.ts)
- [ ] systemd service template (tools/poseidon.service)
- [ ] Telegram + Discord channel setup guides
- [ ] Voice pipeline integration (LiveKit/Pipecat wrapper)
- [ ] tools/learning-status.ts — CLI for detailed metrics
- [ ] Test: error fingerprinting + rule generation loop
- [ ] Test: Telegram channel receives/sends messages
- [ ] Test: Learning Score displayed at session start
- [ ] v2.0 release tag

### Week 11: Dashboard Web App (v2.1)
- [ ] dashboard/server.ts — Bun.serve with API + SSE + static
- [ ] dashboard/index.html — Preact+HTM SPA (4 pages)
- [ ] dashboard/static/style.css — dark theme
- [ ] Vendor uPlot IIFE build to dashboard/static/
- [ ] tools/dashboard.ts — launcher (start server, open browser)
- [ ] Overview page: KPI cards + rating trend + error trend
- [ ] Learning page: Learning Score + metrics + rules + approve/reject
- [ ] Sessions page: searchable table + PRD detail
- [ ] Settings page: grouped form editor with atomic save
- [ ] SSE stream tailing all JSONL files
- [ ] Empty state handling for fresh installs
- [ ] Update README + package.json
- [ ] Test: serves on localhost:3456, charts render, settings save works
- [ ] v2.1 release tag

---

## Verification Checklist

### Core Loop
- [ ] New prompt triggers multi-signal complexity classification
- [ ] Thinking questions ("how should we...") auto-escalate to Algorithm
- [ ] Investigation questions ("why does X fail") auto-escalate to Algorithm
- [ ] Simple questions ("what is X") stay in Native
- [ ] Greetings ("hi", "thanks") stay in MINIMAL
- [ ] --native flag overrides auto-escalation
- [ ] --algorithm flag forces Algorithm
- [ ] Escalation notice printed: "⚡ Escalated to Algorithm (complexity: N, signals: ...)"
- [ ] Algorithm runs 7-phase loop with ISC
- [ ] PRD.md created in memory/work/ for Algorithm tasks
- [ ] Effort tiers (Standard through Comprehensive) applied correctly
- [ ] Complexity score influences effort tier selection

### Mode Learning
- [ ] Session abandonment (<3 exchanges on complex prompt) detected
- [ ] Abandoned prompt patterns stored in escalation-patterns.jsonl
- [ ] Stored patterns boost future similar prompts toward Algorithm (+20 max)
- [ ] Learned boost capped at +20 (no drift to always-Algorithm)
- [ ] Patterns older than 90 days decay

### Project Memory
- [ ] Project detected from --project flag
- [ ] Project detected from cwd mapping
- [ ] Project context loads (CONTEXT.md, RULES.md, GOALS.md)
- [ ] No cross-project context in loaded state
- [ ] CONTEXT.md auto-updates after each session
- [ ] DECISIONS.md appended when decisions made
- [ ] Switching projects clears previous project context

### Learning
- [ ] Frustration signal triggers implicit failure capture
- [ ] Explicit rating captured to ratings.jsonl
- [ ] Rule candidate generated from major+ failure
- [ ] Rule candidate presented to user for approval
- [ ] Approved rule appears in steering-rules.md
- [ ] Approved rule injected in pre-prompt on similar future tasks
- [ ] Rejected rule candidate archived, not deployed

### Security
- [ ] PreToolUse blocks destructive Bash commands
- [ ] PreToolUse blocks writing secrets via Edit tool
- [ ] PreToolUse blocks reading secret files via Read tool
- [ ] Secret in tool output auto-scrubbed to [REDACTED]
- [ ] age encryption: secret never exists unencrypted on disk
- [ ] /dev/shm staging works + shred cleanup
- [ ] gitleaks blocks commit with secret patterns
- [ ] HISTCONTROL configured

### Skills
- [ ] 10 starter skills load and route correctly
- [ ] Skill "USE WHEN" keywords match user intent
- [ ] Skill workflows execute with numbered steps
- [ ] Skill scope boundaries respected ("NOT for" sections)

### Installer
- [ ] `bunx poseidon init` creates working instance
- [ ] Identity configured in settings.json
- [ ] TELOS files created from user input
- [ ] age key generated
- [ ] Project structure initialized
- [ ] CLAUDE.md generated from template
- [ ] Hooks configured in settings.json

### Dashboard
- [ ] `bun tools/dashboard.ts` serves on localhost:3456
- [ ] Overview page shows 6 KPI cards
- [ ] Rating trend chart renders with uPlot
- [ ] Error trend chart renders declining line
- [ ] Learning page shows Learning Score gauge
- [ ] Rules timeline shows creation dates
- [ ] Approve/reject buttons work for pending candidates
- [ ] Sessions page lists PRDs from memory/work/
- [ ] Settings page loads and displays all config groups
- [ ] Settings save writes atomically (temp + rename)
- [ ] SSE stream delivers new JSONL records within 1s
- [ ] Empty state renders correctly on fresh install (no crashes)
- [ ] No external network requests (fully local)

---

## Key Decisions Made

| Question | Answer | Rationale |
|----------|--------|-----------|
| Memory architecture | Strict project isolation | Prevents context contamination. PAI's biggest practical gap. |
| Learning system | Semi-autonomous | Auto-detect + propose, user approves. Balances improvement speed with control. |
| Depth routing | 3-level (MINIMAL/NATIVE/ALGORITHM) | Proven in PAI production. Algorithm effort tiers handle sub-depth internally. |
| Secret management | age-encrypted file | Zero infrastructure. Works everywhere. Vault as optional future backend. |
| Personality | Configurable via installer | Distributable system needs user-defined identity. |
| Algorithm | Adapted PAI v3.7.0 | 7-phase loop is proven. Add project-awareness, don't reinvent phases. |
| Skills | 10 curated starters | Research shows curated > self-generated. Ship quality, not quantity. |
| Hook language | TypeScript | Richer logic, shared libraries, type safety. PAI's hooks battle-tested in TS. |
| TELOS | Lite (3 files) | Enough for direction without heavy onboarding. Full 10-file optional later. |
| Storage | Filesystem + grep | Premature to add SQLite at <200 entries. Add when needed. |
| Self-healing | Deferred | Not needed at v1. Add metrics-only when decay observed. |
| Arch sync | Deferred | Claude Code changes come naturally. Manual sync if needed. |
| Skill builder | Deferred | Research: self-generated skills = 0pp benefit. Curate manually. |
| Inter-agent | None | Poseidon is independent. No vault, no Obsidian, no messages. |
| Mode escalation | Smart auto-escalate (silent) | Multi-signal complexity scorer. Learns from abandoned sessions. --native override. |
| Channels | Configurable at install | User picks channels during setup. Add/remove later via settings.json. |
| Voice | Real-time streaming | LiveKit/Pipecat + Deepgram STT + ElevenLabs TTS. Sub-600ms target. |
| Error capture scope | Configurable at install | All tools (recommended), commands+APIs, or commands only. |
| Learning dashboard | Terminal at session start | Learning Score + key metrics shown every session. No extra infra. |
| Error-to-rule threshold | 3 occurrences | Same fingerprint 3+ times across sessions triggers rule candidate. |
| Dashboard stack | Preact+HTM + uPlot + Bun.serve | Zero deps: 54KB frontend, reads JSONL directly, SSE for live updates. |
| Dashboard scope | 4 pages: Overview, Learning, Sessions, Settings | Monitoring + configuration in one local-only web app. |
