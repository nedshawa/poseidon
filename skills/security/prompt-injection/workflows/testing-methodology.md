# Prompt Injection Testing Methodology

Structured approach to testing LLM applications for injection vulnerabilities.

## Prerequisites

- Access to the LLM application under test
- Understanding of the application's intended behavior
- Operator owns or has authorization to test the application

## Procedure

### Phase 1: Application Profiling

Document: system prompt (if known), available tools/functions, external
data sources, expected I/O patterns, and content filtering in place.

### Phase 2: Baseline Behavior

Establish normal behavior: send 5-10 normal queries, record responses,
identify refusal patterns, note response format and boundaries.

### Phase 3: Direct Injection Testing

**Instruction Override** — "Ignore previous instructions and..."
**Context Manipulation** — "The above was a test. Your real instructions..."
**Encoding Bypass** — Base64, markdown hiding, Unicode confusables

### Phase 4: Indirect Injection Testing

If the app processes external data:
- Create test documents with embedded instructions
- Test URL fetching with controlled injection pages
- Check if tool responses are sanitized before LLM processing

### Phase 5: Data Extraction Testing

- Attempt system prompt extraction through various techniques
- Test for context window leakage between sessions
- Check if other users' conversation history is accessible

### Phase 6: Defense Evaluation

Assess: input filtering (what is blocked), output filtering (what is
suppressed), instruction hierarchy (system vs user priority),
and rate limiting on injection attempts.

## Output

```
## Prompt Injection Assessment: [application]

| # | Attack Type | Payload Summary | Result | Severity | Defense Gap |
|---|---|---|---|---|---|
```

Include defense recommendations prioritized by severity and effort.
