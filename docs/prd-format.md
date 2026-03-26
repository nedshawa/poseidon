# PRD Format

Every non-trivial task in Poseidon gets a PRD (Product Requirements Document) stored in `memory/work/{session-id}/PRD.md`. The PRD defines what done looks like before work begins.

## YAML Frontmatter

```yaml
---
task: "Short human-readable task description"
slug: lowercase-hyphen-task-name
effort: small | medium | large | xl
phase: observe | think | plan | build | execute | verify | learn
progress: 0-100
mode: algorithm | native
started: 2026-03-26T10:00:00Z
updated: 2026-03-26T10:30:00Z
---
```

## Body Sections

### Context
Brief background on why this work exists. Link to relevant project memory, decisions, or prior sessions.

### Criteria
ISC (Invariant Success Criteria) checkboxes. Every criterion is atomic — one verifiable end-state in 8-12 words.

```markdown
- [ ] ISC-1: Hook latency stays under 50ms for pre-tool
- [ ] ISC-2: Secret decryption never writes plaintext to disk
- [ ] ISC-3: Unit tests pass for all eight handlers
- [x] ISC-4: Settings schema validates against new fields
```

Anti-criteria use the ISC-A prefix to define what is explicitly out of scope:

```markdown
- [ ] ISC-A1: No UI changes in this session
- [ ] ISC-A2: Database migration not included
```

### Decisions
Key technical decisions made during execution with rationale. Append-only during the session.

### Verification
Evidence that each ISC criterion passed. Test output, file diffs, command results. Written during the VERIFY phase.

## Continuation Rules

When work spans multiple sessions:
1. The new session reads the existing PRD from `memory/work/`
2. `phase` and `progress` are updated to reflect current state
3. `updated` timestamp is refreshed
4. Completed ISC items remain checked; new items may be added
5. The session-end hook archives completed PRDs after 30 days
