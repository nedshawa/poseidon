# Creative Thinking

## Metadata
- name: Creative Thinking
- version: 1.0.0
- description: Generates divergent ideas, explores parallel solution paths, and synthesizes cross-domain insights for novel problem-solving.
- triggers: ["brainstorm", "creative", "ideate", "divergent", "tree of thoughts"]

## Purpose

Breaks past conventional thinking by systematically generating and evaluating novel ideas. Uses structured creativity techniques to produce actionable innovation rather than undirected brainstorming.

## Modes

### Brainstorm Mode
Generate 10-20 ideas without judgment. Quantity over quality. Wild ideas welcome.

1. Define the challenge in one sentence
2. Set a target of 15+ ideas (stretch to 20)
3. Generate ideas rapidly — no filtering, no "that won't work"
4. Include at least 3 "wild" ideas that seem impractical
5. Group ideas by theme after generation
6. Score each idea on novelty (1-5), feasibility (1-5), impact (1-5)
7. Select top 3-5 for further development

Rules:
- Never dismiss an idea during generation phase
- Defer judgment until scoring phase
- Build on previous ideas ("yes, and..." not "yes, but...")
- Combine two weak ideas into one strong idea where possible

### Tree of Thoughts
Explore 3 parallel solution paths, each with 2-3 branches.

1. Frame the problem clearly with constraints
2. Generate 3 fundamentally different approach paths
3. For each path, develop 2-3 specific branches (variations)
4. Evaluate each branch against success criteria
5. Prune branches that fail critical constraints
6. Develop the 2 strongest branches into full proposals
7. Compare proposals and recommend

Evaluation criteria per branch:
- Does it solve the core problem?
- What are the risks?
- What is the effort vs. payoff?
- Is it reversible if wrong?

### Constraint Removal
Systematically remove constraints to discover hidden possibilities.

1. List all known constraints (technical, business, time, resources)
2. For each constraint, ask: "What if this didn't exist?"
3. Generate 3+ ideas that become possible without that constraint
4. Check which ideas are partially achievable even WITH the constraint
5. Identify constraints that are assumed but not real

This mode often reveals that "impossible" solutions are just "expensive" ones.

### Cross-Domain Synthesis
Apply solutions from unrelated domains to the current problem.

1. Describe the problem abstractly (strip domain-specific language)
2. Identify 3+ unrelated fields that solve analogous problems
3. For each field, describe their approach in domain-neutral terms
4. Translate each approach back to the original problem
5. Evaluate which translations produce novel, viable solutions

Example domains to draw from: biology, urban planning, game theory, logistics, psychology, physics, economics, music composition.

## Output Format

```
## Creative Analysis: [Challenge]

### Ideas Generated
| # | Idea | Novelty | Feasibility | Impact | Score |
|---|------|---------|-------------|--------|-------|
| 1 | ...  | 1-5     | 1-5         | 1-5    | sum   |

### Top 3 Developed

#### Idea A: [Name]
- Approach: [How it works]
- Strengths: [Why it's promising]
- Risks: [What could go wrong]
- Next step: [Concrete first action]

### Recommendation
[Which idea to pursue and why]
```

## Example

Challenge: "Brainstorm ways to reduce API latency"

Result: 15 ideas generated, ranging from conventional (caching, CDN) to creative (predictive pre-computation, gossip-protocol cache invalidation, client-side speculative execution). Top 3 developed with implementation sketches. Recommendation: predictive pre-computation for the highest-traffic endpoints, with caching as the safe fallback.

## Workflows
- [brainstorm](workflows/brainstorm.md) — Pure divergent idea generation
- [tree-of-thoughts](workflows/tree-of-thoughts.md) — Structured parallel exploration
