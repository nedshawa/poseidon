# Compare

Side-by-side comparison of two configurations using the same eval suite.

## Inputs

- **Eval file**: path to YAML eval definition
- **Config A**: first configuration (model, prompt template, or settings)
- **Config B**: second configuration to compare against A
- **Label A** (optional): name for config A (default: "A")
- **Label B** (optional): name for config B (default: "B")

## Procedure

### Step 1: Run eval on both configs

Execute [run-eval](run-eval.md) twice:
1. Run against Config A, capture all scores
2. Run against Config B, capture all scores

### Step 2: Build comparison table

```
Comparison: {eval-name}
Config A: {label-a} | Config B: {label-b}
──────────────────────────────────────────────────────────
 #  | Prompt (truncated)     | A Score | B Score | Winner
 1  | What is 2+2?           | 1.0     | 1.0     | TIE
 2  | Explain gravity...     | 0.8     | 0.6     | A
 3  | Capital of France?     | 1.0     | 1.0     | TIE
──────────────────────────────────────────────────────────
```

### Step 3: Compute statistics

| Metric | Config A | Config B |
|--------|----------|----------|
| Average score | {a_avg} | {b_avg} |
| Pass rate | {a_pass}/{total} | {b_pass}/{total} |
| Cases won | {a_wins} | {b_wins} |
| Ties | {ties} | {ties} |

### Step 4: Generate recommendation

Based on the results, provide:

- **Winner**: which config performed better overall
- **Confidence**: high (>20% gap), medium (5-20% gap), low (<5% gap)
- **Tradeoffs**: cases where the loser actually performed better
- **Recommendation**: one sentence on which config to use and why

Example:
```
Winner: Config A (GPT-4) with HIGH confidence
  Avg score: 0.93 vs 0.71 (+31%)
  A won 7/10 cases, B won 1/10, 2 ties
  Note: B was better on case #5 (creative writing)
  Recommendation: Use Config A for this workload. Consider B only for creative tasks.
```

## Output

Comparison table, statistics, and a recommendation with confidence level.
