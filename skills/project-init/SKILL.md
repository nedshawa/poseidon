---
name: project-init
description: >-
  Initializes a new Poseidon project with memory, registry entry, and active status.
  USE WHEN the user asks to create a new project, start a project, or init a project.
---

## Instructions

Set up a new Poseidon-managed project with proper structure and registry entry.

### Step 1: Gather Project Info

Determine from the user's request:
- **Project name**: lowercase, hyphenated (e.g., `my-new-api`)
- **Project path**: where the code will live (e.g., `~/projects/my-new-api`)
- **Description**: one-line summary of what the project does

If any of these are unclear, ask the user before proceeding.

### Step 2: Create Project Memory

Create the project memory directory from the template:

```
memory/projects/{project-id}/
```

If a `.template/` directory exists in `memory/projects/`, copy its contents. Otherwise create:

```
memory/projects/{project-id}/
  MEMORY.md          # Project-specific memory and decisions
  sessions/          # Session logs directory
```

Initialize `MEMORY.md` with:
```markdown
# {Project Name}

**Path:** {project-path}
**Created:** {date}
**Description:** {description}

## Decisions

## Notes
```

### Step 3: Register in PROJECTS.md

Add an entry to `PROJECTS.md` (create if it does not exist):

```markdown
| {project-id} | {description} | {project-path} | active |
```

If the file already exists, append to the existing table.

### Step 4: Set as Active Project

Update `settings.json` to set the new project as the active project:
- Set `activeProject` to the project ID
- Preserve all other settings

### Step 5: Initialize Project Directory

If the project path does not exist yet:
- Create the directory
- Initialize git (`git init`)
- Create a minimal `.gitignore` appropriate for the detected stack
- Create an initial `README.md` with the project name and description

If the project path already exists:
- Do NOT overwrite any existing files
- Only add the Poseidon memory registration

### Output Format

```
## Project Initialized: {project-name}

**ID:** {project-id}
**Path:** {project-path}
**Memory:** memory/projects/{project-id}/
**Registry:** Added to PROJECTS.md
**Status:** Active
```

## Scope

NOT for:
- Scaffolding application code (use framework-specific generators)
- Setting up CI/CD pipelines
- Creating monorepo structures
- Configuring deployment infrastructure
