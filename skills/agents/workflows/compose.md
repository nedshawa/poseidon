---
name: compose
description: Interactive agent composition wizard
---

## Purpose

Walk the user through building a custom agent persona step by step, selecting
traits from each dimension and configuring optional features.

## Steps

### Step 1: Domain Discovery
Ask: "What domain should this agent specialize in?"
Use the answer to suggest relevant expertise and personality traits.

### Step 2: Name
Ask for an agent name (lowercase, hyphen-separated). Validate it does not
conflict with an existing agent in `~/.poseidon/agents/`.

### Step 3: Personality Traits
Load `data/traits.yaml` and present the `personality` section.
Let the user pick 1-3 traits. Warn if they select potentially conflicting
combinations (e.g., analytical + creative) -- allow it but note the tension.

### Step 4: Expertise Areas
Present the `expertise` section from `data/traits.yaml`.
Let the user pick 1-3 areas. Auto-suggest based on the domain from Step 1.

### Step 5: Approach
Present the `approach` section. User picks exactly one approach style.

### Step 6: Communication Style
Ask for a one-line description of how this agent communicates.
Example: "Terse, uses analogies, avoids jargon"

### Step 7: Voice (Optional)
If the user wants voice output, present voices from `data/voices.yaml`.
They can pick an existing voice or provide a custom ElevenLabs voice ID.
Skip if not needed.

### Step 8: Project Scope (Optional)
Ask if this agent should be limited to specific projects.
Default: global (empty `project_scope` array).

### Step 9: Generate and Save
Build the agent YAML with all selections. Save to:
`~/.poseidon/agents/{name}.yaml`

Confirm: "Agent '{name}' created. Invoke with /agent {name}"

## Output Format

Show a summary card before saving:

```
Agent: {name}
Description: {auto-generated from traits}
Personality: {selected traits}
Expertise: {selected areas}
Approach: {selected approach}
Communication: {style description}
Voice: {voice name or "none"}
Scope: {global or project list}
```

## Validation Rules

- Name must be lowercase alphanumeric with hyphens only
- At least one personality trait required
- At least one expertise area required
- Exactly one approach required
- Description auto-generated if user does not provide one
