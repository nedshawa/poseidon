# Poseidon Founding Principles

**17 principles governing the design, implementation, and evolution of Poseidon.**

Adapted from PAI's 16 founding principles with Poseidon-specific additions for project isolation, portability, and semi-autonomous learning.

---

## 1. Customization for Achieving Your Goals

Poseidon exists to help you accomplish your goals — and perform the work required to get there. TELOS captures your mission, goals, and projects. Project memory accumulates context over time. Every interaction makes Poseidon better at helping *you*.

**Poseidon implementation:** telos/ (MISSION.md, GOALS.md, PROJECTS.md) + memory/projects/{id}/ (isolated per project)

## 2. The Continuously Upgrading Algorithm (CENTERPIECE)

Everything else exists to serve the Algorithm. The Memory System captures signals. The Hook System detects sentiment and patterns. The Learning System organizes evidence. All of this feeds back into improving the Algorithm itself.

**Poseidon implementation:** algorithm/ with versioned files (v1.0 → v1.1 → v1.2), mine-reflections.ts for pattern extraction, upgrade-algorithm.ts for version management, reflection JSONL capture in LEARN phase.

## 3. Clear Thinking + Prompting is King

Before any code, before any architecture — there must be clear thinking. Understand the problem deeply. Define success criteria. Challenge assumptions. Simplify before optimizing.

**Poseidon implementation:** ISC decomposition in every Algorithm session, Splitting Test for atomic criteria, Thinking skill with 7 sub-skills (first-principles, council, red-team, creative, science, world-model, iterative-depth).

## 4. Scaffolding > Model

The system architecture matters more than the underlying AI model. A well-structured system with good scaffolding outperforms a more powerful model with poor structure. Poseidon's LLM-agnostic wrapper proves this — swap the model, the scaffolding still works.

**Poseidon implementation:** poseidon.ts wrapper supports claude/gemini/codex/ollama. The infrastructure (hooks, memory, scoring, learning) is model-independent.

## 5. As Deterministic as Possible

Favor predictable, repeatable outcomes. Same input → same output. Behavior defined by code, not prompts.

**Poseidon implementation:** CLAUDE.md is template-generated (not handwritten). Mode classification is a code-based 11-signal scorer (not keyword rules in a prompt). All 9 handlers are TypeScript functions with deterministic logic.

## 6. Code Before Prompts

Write code to solve problems, use prompts to orchestrate code. Prompts should never replicate functionality that code can provide.

**Poseidon implementation:** 9 TypeScript handlers do what PAI does in CLAUDE.md prose — complexity scoring, mistake injection, output scrubbing, error fingerprinting, learning metrics, rule scoring, secret management, thinking tracking.

## 7. Spec / Test / Evals First

Define expected behavior before writing implementation. Write test before implementation. For AI components, write evals with golden outputs.

**Poseidon implementation:** ISC decomposition with Splitting Test, evals skill with compare/create-eval/run-eval workflows, 70-point validation checklist in validate.ts.

## 8. UNIX Philosophy (Modular Tooling)

Do one thing well. Compose tools through standard interfaces.

**Poseidon implementation:** 21 CLI tools, each single-purpose. port-skill.ts converts packs. mine-reflections.ts extracts patterns. upgrade-algorithm.ts manages versions. synthesize-learning.ts aggregates weekly patterns. Each tool works independently, composes via shell pipelines.

## 9. ENG / SRE Principles

Apply software engineering and site reliability practices to AI systems. Version control. Monitoring. Graceful degradation.

**Poseidon implementation:** Explicit latency budgets per hook (<200ms, <100ms, <50ms, <300ms, <500ms). Dual error capture (PostToolUse + transcript scanning). Dashboard with 8 API endpoints for monitoring. 30-day log retention. systemd service for availability.

## 10. CLI as Interface

Every operation should be accessible via command line. Discoverable (--help), scriptable, testable, transparent.

**Poseidon implementation:** `poseidon` CLI wrapper is the platform. All tools support --help. poseidon-ipc.ts for inter-process coordination. LLM-agnostic command invocation.

## 11. Goal → Code → CLI → Prompts → Agents

The proper development pipeline. Each layer builds on the previous. Skip a layer, get a shaky system.

**Poseidon implementation:** User goal → TypeScript handlers → CLI tools → CLAUDE.md template → Agent composition via skills.

## 12. Custom Skill Management

Skills are the organizational unit for all domain expertise. Self-activating, self-contained, composable, evolvable.

