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

**Poseidon implementation:** 25 skills with 64 SKILL.md files, 207 workflows, 20 handlers. agentskills.io-compliant structure. Quality gate: 9-point checklist. Dynamic loading pattern. Canonicalization workflow. Full spec in docs/skillsystem.md.

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

---

*These principles are the constitutional foundation of Poseidon. All architectural decisions, skill designs, and system behaviors should trace back to one or more of these principles.*
