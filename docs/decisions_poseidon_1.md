# Poseidon — Session 1 Decisions Record

**Date:** 2026-03-24 to 2026-03-25
**Session:** Single continuous session — designed, built, deployed, and iterated on Project Poseidon
**Commits:** 39 commits, v1.0 → v2.4.1
**Final state:** 155+ files, 15,000+ lines, deployed on Chief, synced to Obsidian

---

## 1. GENESIS — Why Poseidon Exists

**Decision:** Build a distributable, project-centric personal AI infrastructure that improves on PAI.

**Why:** PAI (v4.0.3) is powerful but Ned-specific — hardcoded paths, Vault dependency, non-portable. The ZAI research plan (found in Obsidian at shared/systems/zai-plan.md, 3,300 lines) was overscoped (12 pillars, 22 decisions, 15-day timeline). Poseidon takes PAI's proven patterns and adds ONLY genuine improvements, deferring theoretical features.

**Alternative considered:** Fork PAI directly → rejected because PAI has too much Ned-specific infrastructure (Vault, Obsidian, voice server, Tailscale mesh).

---

## 2. THE SIX IMPROVEMENTS OVER PAI

### 2.1 Project-Centric Memory (Improvement #1)
**Decision:** Projects are first-class citizens with isolated memory (CONTEXT.md, GOALS.md, DECISIONS.md, RULES.md, knowledge/).

**Why PAI lacks this:** PAI's MEMORY/WORK/ scatters project context across dozens of session folders. Reconstructing "what do I know about Project X" requires scanning multiple PRDs and transcripts.

**Architecture:** `memory/projects/{id}/` with strict isolation. Switching projects switches ALL loaded context. `_general` project for misc work.

### 2.2 Pre-Prompt Mistake Injection (Improvement #2)
**Decision:** Semi-autonomous learning — detect failures, generate rule candidates, user approves before deployment. Past mistakes injected as constraints on similar future tasks.

**Why:** PAI learns reactively (user rates 1-10). Poseidon detects failures automatically and closes the feedback loop.

### 2.3 PreToolUse Security on ALL Tools (Improvement #3)
**Decision:** Security validation covers Bash + Edit + Write + Read (PAI only covers Bash).

**Why:** An agent could Edit a secret into a file or Read sensitive paths without PAI's SecurityValidator catching it.

### 2.4 age-Encrypted Secrets (Improvement #4)
**Decision:** Zero-infrastructure secret management with `age` encryption. /dev/shm RAM staging + shred.

**Why:** PAI requires HashiCorp Vault — most users don't run a Vault server. `age` has zero dependencies.

### 2.5 Configurable Personality (Improvement #5)
**Decision:** User configures name, voice traits, communication style during install. Settings.json interpolates into CLAUDE.md template.

**Why:** PAI's identity is hardcoded to Ned. Not portable.

### 2.6 Smart Mode Escalation (Improvement #6)
**Decision:** 11-signal complexity scorer replaces PAI's keyword-only mode classification. Auto-escalates to Algorithm when thinking/design/investigation tasks detected. Learns from session abandonments.

**Why:** Ned reported defaulting to Native mode for architecture tasks that should be Algorithm. PAI misses "how should we..." questions because they have no action keywords.

**Key signals:** thinking_question (+25), investigation_question (+20), learned_pattern (+20 capped), word_count (+15), enumeration (+15), scope_words (+10), file_references (+10), multi_sentence (+10), active_project (+5), uncertainty (+5).

**Threshold:** Score 56+ → auto-escalate to Algorithm.

---

## 3. ARCHITECTURAL DECISIONS

### 3.1 Memory Architecture: Strict Project Isolation
**Decision:** Strict (not hybrid, not agent-centric).
**Why:** Prevents context contamination. PAI's biggest practical gap.

### 3.2 Learning System: Semi-Autonomous
**Decision:** Auto-detect + auto-generate rule candidates, but require user approval before deploying.
**Why:** Balances learning speed with control. Full autonomous risks bad rules. Signal-only (PAI default) is too slow.

