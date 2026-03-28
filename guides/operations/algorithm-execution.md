# Algorithm Execution Guide

**How to run the Poseidon Algorithm correctly.**

## When Algorithm Mode Activates

The complexity scorer auto-escalates to ALGORITHM when:
- **Thinking questions** detected: "how should we...", "why does..." (+25, auto-escalate)
- **Investigation questions** detected: "investigate", "figure out why" (+20, auto-escalate)
- **Total score ≥ 56** from accumulated signals (word count, enumeration, scope words, etc.)
- **User override:** `--algorithm` flag

## The 7 Phases

```
♻︎ Entering the Poseidon ALGORITHM… (v1.2)
📂 Project: {active_project}
🗒️ TASK: [8 word description]

━━━ 👁️ OBSERVE ━━━ 1/7    → Understand the request, decompose into ISC criteria
━━━ 🧠 THINK ━━━ 2/7      → Pressure test, inject past mistakes, refine criteria
━━━ 📋 PLAN ━━━ 3/7       → Validate prerequisites, define approach
━━━ 🔨 BUILD ━━━ 4/7      → Invoke capabilities (skills, agents, tools)
━━━ ⚡ EXECUTE ━━━ 5/7     → Do the work, check off criteria progressively
━━━ ✅ VERIFY ━━━ 6/7      → Verify EACH criterion with evidence
━━━ 📚 LEARN ━━━ 7/7       → Reflect, update project, capture learnings
```

## ISC Criteria Rules

Every criterion must be ATOMIC (one verifiable thing, 8-12 words):
- Pass the **Splitting Test**: And/With → split. Independent failure → separate. "All/every" → enumerate.
- Use **Domain Decomposition**: UI per element, Data per field, Logic per branch, Infra per service.

## ISC Count Gate

| Tier | Minimum ISC | If below... |
|------|-------------|-------------|
| Standard | 8 | Decompose further |
| Extended | 16 | You have compound criteria |
| Advanced | 24 | Enumerate "all" scopes |
| Deep | 40 | Full domain decomposition |
| Comprehensive | 64 | Every sub-requirement gets its own ISC |

**Cannot proceed to THINK if ISC count < floor.**

## Capability Selection

Select from Poseidon skills AND platform capabilities:

| Capability | When |
|-----------|------|
| Research | Information gathering |
| Thinking modes | Analysis, debate, stress-test |
| Agent Teams | Complex multi-agent coordination |
| Background Agents | Non-blocking parallel work |
| Worktree Isolation | Parallel code changes |

**Invocation obligation:** Every selected capability MUST be called via tool. Text-only is NOT invocation.

## Visual Feedback (Mandatory)

```
🔍 **Research Launching — Extensive Mode**
  ✦ **Claude** — scholarly synthesis
  ◈ **Perplexity** — real-time data
  ◆ **Gemini** — technical docs

💭 **Thinking: Council** — 4 perspectives debating

📊 **Progress:** 8/12 criteria ████████░░░░ 67%
```

## Common Mistakes

1. **Skipping OBSERVE** — jumping to execution without understanding the request
2. **Compound criteria** — "Build API and deploy it" is 2 criteria, not 1
3. **Phantom capabilities** — selecting a skill but never calling it via tool
4. **No verification** — claiming done without checking each criterion
5. **Ignoring premortem** — not adding criteria for failure modes you identified
