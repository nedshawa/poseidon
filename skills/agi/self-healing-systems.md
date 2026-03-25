# Self-Healing AI Systems

Reference document for self-healing patterns in intelligent AI systems.

## Definition

A self-healing AI system can detect its own failures, diagnose root causes, and apply corrective actions without human intervention. This ranges from simple retry logic to sophisticated behavioral correction.

## Healing Hierarchy

```
Level 0: Crash and wait for human (most AI systems today)
Level 1: Retry with backoff (basic resilience)
Level 2: Fallback to alternative approach (graceful degradation)
Level 3: Diagnose and correct (root cause analysis)
Level 4: Predict and prevent (proactive healing)
Level 5: Evolve strategies (learning-based healing)
```

## Patterns

### 1. Error Detection and Recovery

**Pattern:** Detect errors in tool execution, API calls, or output generation and automatically retry or fall back.

**PAI implementation:**
- PostToolUse hooks detect Bash failures
- GitHub #6371 mitigation: dual capture (hook + transcript scanning)
- Limitation: Only catches Bash errors, not Edit/Write/Read failures

**Poseidon improvement:**
- 3-tier error capture: PostToolUse (<50ms) → SessionEnd (~5s) → periodic background
- Error fingerprinting: SHA-256 hash of templatized error messages
- 3+ occurrences of same fingerprint → needs a prevention rule

### 2. Context Recovery

**Pattern:** When context is lost (compaction, long sessions), the system can reconstruct its state.

**PAI implementation:**
- PRD as system of record (read from `MEMORY/WORK/`)
- Context recovery section in Algorithm: read most recent PRD for phase, progress, criteria
- `work.json` registry for session lookup

**Poseidon implementation:**
- Project-centric context: `memory/projects/{id}/CONTEXT.md`
- Project switching loads all relevant context
- Context isolation prevents contamination

### 3. Behavioral Drift Correction

**Pattern:** Detect when the system drifts from its instructions and self-correct.

**Current gaps in both PAI and Poseidon:**
- Neither detects semantic drift during long sessions
- Compaction can lose critical instructions
- No periodic self-assessment checkpoints

**Ideal implementation:**
- Checkpoint system: every N tool calls, verify adherence to key rules
- Instruction embedding: critical rules in every compaction summary
- Drift score: measure deviation from expected behavior patterns

### 4. Graceful Degradation

**Pattern:** When a capability is unavailable, fall back to a less capable but functional alternative.

**Examples in PAI:**
- Voice notification: fire-and-forget, failure doesn't block execution
- Research: if Perplexity unavailable, fall back to Claude WebSearch (free)
- MCP tools: if unavailable, fall back to direct API calls

### 5. Proactive Healing

**Pattern:** Predict failures before they occur and take preventive action.

**Poseidon's approach:**
- Pre-prompt mistake injection: inject past failure patterns as constraints
- Error fingerprinting: recurring errors (3+) trigger rule creation
- Learning score: composite 0-100 measuring error prevention effectiveness

**Key formula:** `(30 × ERR) + (30 × RER) + (20 × KC) + (20 × MTBF_norm)`
- ERR: Error Reduction Rate
- RER: Rule Effectiveness Rate
- KC: Knowledge Coverage
- MTBF: Mean Time Between Failures (normalized)

## Design Principles for Self-Healing

1. **Fail visibly** — Silent failures are worse than crashes
2. **Fail narrow** — A failing component shouldn't cascade
3. **Recover automatically when safe** — Retries, fallbacks
4. **Escalate when uncertain** — Ask the user when the fix isn't clear
5. **Learn from failures** — Every failure should improve future resilience
6. **Measure healing effectiveness** — Track MTBF, error rates, prevention rate