### 3.3 Depth Routing: 3-Level (MINIMAL/NATIVE/ALGORITHM)
**Decision:** Keep PAI's 3 modes, not ZAI's proposed 5.
**Why:** Proven in PAI production. Algorithm effort tiers handle sub-depth internally.

### 3.4 Secret Backend: age-encrypted file
**Decision:** age as default, with pluggable SecretClient interface.
**Why:** Zero infrastructure. Vault, 1Password, Bitwarden as optional backends.

### 3.5 Algorithm: Adapted PAI v3.7.0
**Decision:** Same 7-phase loop with 3 additions: project context in OBSERVE, mistake injection in THINK, project state update in LEARN.
**Why:** Algorithm is proven. Don't reinvent — extend.

### 3.6 Skills: 10 Curated Starters → 18 in v2.0
**Decision:** Ship curated skills only. Research shows self-generated skills = 0pp benefit.
**Why:** Quality > quantity. SkillsBench data: curated skills +16.2pp pass rate.

### 3.7 Hook Language: TypeScript
**Decision:** TypeScript for all hooks (not shell scripts).
**Why:** Richer logic, shared libraries, type safety. PAI's hooks battle-tested in TS.

### 3.8 TELOS: Lite (3 files)
**Decision:** MISSION.md, GOALS.md, PROJECTS.md only. Full 10-file optional later.
**Why:** Heavy onboarding ask for new users. 3 files is enough for direction.

### 3.9 Storage: Filesystem + grep (no database)
**Decision:** No SQLite, no embeddings, no DuckDB.
**Why:** Premature at <200 entries. Filesystem works. Add when needed.

### 3.10 Inter-Agent: Independent
**Decision:** Poseidon doesn't communicate with PAI or Chief.
**Why:** Distributable system — no dependency on Ned's infrastructure.

---

## 4. CHANNEL & COMMUNICATION DECISIONS

### 4.1 Multi-Channel: Configurable at Install
**Decision:** User selects channels (Telegram, Discord, Voice, Phone, Webhooks) during setup. Claude Code Channels (March 2026) for text.
**Why:** Different users need different channels. Not everyone has Telegram.

### 4.2 Voice: ElevenLabs Only (Cartesia Removed)
**Decision:** ElevenLabs Flash v2.5 (75ms TTFB) as sole TTS provider.
**Why:** Ned explicitly chose ElevenLabs over Cartesia. Total voice latency ~465ms (under 600ms threshold).

**Previous decision:** Cartesia was default for latency (40ms). Reversed by user preference.

### 4.3 ntfy for Notifications
**Decision:** Poseidon sends push notifications via ntfy to topic `chief-ef84c356454d` (same as PAI/Chief).
**Why:** One inbox for all agents. ntfy is zero-infrastructure.

---

## 5. ERROR INTELLIGENCE DECISIONS

### 5.1 3-Tier Error Capture
**Decision:** Tier 1 (PostToolUse, <50ms) → Tier 2 (SessionEnd, ~5s) → Tier 3 (periodic background).
**Why:** Separate fast capture from deferred analysis. PostToolUse must not block.

### 5.2 Error Fingerprinting
**Decision:** Templatize error messages (strip paths, dates, IDs, ports) → SHA-256 hash → 16-char fingerprint.
**Why:** Same root cause = same fingerprint. 3+ occurrences = needs a prevention rule.

### 5.3 Rule Injection: Top-5 Relevance-Filtered
**Decision:** Max 5 rules per prompt, scored by tool_match + keyword + recency + effectiveness.
**Why:** 50+ rules × 40 tokens = 2000 tokens wasted. Top-5 = 200 tokens. Context budget preserved.

### 5.4 Learning Score: Composite 0-100
**Formula:** `(30 × ERR) + (30 × RER) + (20 × KC) + (20 × MTBF_norm)`
**Cold-start:** Shows "Calibrating..." for first 10 sessions.
**Why:** Weights prioritize outcome metrics (did learning prevent errors?) over process metrics (how much captured?).

### 5.5 GitHub #6371 Mitigation
**Decision:** Dual capture — PostToolUse hook + transcript scanning at session end.
**Why:** PostToolUse doesn't fire for failed Bash commands. Transcript scan catches what the hook misses.

