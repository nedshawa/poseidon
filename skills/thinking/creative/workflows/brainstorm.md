# Workflow: Brainstorm

## Metadata
- name: Brainstorm
- description: Pure divergent idea generation with structured scoring and development of top candidates.
- triggers: ["brainstorm", "ideate", "generate ideas"]

## Purpose

Produces a high volume of ideas for a given challenge, then systematically filters and develops the best ones. Separates generation from evaluation to prevent premature dismissal.

## Inputs
- **challenge**: The problem or opportunity to brainstorm about
- **target_count**: Number of ideas to generate (default: 15)
- **constraints**: Known constraints to work within (optional — can be removed intentionally)

## Steps

### Step 1: Frame the Challenge
Restate the challenge as a clear, single-sentence question starting with "How might we...?"

If the challenge is vague, generate 2-3 framings and pick the most productive one.

### Step 2: Rapid Generation
Generate ideas as fast as possible. For each idea, write one sentence maximum.

Rules during generation:
- No filtering — write everything down
- Include at least 3 "wild" ideas that push boundaries
- Build on previous ideas where inspiration strikes
- Mix approaches: incremental improvements, radical changes, process changes, tool changes
- Aim for the target count but don't stop if momentum continues

### Step 3: Cluster and Theme
Group related ideas into 3-5 themes. Name each theme. This often reveals gaps — generate 2-3 more ideas to fill obvious holes.

### Step 4: Score
Rate each idea on three dimensions (1-5 scale):
- **Novelty**: How different is this from current approaches?
- **Feasibility**: How realistic is implementation with current resources?
- **Impact**: How much would this move the needle on the challenge?

Total score = Novelty + Feasibility + Impact (max 15).

### Step 5: Develop Top 3
For the 3 highest-scoring ideas, expand each into:
- One-paragraph description of the approach
- Key strengths (2-3 bullets)
- Key risks (2-3 bullets)
- Concrete first action to explore further

### Step 6: Recommend
Select the single best idea to pursue first. Justify the choice. Identify what would need to be true for the second-choice idea to become the better option.

## Output Format

```
## Brainstorm: [Challenge]

### How might we...?
[Reframed challenge question]

### Ideas (N generated)
| # | Idea | Theme | Novelty | Feasibility | Impact | Total |
|---|------|-------|---------|-------------|--------|-------|

### Top 3 Developed
[Expanded analysis of each]

### Recommendation
[Best idea + justification + conditions for switching]
```
