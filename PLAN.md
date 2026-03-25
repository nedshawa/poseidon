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
| **Voice** | Streaming audio | LiveKit Agents + Deepgram + Cartesia | 3 API keys | ~400-500ms | $5-30* |
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
      "tts_provider": "cartesia",
      "tts_api_key_path": "cartesia/api_key",
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
  → Cartesia Sonic Turbo (streaming TTS, 40ms TTFB)
  → LiveKit Room → Speaker

Target round-trip: <500ms (conversational threshold: 600ms)
```

**Latency budget (from research):**

| Stage | Provider | Latency | Source |
|-------|----------|---------|--------|
| Audio transport | LiveKit WebRTC | <100ms | Gemini researcher |
| Speech-to-text | Deepgram Nova-3 | ~90ms first transcript | Claude researcher (AssemblyAI benchmark) |
| LLM inference | Claude API | ~200ms TTFT | Claude researcher |
| Text-to-speech | Cartesia Sonic Turbo | 40ms TTFB | Claude researcher |
| **Total** | | **~430ms** | |

**Why Cartesia over ElevenLabs (conflict resolution):** Claude researcher reported Cartesia at 40ms TTFB vs ElevenLabs at 75ms. Gemini researcher recommended ElevenLabs for quality. **Resolution:** Cartesia is default for latency (First Principles: every ms matters in a 600ms budget). ElevenLabs available as `tts_provider` config override for users who prefer voice quality over speed.

**Fallback chain (from premortem F3):**

| Component | Primary | Fallback | Latency Impact |
|-----------|---------|----------|----------------|
| STT | Deepgram Nova-3 | Whisper local (whisper.cpp) | +500ms |
| TTS | Cartesia Sonic Turbo | System TTS (espeak/say) | +300ms, lower quality |
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
| Voice | Cartesia API down | Falls back to system TTS | Automatic with quality degradation |
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
- [ ] LiveKit Agents wrapper with Deepgram STT + Cartesia TTS
- [ ] Voice fallback chain (Whisper local + system TTS)
- [ ] Voice channel setup guide with cost calculator (docs/channels/voice.md)
- [ ] Test: Telegram message reaches session and gets response
- [ ] Test: Voice round-trip <600ms with Deepgram + Cartesia
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

## Build Phases (5 Weeks)

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
