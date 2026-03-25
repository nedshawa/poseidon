---
name: council
description: >-
  Multi-perspective debate where diverse viewpoints discuss a topic in structured
  rounds, respond to each other's arguments, and surface insights through
  intellectual friction. Collaborative-adversarial, not purely adversarial.
  USE WHEN council, debate, perspectives, weigh options, deliberate, multiple
  viewpoints, should we do X or Y, compare approaches.
---

## Instructions

Multi-perspective debate system where specialized viewpoints discuss topics in rounds, respond to each other's points, and find the best path through genuine intellectual friction.

**Key difference from red-team**: Council is collaborative-adversarial (debate to find the best path). Red-team is purely adversarial (attack the idea). Use council when choosing between options; use red-team when stress-testing a single option.

### Workflow Routing

| Request | Route To |
|---|---|
| Full debate, weigh options thoroughly | `workflows/debate.md` |
| Quick perspective check, fast consensus | Execute inline -- 1 round, 3 perspectives |

### Modes

| Mode | Perspectives | Rounds | Use When |
|------|-------------|--------|----------|
| **Quick** | 3 | 1 (positions only) | Sanity check, low-stakes decision |
| **Full** | 4-5 | 3 (positions, responses, synthesis) | Important decision, high stakes |

### Default Perspectives

Perspectives are auto-selected based on the domain of the question:

| Domain | Default Perspectives |
|--------|---------------------|
| **Technical** | Architect, Engineer, Security Researcher |
| **Product** | Engineer, Designer, End User |
| **Business** | Strategist, Finance, Operations |
| **General** | Pragmatist, Optimist, Skeptic, Domain Expert |

Custom perspectives can be specified: "council with a legal perspective on this."

### Round Structure

**Round 1 -- Positions**: Each perspective states their position independently (50-150 words). No one has seen the others' responses.

**Round 2 -- Cross-Examination**: Each perspective responds to the others. Must reference specific points. ("I disagree with the Architect's point about X because...") Genuine friction, not politeness.

**Round 3 -- Synthesis**: Each perspective identifies where the council agrees, where they still disagree, and their final recommendation given the full discussion.

### Output Format

```markdown
## Council Debate: [Topic]

### Perspectives: [List]

### Round 1: Positions
**[Perspective 1]:** [Position]
**[Perspective 2]:** [Position]
**[Perspective 3]:** [Position]

### Round 2: Cross-Examination
**[Perspective 1]:** [Response referencing others' points]
**[Perspective 2]:** [Response referencing others' points]

### Round 3: Synthesis
**[Perspective 1]:** [Final position after debate]

### Council Synthesis
**Consensus:** [Points where 3+ perspectives agreed]
**Unresolved Tensions:** [Points still contested]
**Recommended Path:** [Based on weight of arguments]
```

### Example 1: Technical Decision

**Topic**: "Should we use WebSockets or Server-Sent Events for real-time updates?"

**Architect**: SSE is simpler, works over HTTP/2, and covers 90% of use cases. WebSockets add bidirectional complexity we may not need.

**Engineer**: SSE has better browser reconnection handling built in. WebSockets require manual heartbeat and reconnection logic that teams consistently get wrong.

**Security Researcher**: SSE rides on standard HTTP, so existing auth middleware works. WebSockets require separate auth handling on the upgrade request -- a common source of vulnerabilities.

**Consensus**: SSE unless bidirectional communication is a hard requirement.

### Example 2: Business Decision

**Topic**: "Should we build or buy our analytics platform?"

**Strategist**: Build -- analytics is our competitive advantage. Buying commoditizes our differentiator.

**Finance**: Buy -- building costs 3x more in year one and we need revenue now, not in 18 months.

**Operations**: Buy to start, build to replace. Get to market fast, then invest when we have revenue to fund it.

**Consensus**: Buy-then-build. Finance and Operations converged; Strategist accepted the phased approach preserves the long-term goal.

### Best Practices

1. Use Quick mode for sanity checks, Full mode for important decisions
2. The value is in Round 2 responses -- that is where assumptions get challenged
3. Trust convergence when it occurs across diverse perspectives
4. Forced consensus is worse than acknowledged tension -- surface disagreements
5. Add domain-specific perspectives as needed (security for auth decisions, legal for compliance)

### Integration

- **Before red-team**: Council picks the best option, then red-team stress-tests it
- **After first-principles**: Decompose the problem, then council debates the reconstruction options
- **With science**: Council identifies the hypothesis, science tests it
