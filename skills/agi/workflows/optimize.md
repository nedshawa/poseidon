# Optimize Workflow

**Purpose:** Identify and resolve inference bottlenecks, improve thinking process quality, and balance quality vs speed based on task nature.

## When to Use

- AI system is slow or inefficient on certain task types
- Thinking process produces suboptimal results
- Need to calibrate quality/speed trade-offs
- Want to improve token efficiency

## Optimization Domains

### 1. Inference Flow Optimization

**Common Bottlenecks:**

| Bottleneck | Symptom | Solution |
|-----------|---------|---------|
| **Context bloat** | Degraded output quality in late phases | Implement RLM compaction at phase transitions |
| **Redundant tool calls** | Reading same file multiple times | Cache file contents, batch reads |
| **Serial when parallel** | Sequential agent launches that could be concurrent | Use background agents, Agent teams |
| **Over-classification** | Simple tasks get Algorithm mode | Improve complexity scorer thresholds |
| **Under-classification** | Complex tasks get Native mode | Add thinking/design question detection |
| **Capability underuse** | Not invoking available skills | Expand capability awareness in OBSERVE |
| **Capability overuse** | Invoking skills that add no value | Apply minimum-value-added threshold |

**TurboQuant Principles (Google Research, ICLR 2026):**
- **PolarQuant approach:** Convert complex representations to simpler coordinate systems (analogy: convert verbose context to compressed summaries)
- **QJL approach:** Reduce dimensionality aggressively while preserving signal (analogy: keep only decision-critical information in context)
- **Key insight:** 6x compression with zero accuracy loss is possible when you identify what information is structural vs redundant

### 2. Thinking Process Quality

**The Thinking Pipeline:**
```
Request → Parse → Classify → Decompose (ISC) → Risk Assessment → Plan → Execute → Verify → Learn
```

**Quality Checkpoints:**

| Stage | Quality Signal | Red Flag |
|-------|---------------|----------|
| **Parse** | All requirements captured | Missing implicit requirements |
| **Classify** | Correct mode and effort tier | Under/over-classification |
| **Decompose** | All ISC pass Splitting Test | Compound criteria, scope words |
| **Risk** | Identifies non-obvious risks | Only listing obvious risks |
| **Plan** | Addresses risks, selects right capabilities | Plan doesn't match ISC |
| **Execute** | Progressive criterion completion | Big-bang at end, no incremental |
| **Verify** | Evidence-based verification | Claiming done without checking |
| **Learn** | Honest self-assessment | Generic reflections |

### 3. Rule Adherence Analysis

**Common Adherence Failures:**

| Rule | Typical Violation | Detection |
|------|------------------|-----------|
| Read before modify | Editing files without reading first | Check tool call sequence |
| Minimal scope | Adding unrequested improvements | Compare output to request |
| Ask before destructive | Force push without confirmation | Check for destructive commands |
| Output format | Missing phase headers, incomplete format | Pattern match against template |
| ISC atomicity | Compound criteria sneak through | Apply Splitting Test to each |

### 4. Quality vs Speed Calibration

**The Trade-off Matrix:**

| Task Nature | Quality Weight | Speed Weight | Strategy |
|-------------|---------------|-------------|----------|
| Production deploy | 90% | 10% | Full verification, security review |
| Bug fix | 70% | 30% | Focused testing, quick verification |
| Exploration | 40% | 60% | Quick experiments, fail fast |
| Research | 60% | 40% | Breadth over depth initially |
| Documentation | 80% | 20% | Accuracy critical, verify all claims |

### Workflow Steps

1. **Identify the optimization target:**
   - Specific task type that's underperforming?
   - General system efficiency?
   - Specific bottleneck observed?

2. **Collect evidence:**
   - Review recent PRDs in `MEMORY/WORK/`
   - Check algorithm reflections in `MEMORY/LEARNING/REFLECTIONS/`
   - Review ratings in `MEMORY/LEARNING/SIGNALS/ratings.jsonl`

3. **Analyze patterns:**
   - What types of tasks consistently underperform?
   - Where does the system spend the most time?
   - What capabilities are underused?

4. **Generate optimization report:**

```markdown
# Inference Optimization Report
**System:** [name] | **Date:** [date]

## Current Performance Profile
| Task Type | Avg Score | Avg Time | Efficiency |
|-----------|----------|----------|------------|
| [type] | X/10 | Xmin | X% of budget |

## Identified Bottlenecks
1. [bottleneck] — Impact: [X% of tasks affected]
   - Root cause: [analysis]
   - Recommended fix: [specific action]

## Thinking Process Improvements
1. [improvement] — Expected impact: [X% quality increase]

## Rule Adherence Gaps
1. [gap] — Frequency: [X% of sessions]

## Recommended Changes
1. [change] — Priority: [critical/high/medium]
   - Implementation: [specific steps]
   - Expected outcome: [measurable improvement]
```
