# Task Classification Methodology

Reference document for classifying task complexity and determining optimal processing strategy.

## The Classification Problem

AI systems must quickly and accurately determine how much effort a task requires. Under-classification wastes quality (simple treatment for complex tasks). Over-classification wastes time (complex treatment for simple tasks).

## Multi-Signal Approach

### Why Keyword-Only Fails (PAI's Gap)

PAI v4.0.3 classifies tasks based on keyword matching in CLAUDE.md:
- "Greetings, ratings, acknowledgments" → MINIMAL
- "Single-step, quick tasks" → NATIVE
- "Everything else" → ALGORITHM

**Problems:**
- Misses thinking questions: "how should we architect this?" has no action keywords
- Misses design questions: "why does the system do X?" sounds informational but needs Algorithm
- Can't learn: fixed rules, no adaptation from experience
- No gradation: binary NATIVE/ALGORITHM, no effort tier signal

### Poseidon's 11-Signal Scorer (v2.4.1)

Poseidon addressed this with a multi-signal complexity scorer:

| Signal | Weight | What It Detects |
|--------|--------|----------------|
| Thinking question | +25 | "how should we", "why does", "what's the best way" |
| Investigation question | +20 | "investigate", "research", "deep dive" |
| Learned pattern | +20 (cap) | Past tasks that needed Algorithm |
| Word count | +15 | Long requests = complex |
| Enumeration | +15 | Bullet lists, numbered items |
| Scope words | +10 | "comprehensive", "complete", "full" |
| File references | +10 | Multiple files = multi-file work |
| Multi-sentence | +10 | >3 sentences = complex |
| Active project | +5 | Within established project context |
| Uncertainty | +5 | "I'm not sure", "maybe" |
| Time pressure | -10 | "quickly", "fast", "just" |

**Auto-escalation threshold:** 56+ → Algorithm mode
**Learning:** Learns from session abandonments (user quit mid-Algorithm = possible misclassification)

## Task Taxonomy

### By Cognitive Type

| Type | Examples | Typical Mode | Effort Tier |
|------|---------|-------------|------------|
| **Recall** | "What's the syntax for X?" | MINIMAL | N/A |
| **Lookup** | "Show me the config for service Y" | NATIVE | N/A |
| **Transform** | "Rename this variable" | NATIVE | N/A |
| **Implement** | "Add error handling to this endpoint" | ALGORITHM | Standard |
| **Design** | "Design a caching layer" | ALGORITHM | Extended |
| **Investigate** | "Why is this test flaking?" | ALGORITHM | Standard-Extended |
| **Architect** | "Design the microservice decomposition" | ALGORITHM | Advanced-Deep |
| **Research** | "Map the AI agent landscape" | ALGORITHM | Extended-Deep |

### By Scope

| Scope | Indicator | Mode | Effort |
|-------|----------|------|--------|
| Single line | One file, one change | NATIVE | N/A |
| Single file | Multiple changes in one file | NATIVE-ALGORITHM | Standard |
| Multi-file | Changes across 2-5 files | ALGORITHM | Standard-Extended |
| Cross-system | Changes across multiple systems | ALGORITHM | Advanced |
| Full system | New system or major refactor | ALGORITHM | Deep-Comprehensive |

### By Risk

| Risk Level | Indicators | Minimum Treatment |
|-----------|-----------|------------------|
| **Low** | Read-only, reversible, local | NATIVE |
| **Medium** | Creates files, modifies code | ALGORITHM (Standard) |
| **High** | Modifies shared state, deploys | ALGORITHM (Extended+) |
| **Critical** | Destructive, security-sensitive | ALGORITHM (Advanced+) + human approval |

## Classification Algorithm

```
function classifyTask(request):
  score = 0

  // Signal detection
  if containsThinkingQuestion(request): score += 25
  if containsInvestigationQuestion(request): score += 20
  if matchesLearnedPattern(request): score += min(20, learnedWeight)
  if wordCount(request) > 100: score += 15
  if hasEnumeration(request): score += 15
  if hasScopeWords(request): score += 10
  if countFileReferences(request) > 1: score += 10
  if sentenceCount(request) > 3: score += 10
  if hasActiveProject(): score += 5
  if hasUncertainty(request): score += 5
  if hasTimePressure(request): score -= 10

  // Map to mode
  if score <= 15: return MINIMAL
  if score <= 55: return NATIVE
  return ALGORITHM with effortTier(score)

function effortTier(score):
  if score <= 75: return Standard   // <2min, 8-16 ISC
  if score <= 100: return Extended  // <8min, 16-32 ISC
  if score <= 130: return Advanced  // <16min, 24-48 ISC
  if score <= 160: return Deep      // <32min, 40-80 ISC
  return Comprehensive              // <120min, 64-150 ISC
```

## Calibration

### Over-Classification Indicators
- User overrides to NATIVE frequently
- Sessions finish well under time budget
- ISC criteria are trivially met

### Under-Classification Indicators
- User escalates to Algorithm manually
- Sessions abandoned mid-task
- Quality complaints on tasks that were treated as NATIVE

### Improving Classification Over Time
1. Track classification vs actual effort (was the tier right?)
2. Track user overrides (did they disagree?)
3. Track session outcomes (did it succeed at the assigned tier?)
4. Adjust weights based on accumulated evidence