**Poseidon implementation:** 25+ skills with rich metadata (category, tags, version, author, status, service dependencies, complexity). 3-tier taxonomy (universal/product/project) with explicit matching (Principle #18). skill-index.yaml v3.0 provides 18-field identity per skill. Skill discovery uses metadata for category filtering and service-dependency checking.

## 13. Custom Memory System

Automatic capture and preservation of valuable work. Every session, every insight, every decision — captured automatically.

**Poseidon implementation:** Project-centric memory — each project has CONTEXT.md, GOALS.md, DECISIONS.md, RULES.md, knowledge/. Learning pipeline captures failures, generates rules, injects mistakes as future constraints. Three ownership tiers: SYSTEM (auto-modified), USER (never auto-modified), MIXED (auto-written but reviewable).

## 14. Custom Agent Personalities / Voices

Specialized agents with distinct personalities for different tasks. Personality isn't decoration — it's functional.

**Poseidon implementation:** 3-tier agent system (task tool types, named agents, custom agents). Named agents with persistent identities and ElevenLabs voices. Custom agents composed from traits (expertise × personality × approach). Project-scoped agents.

## 15. Science as Cognitive Loop

The scientific method is the universal cognitive pattern for systematic problem-solving. Goal → Observe → Hypothesize → Experiment → Measure → Analyze → Iterate.

**Poseidon implementation:** Science skill with experiment, full-cycle, hypothesis workflows. Algorithm's 7 phases mirror the scientific method.

## 16. Permission to Fail

Explicit permission to say "I don't know" prevents hallucinations. Fabricating an answer is far worse than admitting uncertainty.

**Poseidon implementation:** Rule #2 in system.md: "Never assert without verification." Hooks enforce this — output scrubbing catches secrets, security validation catches dangerous commands.

## 17. Project Isolation (Poseidon-Only)

Every project is a fortress. Context, goals, decisions, rules — all scoped to the active project. No cross-contamination. Switching projects switches ALL loaded context.

**Poseidon implementation:** memory/projects/{id}/ with strict isolation. Association priority: explicit flag > active project > cwd match > keyword match > recent continuation. Rule #11 in system.md: "Project context is sacred."

## 18. Explicit Skill Matching (Poseidon-Only)

Skills load through exactly two paths — universal match and project match. Never through implicit inference, domain guessing, or automatic association. You must always be able to answer "WHY is this skill loaded?" with one of two answers: "because it's universal or a universal dependency" or "because the project explicitly requested it."

**The three tiers:**
- **Universal** — always available, every project, no configuration. Plus any product skill that a universal skill depends on (loaded as a dependency).
- **Product** — only loaded when a project explicitly lists it in `META.yaml products: [skill-name]`. Never loaded implicitly by domain or keyword matching.
- **Project** — created by and for a specific project, lives in the project's own `skills/` directory. Highest priority (100) for that project.

**Why explicit matters:** Implicit matching creates surprises — a skill activates that you didn't expect, consuming context and creating confusion. Explicit matching is predictable — every loaded skill has a `match_reason` you can trace. Predictability > convenience.

**Poseidon implementation:** `skills/skill-index.yaml` maps every skill to tier, priority, and dependencies. `hooks/handlers/skill-discovery.ts` resolves the two matches. Session-start injects the discovery result into system-reminder so the AI knows exactly which skills are loaded and why.

## 19. Visual Transparency (Poseidon-Only)

Every significant action is announced visually to the user. Research launches show which agents are running with branded icons. Thinking modes announce which mode is active. Agent deployments show who is deployed and why. Analysis stages show progression. Progress bars show ISC criteria completion.

**Why transparency matters:** The user is the principal who delegates work. Delegation without visibility is abdication. The user has a RIGHT to see what is happening, which agents are working, what sources are being used, and how progress is tracking. Silent operations erode trust.

**Poseidon implementation:** Visual feedback templates in CLAUDE.md.template. Brand icon library in `hooks/lib/brand-icons.ts`. Phase transition headers with emoji in algorithm/v1.2.md.

## 20. Skill Preferences as Project Adverbs (Poseidon-Only)

Skills are verbs (HOW to do things). Projects are nouns (WHAT we're working on). Preferences are adverbs (HOW THIS PROJECT wants skills to behave). You don't create a new skill for "finance research" — you take the universal "research" skill and customize it with preferences ("use extensive mode, prefer Perplexity + Gemini, domain: finance"). The skill stays universal. The behavior adapts per project.

**Poseidon implementation:** `preferences/*.yaml` per project. Loaded by `preferences-loader.ts` at session start. Injected into system-reminder so skills adapt.

## 21. Capability-Aware Execution (Poseidon-Only)

Poseidon only uses what is enabled. The capability manifest (`poseidon-manifest.yaml`) is the single source of truth for what this instance can do. If a service is not enabled in the manifest, it does not exist — no blind attempts, no silent failures, no wasted context.

**Why this matters:** An AI that attempts a service without an API key wastes time, context tokens, and user trust. An AI that checks the manifest first knows exactly what it has and adapts its strategy accordingly. A Poseidon instance with only Claude WebSearch uses quick research mode. A Poseidon instance with Perplexity + Gemini + Claude uses standard mode. The manifest determines behavior, not assumptions.

**Poseidon implementation:** `poseidon-manifest.yaml` at the root declares all services with `enabled: true/false`. `hooks/handlers/manifest-loader.ts` reads it. Session-start injects enabled capabilities into system-reminder. Pre-prompt updates it when new keys are captured. Secret backend (age/vault/1password/bitwarden) is configured here — only ONE is active.

---

## 22. Data Source Awareness (Poseidon-Only)

Poseidon knows every external data source — its domain, quality tier, access method, and fallback chain. When data is needed, Poseidon routes to the highest-quality ENABLED source. If premium is unavailable, it falls back to standard, then free. It never blind-attempts a source without checking the manifest.

**The fallback principle:** Premium (paid API, structured data) > Standard (free API, rate-limited) > Free (scraping, built-in). The fallback chain means Poseidon ALWAYS has a path to data — even if every paid service is disabled, free alternatives exist for critical domains (Yahoo Finance for stocks, Claude WebSearch for research, FRED website for economics).

**Poseidon implementation:** `data-sources.yaml` indexes every external source with domain, quality, manifest dependency, fallback chain, and which skills use it. `hooks/handlers/data-source-router.ts` resolves the best available source per domain. Session-start injects available data sources into system-reminder.

---

*These 22 principles are the constitutional foundation of Poseidon. All architectural decisions, skill designs, and system behaviors should trace back to one or more of these principles.*
