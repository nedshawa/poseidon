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

## The Five Genuine Improvements Over PAI

These are the only areas where Poseidon architecturally differs from PAI. Everything else is inherited.

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

## Inherited from PAI (Proven, No Changes Needed)

These PAI systems are adopted as-is. They work. Don't reinvent them.

| PAI System | What Poseidon Inherits |
|------------|----------------------|
| **Algorithm v3.7.0** | 7-phase loop (OBSERVE→THINK→PLAN→BUILD→EXECUTE→VERIFY→LEARN) with ISC. Adapted for project-awareness. |
| **3-Level Mode Classification** | MINIMAL / NATIVE / ALGORITHM. Proven in production. Algorithm internally handles depth via effort tiers. |
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
│   ├── pre-prompt.ts                     # Mode classify, inject past mistakes, load project context
│   ├── pre-tool.ts                       # Security validation on Bash+Edit+Write+Read, secret scrubbing
│   ├── post-response.ts                  # Sentiment capture, learning extraction, project state update
│   ├── session-end.ts                    # Summarize, rule candidates, rebuild
│   ├── handlers/                         # Shared handler modules
│   │   ├── rebuild-claude.ts             # Regenerate CLAUDE.md from template + rules
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

### Addition 1: Project Context in OBSERVE

```
OBSERVE phase now includes:
  1. [PAI standard] Parse user request, identify intent
  2. [PAI standard] Classify mode: MINIMAL / NATIVE / ALGORITHM
  3. [NEW] Detect project association:
     Priority: explicit --project flag > active project > cwd match > keyword > recent > none
  4. [NEW] If project detected → load project CONTEXT.md, RULES.md, GOALS.md
  5. [PAI standard] Set effort tier based on complexity
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
| `pre-prompt.ts` | UserPromptSubmit | Mode classify, project association, mistake injection, project context load | <100ms |
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

## Build Phases (4 Weeks)

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

### Week 4: Polish + Release
- [ ] Test on a second machine (clean environment)
- [ ] GitHub repo setup (nedshawa/poseidon)
- [ ] README.md and getting-started.md
- [ ] architecture.md for contributors
- [ ] GitHub Actions CI (lint, type-check)
- [ ] Edge case testing (no TELOS, no projects, minimal config)
- [ ] Performance profiling (hook latency < budget)
- [ ] Obsidian sync: system manifest to shared/systems/poseidon.md
- [ ] v1.0 release tag

---

## Verification Checklist

### Core Loop
- [ ] New prompt triggers mode classification (MINIMAL/NATIVE/ALGORITHM)
- [ ] Algorithm runs 7-phase loop with ISC
- [ ] PRD.md created in memory/work/ for Algorithm tasks
- [ ] Effort tiers (Standard through Comprehensive) applied correctly

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