---

## 6. SECRET ONBOARDING DECISIONS

### 6.1 Terminal-Only Secret Input (Final Decision)
**Decision:** User pastes API keys naturally in conversation. Pre-prompt hook auto-detects, stores, and tells Poseidon to not repeat the key.

**Evolution of this decision (4 attempts):**
1. `bun tools/onboard.ts` — **Failed.** Claude Code Bash tool has no stdin.
2. `! bun tools/onboard.ts` — **Failed.** `!` prefix also has no TTY.
3. Hook BLOCKS prompt + stores key — **Worked but required specific format** ("onboard fmp KEY"). Bad UX.
4. Hook DETECTS key in natural prompt + stores + injects warning — **Final.** User just talks naturally.

**Why the MCP URL mode approach was rejected:** User didn't want to leave the terminal. MCP Elicitation (form mode) violates MCP spec for secrets. MCP URL mode requires browser. All rejected.

**Why the PAI Wrapper IPC was deferred:** Good for the `poseidon` CLI launcher, but doesn't help inside a Claude Code session. Planned as future enhancement.

### 6.2 Key Detection: Pattern + Context Carry
**Decision:** Detect known patterns (sk-*, ghp_*, pplx-*) anywhere in prompt. For unknown patterns (32+ char strings), check if previous prompt mentioned "key"/"api"/service name.
**Why:** User says "give you fmp key" in prompt 1, pastes raw key in prompt 2. Hook must carry context across prompts.

### 6.3 Secret Registry: security/secrets-registry.md
**Decision:** Markdown file listing what Poseidon HAS and DOESN'T. Injected at session start.
**Why:** Poseidon must know what keys are available without trying and failing. Registry prevents 401 errors.

### 6.4 Setup Wizard: Capabilities by Category
**Decision:** Install walks through Research → Design → Voice → Finance → Infrastructure categories. User picks per key (Y/n).
**Why:** Contextual — user understands WHY each key is needed, not just "enter key 1 of 12."

### 6.5 stty -echo Failed in Installer
**Decision:** Use readline (key visible) instead of stty -echo (which hung the terminal).
**Why:** `install.sh` pipes through `exec bun`, which doesn't pass /dev/tty cleanly. stty -echo + read < /dev/tty blocked forever.

---

## 7. WRAPPER & CLI DECISIONS

### 7.1 Poseidon CLI Wrapper (Primary over MCP)
**Decision:** Build a `poseidon` CLI wrapper that spawns the LLM, not MCP-dependent.

**Why (the LLM-swap argument):** The wrapper is LLM-agnostic — change `spawn(["claude"])` to `spawn(["gemini"])` and Poseidon still works. MCP Elicitation is locked to Claude Code. If Anthropic changes or we switch LLMs, the wrapper survives. The wrapper is the PLATFORM, the LLM is pluggable.

**Score:** Wrapper won 6/9 categories vs MCP (security, UX, LLM independence, architecture, future capabilities, server portability). MCP won 3/9 (multi-channel, GUI/mobile, Windows).

### 7.2 Banner: Gold Trident with Gradient Context Bar
**Decision:** Option A logo (gold gradient trident) + Option C status bar (structured table) + green→red context bar.
**Why:** User chose gold theme. Context bar gradient provides immediate visual health indicator.

### 7.3 LLM Registry: 4 LLMs Supported
**Decision:** Claude (default), Gemini, Codex, Ollama. Extensible via llm-registry.ts.
**Why:** Strategic independence from any single LLM vendor.

---

## 8. STEERING RULES: 3-TIER ARCHITECTURE

**Decision:** System (constitutional) + User (personal) + Learned (auto-generated).

**Why:** Learned from PAI — `PAI/USER/AISTEERINGRULES.md` was missing on disk, so user rules never loaded. The empty file insight: files MUST EXIST even if empty, or the loading pipeline silently skips them.

**System rules (12, immutable):** surgical fixes only, verify before assert, first principles, build ISC, ask before destructive, read before modify, one change debugging, minimal scope, plan means stop, error recovery, project context sacred, rules are not suggestions.

---

