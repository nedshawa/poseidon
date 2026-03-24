---
name: deploy
description: >-
  Runs deployment checklists with pre-deploy, deploy, and post-deploy phases.
  USE WHEN the user wants to deploy, release, ship, or push to production.
---

## Instructions

Execute a structured deployment using a three-phase checklist approach.

### Phase 1: Pre-Deploy Checks

Verify all prerequisites before deploying:

- [ ] All tests pass (`bun test` or project-specific test command)
- [ ] No uncommitted changes (`git status` is clean)
- [ ] Branch is up to date with base (`git pull --rebase`)
- [ ] Build succeeds without errors
- [ ] Environment variables are set (check .env.example vs runtime)
- [ ] Database migrations are ready (if applicable)
- [ ] Version/changelog updated (if applicable)

If ANY check fails, STOP and report the issue. Do not proceed.

### Phase 2: Deploy

Execute the deployment:
- Run the project's deploy command (check package.json scripts, Makefile, or deploy config)
- If no deploy command exists, ask the user for deployment method
- Stream output and watch for errors
- Record the deployment timestamp and version/commit hash

Common deploy patterns:
- `bun run deploy` or `bun run build && bun run start`
- `docker compose up -d --build`
- `git push <remote> <branch>` (for git-based deploys)
- Platform CLIs (fly deploy, railway up, etc.)

### Phase 3: Post-Deploy Verification

Confirm the deployment succeeded:
- [ ] Service is responding (health check endpoint or homepage)
- [ ] Key functionality works (smoke test critical paths)
- [ ] Logs show no errors in the first 60 seconds
- [ ] Version endpoint returns expected version (if available)
- [ ] Rollback plan is documented (the previous commit/version)

### Output Format

```
## Deployment Report

**Version:** [commit hash or version]
**Target:** [environment/platform]
**Status:** SUCCESS | FAILED at [phase]

### Pre-Deploy: [PASS/FAIL]
### Deploy: [PASS/FAIL]
### Post-Deploy: [PASS/FAIL]

**Rollback:** `git revert <hash>` or [rollback command]
```

## Scope

NOT for:
- Setting up CI/CD pipelines from scratch
- Infrastructure provisioning (Terraform, Pulumi)
- Database administration
- DNS or SSL certificate management
