# OpenAI Patterns

Reference document for OpenAI's system patterns relevant to building intelligent AI systems.

## Model Family (as of March 2026)

### Models

| Model | Strength | Context | Best For |
|-------|----------|---------|---------|
| **o3** | Deep reasoning | 200K | Complex math, science, code |
| **GPT-5** | General capability | 128K | Most tasks |
| **GPT-4.1** | Code generation | 1M | Long-context code tasks |
| **GPT-4o** | Multimodal, speed | 128K | Vision, audio, balanced |
| **GPT-4o-mini** | Cost-efficient | 128K | Simple tasks, high volume |

### Key Architectural Patterns

#### 1. Reasoning Models (o-series)

**Pattern:** Internal chain-of-thought that the model uses before producing output.

**Relevance to AI systems:**
- o3 demonstrates that thinking time improves accuracy
- PAI's Algorithm mirrors this: OBSERVE → THINK → PLAN → BUILD → EXECUTE → VERIFY → LEARN
- Poseidon's smart mode escalation ensures complex tasks get thinking time

**Key insight:** The quality vs speed trade-off can be managed by classifying tasks and allocating thinking time proportionally.

#### 2. Function Calling / Tool Use

**Pattern:** Structured schema definition for tools, model selects and populates arguments.

**Parallel in PAI:**
- Skills = function definitions (USE WHEN = when to call)
- Workflows = function bodies (the actual implementation)
- Tools = CLI wrappers (deterministic execution)

**Best practices from OpenAI:**
- Define clear schemas with descriptions
- Provide examples in descriptions
- Use enum types for constrained choices
- Support parallel function calls

#### 3. Structured Outputs

**Pattern:** Force model output to conform to a JSON schema.

**Relevance:**
- PAI's PRD format = structured output (YAML frontmatter + markdown sections)
- ISC criteria = structured checkboxes
- Rating signals = structured JSONL

**Design principle:** Structured output is more reliable than natural language for system-to-system communication.

#### 4. Agents SDK (formerly Swarm)

**Pattern:** Multi-agent orchestration with handoffs, guardrails, and tool use.

**Key concepts:**
- **Agent:** An LLM with instructions and tools
- **Handoff:** Transfer control to another agent
- **Guardrail:** Input/output validation on every call
- **Tracing:** Observability for agent execution

**Parallel in PAI:**
- Agent skill = agent composition
- Delegation system = handoffs
- PreToolUse hooks = guardrails
- MEMORY/RAW/ = tracing

#### 5. Evals

**Pattern:** Systematic evaluation of AI model/system performance.

**OpenAI approach:**
- Define golden outputs for test inputs
- Run model against test suite
- Score outputs against golden answers
- Track regression over time

**PAI implementation:**
- Evals workflow in Utilities skill
- Algorithm reflections = per-session eval
- Ratings = user-provided scoring

## Patterns Worth Adopting

### 1. Guardrails on Every Tool Call
OpenAI Agents SDK validates inputs AND outputs on every agent tool call. PAI only validates Bash; Poseidon extends to Edit/Write/Read but still misses Agent and MCP tool calls.

### 2. Structured Tracing
OpenAI provides complete execution traces for debugging. PAI has raw event logging but no structured trace format that connects tool calls to outcomes.

### 3. Systematic Evals
OpenAI emphasizes measuring AI system quality systematically. PAI's eval system exists but is underutilized — most quality signal comes from user ratings rather than automated benchmarks.

### 4. Context Caching
OpenAI (and Gemini) offer context caching — pay once to cache a large context, then reuse across multiple queries at reduced cost. PAI has no equivalent; every session loads full context from scratch.

## OpenAI vs Claude for AI Systems

| Aspect | OpenAI | Claude |
|--------|--------|--------|
| **Reasoning** | o3 (specialized) | Extended thinking (integrated) |
| **Tool use** | Function calling | Native tool use |
| **Agent framework** | Agents SDK | Claude Code + Skills |
| **Guardrails** | SDK-level | Hook-level |
| **Tracing** | Built-in | Custom (MEMORY/RAW/) |
| **Structured output** | JSON mode, response_format | Tool use schemas |
| **Context** | 1M (GPT-4.1) | 1M (Opus 4.6) |
