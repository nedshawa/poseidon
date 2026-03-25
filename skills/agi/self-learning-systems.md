# Self-Learning AI Systems

Reference document for self-learning patterns in intelligent AI systems.

## Definition

A self-learning AI system improves its performance over time by extracting lessons from interactions, errors, and outcomes — without retraining the underlying model.

## Learning Hierarchy

```
Level 0: No learning (stateless, every session starts fresh)
Level 1: Memory persistence (remembers facts across sessions)
Level 2: Feedback capture (user ratings, corrections)
Level 3: Pattern detection (identifies recurring successes/failures)
Level 4: Rule generation (creates behavioral rules from patterns)
Level 5: Self-improvement (modifies own algorithms from evidence)
```

## Patterns

### 1. Explicit Feedback Loop

**Pattern:** User provides ratings or corrections, system stores and applies them.

**PAI implementation:**
- WorkCompletionLearning hook captures ratings (1-10) to `ratings.jsonl`
- Algorithm reflections appended to `algorithm-reflections.jsonl`
- MineReflections workflow extracts patterns from reflections
- Limitation: Requires explicit user action; reactive, not proactive

### 2. Implicit Feedback Detection

**Pattern:** Infer user satisfaction from conversation tone and behavior.

**PAI implementation:**
- `implied_sentiment` field in reflections (1-10 estimate)
- Conversation tone analysis during LEARN phase
- Limitation: Estimate only, not verified

**Poseidon improvement:**
- Session abandonment detection: if user quits mid-Algorithm, it's a signal
- Re-request detection: if user asks same thing differently, first attempt failed
- Correction frequency: more corrections = lower implicit satisfaction

### 3. Error-Driven Learning

**Pattern:** Automatically detect errors, fingerprint them, and generate prevention rules.

**Poseidon's 3-tier approach:**
1. **Capture:** PostToolUse hook catches errors in real-time
2. **Fingerprint:** Templatize → SHA-256 → 16-char fingerprint
3. **Aggregate:** 3+ occurrences of same fingerprint → candidate rule
4. **Inject:** Top-5 relevance-filtered rules injected per prompt
5. **Validate:** User approves/rejects rule candidates

**Rule relevance scoring:**
- Tool match (does the rule apply to the current tool?)
- Keyword match (does the request match the rule's domain?)
- Recency (newer rules weighted higher)
- Effectiveness (rules that prevented errors weighted higher)

### 4. Outcome-Based Learning

**Pattern:** Track whether fixes worked and features shipped, learning from outcomes.

**Gap in both PAI and Poseidon:**
- Neither tracks "did the fix actually work in production?"
- Neither measures "did the feature ship successfully?"
- Learning is from process, not outcomes

**Ideal implementation:**
- Post-fix verification: check if the error recurs in future sessions
- Feature completion tracking: did the PRD reach `phase: complete`?
- User re-engagement: did the user come back to the same topic (failure) or move on (success)?

### 5. Algorithm Self-Improvement

**Pattern:** The system modifies its own algorithm based on accumulated evidence.

**PAI implementation:**
- Algorithm reflections capture 4 questions at LEARN phase
- AlgorithmUpgrade workflow in Utilities skill
- Manual upgrade process: mine reflections → identify patterns → propose changes
- Algorithm versioned (currently v3.7.0)

**Poseidon approach:**
- Adapted PAI v3.7.0 with 3 additions
- Learning score provides quantitative feedback
- Rule candidates close the loop faster

## Learning Infrastructure Design

### What to Capture

| Signal | Format | Storage | Analysis Cadence |
|--------|--------|---------|-----------------|
| User ratings | JSONL | `LEARNING/SIGNALS/ratings.jsonl` | Per-session |
| Algorithm reflections | JSONL | `LEARNING/REFLECTIONS/` | Per-session |
| Error events | JSONL | `LEARNING/FAILURES/` | Real-time |
| Session abandonments | JSONL | `LEARNING/SIGNALS/` | Per-session |
| Corrections | Markdown | `LEARNING/FAILURES/` | Per-session |

### Learning Anti-Patterns

| Anti-Pattern | Why It Fails | Fix |
|-------------|-------------|-----|
| Learn from everything | Noise overwhelms signal | Filter by significance |
| Only learn from failures | Drift away from validated approaches | Also capture successes |
| No human validation | Bad rules compound | Require user approval |
| No effectiveness tracking | Can't tell if learning helps | Track rule prevention rate |
| Capture but never apply | Learning without action | Inject rules into prompts |

## Design Principles

1. **Learn from both success and failure** — Corrections are loud, confirmations are quiet
2. **Human-in-the-loop for rules** — Auto-generate candidates, but require approval
3. **Measure learning effectiveness** — If learning doesn't improve outcomes, it's just logging
4. **Compact over time** — Raw events → patterns → rules → principles
5. **Version the learning** — Track when rules were added and their impact
6. **Permission to unlearn** — Remove rules that no longer apply
