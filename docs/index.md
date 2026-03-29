# Poseidon Documentation Index

## Architecture
- [System Architecture](architecture.md) — System diagram, hooks, learning pipeline, security model
- [Founding Principles](founding-principles.md) — 17 principles governing Poseidon's design
- [Context Routing](context-routing.md) — Topic → file path routing table
- [Cloud Execution](cloud-execution.md) — Actions/Pipelines architecture (spec only)

## Core Systems
- [Algorithm (current)](../algorithm/LATEST) — 7-phase execution loop (v1.2)
- [Hook System](hook-system.md) — 5 hooks + 9 handlers, latency budgets, event lifecycle
- [Memory System](memory-system.md) — Project-centric memory, ownership boundaries
- [Skill System](skillsystem.md) — Skill structure, quality gate, dynamic loading
- [Agent System](agent-system.md) — 3-tier agents, named agents, routing rules
- [Learning System](learning-system.md) — Detection, fingerprinting, rules, injection, synthesis

## Operations
- [CLI Architecture](cli-architecture.md) — poseidon.ts wrapper, 21 CLI tools, LLM-agnostic
- [Workflow Index](workflow-index.md) — Catalogue of all 207 workflows across skills
- [Delegation & Parallelization](delegation-system.md) — Model selection, agent patterns, spotcheck
- [Tools Reference](tools-reference.md) — All CLI tools with usage
- [PRD Format](prd-format.md) — PRD.md specification, ISC format, continuation rules
- [Notifications](notifications.md) — Multi-channel notification system

## Reference
- [Decisions Record](decisions_poseidon_1.md) — 39 commits, 14 decision categories
- [Getting Started](getting-started.md) — Install, project management, security
- [Steering Rules](../rules/system.md) — 16 constitutional rules
