# Audit Workflow

**Purpose:** Evaluate an AI system's architecture quality against proven principles and best practices.

## When to Use

- Assessing a new AI system design
- Evaluating an existing system for gaps
- Periodic health check of PAI or Poseidon
- Before major architectural changes

## Evaluation Framework

### Phase 1: Load Context

1. Identify the target system (PAI, Poseidon, or external)
2. Load the system's architecture docs:
   - PAI: `~/.claude/PAI/PAISYSTEMARCHITECTURE.md`
   - Poseidon: `~/projects/poseidon/docs/architecture.md`
   - External: user provides docs or repo path
3. Load reference standards: `SelfHealingSystems.md`, `SelfLearningSystems.md`

### Phase 2: Evaluate Against 16 Founding Principles

Score each principle 1-10 with evidence:

| # | Principle | Key Question |
|---|-----------|-------------|
| 1 | Customization for Goals | Does the system know the user's goals and adapt? |
| 2 | Continuously Upgrading Algorithm | Does it improve itself from feedback? |
| 3 | Clear Thinking + Prompting | Are prompts versioned, tested, structured? |
| 4 | Scaffolding > Model | Does architecture compensate for model limitations? |
| 5 | As Deterministic as Possible | Same input → same output? |
| 6 | Code Before Prompts | Is logic in code, not prompt engineering? |
| 7 | Spec/Test/Evals First | Are behaviors specified before implementation? |
| 8 | UNIX Philosophy | Single responsibility? Composable tools? |
| 9 | ENG/SRE Principles | Monitoring? Graceful degradation? Version control? |
| 10 | CLI as Interface | Every operation accessible via CLI? |
| 11 | Goal→Code→CLI→Prompts→Agents | Proper development pipeline? |
| 12 | Custom Skill Management | Self-activating? Self-contained? Composable? |
| 13 | Custom Memory System | Automatic capture? Session persistence? |
| 14 | Custom Agent Personalities | Functional personality? Specialization? |
| 15 | Science as Cognitive Loop | Systematic investigation? Falsifiability? |
| 16 | Permission to Fail | Can it say "I don't know"? |

### Phase 3: Evaluate Critical Subsystems

#### Context Handling
- How does the system manage context window limits?
- Does it support context compaction/compression?
- How does it handle cross-session context recovery?
- Score: 1-10

#### Drift Detection
- Does the system detect when it drifts from instructions?
- Are there guardrails for behavioral consistency?
- How does it handle context rot in long sessions?
- Score: 1-10

#### Memory Systems
- How is knowledge persisted across sessions?
- Is memory project-scoped or global?
- Can stale memories be detected and updated?
- Score: 1-10

#### Self-Healing
- Can the system detect its own failures?
- Does it have fallback strategies?
- Can it recover from partial failures without human intervention?
- Score: 1-10

#### Self-Learning
- Does the system learn from user feedback?
- Can it detect failures automatically?
- Does learning improve future performance measurably?
- Score: 1-10

### Phase 4: Generate Report

```markdown
# AI System Audit Report
**System:** [name] | **Date:** [date] | **Auditor:** AGI Skill

## Principle Scores
[Table of 16 principles with scores and evidence]

## Subsystem Scores
| Subsystem | Score | Key Finding |
|-----------|-------|-------------|
| Context Handling | X/10 | [finding] |
| Drift Detection | X/10 | [finding] |
| Memory Systems | X/10 | [finding] |
| Self-Healing | X/10 | [finding] |
| Self-Learning | X/10 | [finding] |

## Overall Score: X/100

## Top 3 Strengths
1. [strength with evidence]
2. [strength with evidence]
3. [strength with evidence]

## Top 5 Gaps (Priority Ordered)
1. [gap] — Impact: [high/med/low] — Recommendation: [action]
2. ...

## Recommendations
[Actionable recommendations ordered by impact]
```

### Phase 5: Compare Against Best-in-Class

If evaluating PAI or Poseidon, compare against the other:
- Load `Workflows/Compare.md` for detailed comparison
- Highlight where the other system does better
- Suggest transferable improvements
