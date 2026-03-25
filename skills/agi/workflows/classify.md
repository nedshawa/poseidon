# Classify Workflow

**Purpose:** Score task complexity using multiple signals to determine the optimal effort tier and processing mode.

## When to Use

- Evaluating how hard a task is before starting
- Calibrating effort level for the Algorithm
- Understanding why a task was classified a certain way
- Improving classification accuracy

## Classification Methodology

### Signal-Based Scoring

Inspired by Poseidon's 11-signal complexity scorer (Decision 2.6):

| Signal | Weight | Detection Method |
|--------|--------|-----------------|
| **Thinking Question** | +25 | "how should we", "why does", "what's the best way", "figure out" |
| **Investigation Question** | +20 | "investigate", "research", "map the landscape", "deep dive" |
| **Learned Pattern** | +20 (cap) | Matches past tasks that required Algorithm mode |
| **Word Count** | +15 | Requests >100 words likely need structured approach |
| **Enumeration** | +15 | Bullet lists, numbered items, multiple requirements |
| **Scope Words** | +10 | "comprehensive", "complete", "full", "all", "every" |
| **File References** | +10 | Multiple files mentioned = multi-file work |
| **Multi-Sentence** | +10 | >3 sentences = complex request |
| **Active Project** | +5 | Working within an established project context |
| **Uncertainty** | +5 | "I'm not sure", "maybe", "could you help figure out" |
| **Time Pressure** | -10 | "quickly", "fast", "just", "simple" (reduces score) |

### Score → Mode Mapping

| Score Range | Mode | Effort Tier |
|------------|------|-------------|
| 0-15 | MINIMAL | N/A |
| 16-55 | NATIVE | N/A |
| 56-75 | ALGORITHM | Standard (<2min) |
| 76-100 | ALGORITHM | Extended (<8min) |
| 101-130 | ALGORITHM | Advanced (<16min) |
| 131-160 | ALGORITHM | Deep (<32min) |
| 161+ | ALGORITHM | Comprehensive (<120min) |

### PAI vs Poseidon Classification Comparison

| Aspect | PAI (v4.0.3) | Poseidon (v2.4.1) |
|--------|-------------|-------------------|
| **Method** | Keyword-only in CLAUDE.md | 11-signal complexity scorer |
| **Mode Selection** | Manual by AI based on rules | Auto-escalation with override |
| **Learning** | No classification learning | Learns from session abandonments |
| **Accuracy Gap** | Misses "how should we..." questions | Catches thinking/design questions |
| **Override** | None | `--native` / `--algorithm` flags |

### Workflow Steps

1. **Parse the request** — Extract text, count words, identify signals
2. **Score each signal** — Apply weights from the table above
3. **Sum total score** — Map to mode and effort tier
4. **Validate with heuristics:**
   - If score is borderline (within 10 of threshold), examine context
   - If user has a pattern of preferring Algorithm, bias upward
   - If task touches multiple files/systems, add +10
5. **Output classification:**

```markdown
## Task Classification Report

**Request:** "[first 50 chars of request]..."
**Total Score:** [N]

### Signal Breakdown
| Signal | Present? | Points |
|--------|----------|--------|
| Thinking Question | ✓/✗ | +X |
| Investigation Question | ✓/✗ | +X |
| ... | ... | ... |

### Classification
- **Mode:** [MINIMAL/NATIVE/ALGORITHM]
- **Effort Tier:** [Standard/Extended/Advanced/Deep/Comprehensive]
- **Time Budget:** [Xmin]
- **ISC Range:** [X-Y criteria]
- **Min Capabilities:** [N]

### Reasoning
[Why this classification was chosen, including borderline analysis if applicable]

### Alternative Classification
If the user disagrees, the next tier up/down would be:
- **Up:** [tier] — would add [what changes]
- **Down:** [tier] — would remove [what changes]
```
