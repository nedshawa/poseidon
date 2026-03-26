# Learning System

**Semi-autonomous learning pipeline — detect failures, generate rules, inject constraints, measure effectiveness.**

## Architecture

```
User interaction
    |
    v
Detection (4 signal types)
    |
    v
Classification (type + severity)
    |
    v
Fingerprinting (SHA-256 dedup)
    |
    v
Rule generation (candidates)
    |
    v
User approval
    |
    v
Injection (pre-prompt constraints)
    |
    v
Synthesis (weekly patterns)
    |
    v
Algorithm improvement
```

## Detection Layer (4 Signal Types)

| Signal | Source | Handler |
|--------|--------|---------|
| **Explicit rating** | User types 1-10 | post-response.ts → ratings.jsonl |
| **Frustration** | Pattern matching ("no, that's not", "you forgot") | post-response.ts → failure dump |
| **Session abandonment** | Quit mid-Algorithm with score ≥40 | session-end.ts → escalation-patterns.jsonl |
| **Error capture** | Failed tool calls, error output | post-response.ts + session-end.ts (dual capture) |

## Classification

Each failure is classified as:
- **Type:** wrong_output, format_error, missing_entity, constraint_violation
- **Severity:** minor, major, critical
- **Pattern:** Deduplicated by error fingerprint (SHA-256)

## Error Fingerprinting (handlers/error-fingerprint.ts)

1. Strip absolute paths → `{home}`, `/tmp/{rand}`
2. Strip dates → `{YYYY-MM-DD}`
3. Strip UUIDs and numeric IDs → `{id}`
4. Strip port numbers → `:{port}`
5. Template the error message
6. SHA-256 hash → first 16 chars = fingerprint

**Dedup rule:** 3+ occurrences of same fingerprint → auto-generate prevention rule candidate.

## Rule Generation

When severity ≥ major OR fingerprint count ≥ 3:
1. Create `memory/learning/failures/{timestamp}/ERROR_ANALYSIS.md`
2. session-end.ts generates `memory/learning/candidates/{timestamp}.md`
3. Present to user: "I detected this pattern — add this rule?"
4. User approves → moved to `memory/learning/rules/{slug}.md`
5. Next rebuild regenerates `memory/steering-rules.md`

## Rule Scoring (handlers/rule-scorer.ts)

Rules are ranked by relevance for injection:

| Factor | Weight | Description |
|--------|--------|-------------|
| tool_match | High | Rule's tool type matches current tool |
| keyword_match | Medium | Rule keywords found in current prompt |
| recency | Medium | Newer rules weighted higher |
| effectiveness | High | Rules that prevented errors weighted higher |

**Cap:** Maximum 5 rules injected per prompt (200 tokens budget).

## Pre-Prompt Injection (handlers/mistake-injector.ts)

On each prompt:
1. Query `memory/learning/rules/*.md`
2. Parse frontmatter (pattern keywords)
3. Match against current prompt
4. Score by relevance (rule-scorer.ts)
5. Inject top 5: "In the past, when doing X, avoid Y because Z"

## Learning Score (handlers/learning-metrics.ts)

**Formula (0-100):**
```
score = (30 × ERR) + (30 × RER) + (20 × KC) + (20 × MTBF_norm)
```

| Metric | Full Name | What It Measures |
|--------|-----------|-----------------|
| ERR | Error Reduction Rate | (errors_last_week - errors_this_week) / baseline |
| RER | Rule Effectiveness Rate | prevented_by_rules / total_errors |
| KC | Knowledge Coverage | active_rules / total_failure_types |
| MTBF_norm | Mean Time Between Failures | Normalized to 0-1 scale |

**Cold-start:** Shows "Calibrating..." for first 10 sessions.

## Weekly Synthesis (tools/synthesize-learning.ts)

Produces `memory/learning/synthesis/{YYYY-MM}/weekly-{date}.md`:
- Rating trend (this week vs last)
- Top failure categories by fingerprint frequency
- Rule effectiveness (which rules prevented which errors)
- Capability usage patterns
- Recommendations for algorithm improvements

## Storage

| File | Format | What |
|------|--------|------|
| `memory/learning/signals/ratings.jsonl` | JSONL | All ratings (explicit + implicit) |
| `memory/learning/signals/algorithm-reflections.jsonl` | JSONL | Per-session self-assessment |
| `memory/learning/signals/thinking-runs.jsonl` | JSONL | Thinking mode invocations |
| `memory/learning/failures/{ts}/ERROR_ANALYSIS.md` | Markdown | Full failure context dumps |
| `memory/learning/candidates/{ts}.md` | Markdown | Pending rule proposals |
| `memory/learning/rules/{slug}.md` | Markdown | Approved steering rules |
| `memory/learning/synthesis/{YYYY-MM}/weekly-{date}.md` | Markdown | Weekly pattern aggregation |
| `memory/steering-rules.md` | Markdown | Generated from approved rules |
