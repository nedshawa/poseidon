# Poseidon Guides Index

Operational knowledge — HOW to do things in Poseidon.

## Templates (Create New Things)

| Guide | Purpose |
|-------|---------|
| [System Manifest](templates/system-manifest.md) | How to document a multi-component system |
| [Project Setup](templates/project-setup.md) | How to create and configure a new project |
| [Skill Creation](templates/skill-creation.md) | How to build, validate, and maintain skills |

## Operations (Day-to-Day)

| Guide | Purpose |
|-------|---------|
| [Secret Management](operations/secret-management.md) | How to add, use, and rotate API keys |
| [Research Workflow](operations/research-workflow.md) | How to conduct effective multi-agent research |
| [Algorithm Execution](operations/algorithm-execution.md) | How to run the 7-phase Algorithm correctly |
| [Agent Deployment](operations/agent-deployment.md) | How to compose, deploy, and coordinate agents |

## Security (Best Practices)

| Guide | Purpose |
|-------|---------|
| [API Key Handling](security/api-key-handling.md) | Secret lifecycle and 6 persistence points |
| [Tool Safety](security/tool-safety.md) | Safe patterns for Bash, Edit, Write, Read |

## Universal vs Project-Specific

**Universal guides** (this directory) teach HOW to do things — they apply to every project.

**Project-specific guides** (in `memory/projects/{id}/knowledge/guides/`) teach how to do things specific to THAT project — data sources, domain conventions, deployment targets.

| Type | Location | Example |
|------|----------|---------|
| Universal | `guides/` | "How to use SecretClient" |
| Project-specific | `memory/projects/{id}/knowledge/guides/` | "How to access CoreLogic data for this project" |