## 9. DASHBOARD: Zero-Dep Local Web App

**Decision:** Vanilla JS SPA + uPlot charts + Bun.serve. No React, no npm, no database.

**Why:** Research consensus (3 researchers): Bun.serve + SSE + JSONL direct reads is the simplest stack. Dashboard reads existing hook output files — no new instrumentation needed.

**4 pages:** Overview (KPI + trends), Learning (score + rules + approve/reject), Sessions (PRD table), Settings (form editor).

**Bound to 0.0.0.0** for Tailscale access. Installed as systemd service during setup.

---

## 10. OBSIDIAN INTEGRATION

**Decision:** `poseidon/` as peer directory to `chief/` and `pai/` in the artifacts vault.

**What syncs:** Skills (SKILL.md + workflows), docs, rules, algorithm, PLAN.md, README, security config.
**What doesn't sync:** TypeScript code, settings.json, secrets, memory, dashboard.

**Why separate from shared/:** Poseidon is an agent with its own content, not shared infrastructure.

---

## 11. OPERATIONAL DECISIONS

### 11.1 Auto-Sync Chief After Every Push
**Memory saved.** After every Poseidon commit+push, auto-pull on Chief: `tailscale ssh nedstar@chief 'cd ~/poseidon && git pull'`

### 11.2 Auto-Bump Version
**Memory saved.** Bump patch version in package.json on every commit. Version shown in statusline.

### 11.3 Hook Visibility
**Decision:** Every hook logs ONE line to stderr in standardized format: `⚙ HookName │ details`
**Why:** User had no visibility into what hooks were doing behind the scenes.

### 11.4 Project-First Sessions
**Decision:** Every session starts with a project picker. No "outside project" state. `_general` for misc work.
**Why:** If Poseidon is project-centric, every session should START with a project.

---

## 12. WHAT WAS DEFERRED

| Feature | Why Deferred | When |
|---------|-------------|------|
| SQLite/embeddings | Premature at <200 entries | When filesystem search slows |
| Self-healing pipeline | Rules don't contradict often enough | When decay observed |
| Architectural sync | Claude Code changes come naturally | Manual if needed |
| Autonomous skill builder | Research: 0pp benefit | Curate manually |
| Semantic skill routing | Keyword routing works for <20 skills | When library grows |
| MCP Elicitation onboarding | User wants terminal-only | As multi-channel enhancement |
| Voice pipeline (LiveKit) | Complex, 3 API dependencies | Phase 5 planned |
| Phone (Twilio) | Infrastructure cost | When needed |

---

## 13. BUILD STATISTICS

| Metric | Value |
|--------|-------|
| Total commits | 39 |
| Final version | v2.4.1 |
| Total files | 155+ |
| Total lines | 15,000+ |
| Skills | 18 (28 SKILL.md including sub-skills) |
| TypeScript modules | 30+ |
| Validation checks | 70/70 |
| Dashboard | 4 pages, ~54KB frontend |
| Researchers deployed | 15+ (Claude, Perplexity, Gemini, Grok) |
| Algorithm PRDs created | 12 |
| Session duration | ~18 hours continuous |

---

## 14. KEY LEARNINGS

1. **Algorithm mode catches what Native misses.** The MCP Elicitation spec violation (form mode MUST NOT for secrets) was only found because Algorithm forced verification. Native mode trusted the researcher.

2. **stty -echo doesn't work when piped.** The installer hangs if `exec bun` doesn't pass /dev/tty. Use readline instead.

3. **PostToolUse doesn't fire for failed Bash.** GitHub #6371. Need dual capture (hook + transcript scan).

4. **The wrapper is strategic, not tactical.** MCP is a feature; the wrapper is a platform. LLM independence matters more than spec compliance.

5. **Empty files are load-bearing.** If a file is in the loading pipeline, it MUST EXIST even if empty. Missing file = silently skipped = feature broken.

6. **Auto-sync Chief after every push.** The user expects changes to be live immediately. Don't make them pull manually.

7. **Research agents need voice notification disabled.** All 3 Perplexity researchers died because they tried `curl localhost:8888` (voice server) which doesn't exist for subagents.
