# Deep Investigation (Tier 4)

Iterative entity-based research with landscape mapping and priority-driven deep dives.

## Parameters

| Field   | Value                                        |
|---------|----------------------------------------------|
| Agents  | N (scales with entity count)                 |
| Queries | 50+                                          |
| Time    | 20-60 minutes                                |
| Mode    | Iterative loop (one entity per iteration)    |

## When to Use

- "Map the landscape of X", "deep investigation", "investigate everything about X"
- Domain mapping where entities must be discovered first

## Phase 1: Landscape Scan (5-10 min)

Run 10-20 broad queries. Extract all named entities (companies, products, technologies,
people, standards). Build the entity registry:

```
| Entity | Type | Importance | Coverage | Status  |
|--------|------|------------|----------|---------|
| [name] | co.  | CRITICAL   | NONE     | PENDING |
```

Importance: CRITICAL, HIGH, MEDIUM, LOW. Coverage: NONE, PARTIAL, COMPLETE.

## Phase 2: Priority Scoring

`priority = importance_weight * (1 - coverage_ratio)`
Weights: CRITICAL=4, HIGH=3, MEDIUM=2, LOW=1.
Process in descending priority. CRITICAL/HIGH are mandatory. LOW is skipped unless relevant.

## Phase 3: Entity Deep-Dive Loop

For each entity in priority order:
1. Run 3-8 targeted queries about this entity
2. Produce structured profile: what, why, metrics, relationships, recent developments, strengths/weaknesses
3. Save to `memory/work/{slug}/{entity-slug}.md`
4. Update registry coverage. Note cross-links discovered.
5. Loop to next entity.

## Phase 4: Synthesis

After all CRITICAL/HIGH entities are covered: build landscape map, identify patterns,
note gaps, produce final report.

**Exit when:** All CRITICAL=COMPLETE, all HIGH>=PARTIAL, time exhausted or no PENDING above LOW.

## Output Format

```
## Deep Investigation: [Domain]
**Tier:** 4 | **Entities:** [count] | **Sources:** [count]

### Landscape Overview
[Key relationships and structure]

### Entity Profiles
#### [Entity — Type]
[Profile: what, why, metrics, relationships, developments]

### Patterns and Trends
### Gaps and Unknowns
### Entity Registry
### Sources
```

## Artifacts

Saved at `memory/work/{slug}/`: `_registry.md`, `{entity-slug}.md`, `_synthesis.md`.
Allows resuming interrupted investigations.
