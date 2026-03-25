---
name: monitoring
description: >-
  Security intelligence and vulnerability monitoring. Aggregates security news
  from trusted sources and watches project dependencies for known CVEs.
  Project-scoped dependency scanning.
---

# Monitoring Sub-Skill

Ongoing security intelligence gathering and vulnerability tracking. Monitors
the threat landscape and checks project dependencies against known
vulnerability databases.

## Workflows

| Workflow | File | Use When |
|---|---|---|
| Security News | `workflows/security-news.md` | Want latest security news and advisories |
| CVE Watch | `workflows/cve-watch.md` | Check project dependencies for known CVEs |

## Sources

| Source | Type | URL |
|---|---|---|
| tl;dr sec | Newsletter digest | https://tldrsec.com |
| NVD | CVE database | https://nvd.nist.gov |
| GitHub Advisories | Dependency vulns | https://github.com/advisories |
| CISA KEV | Exploited vulns | https://www.cisa.gov/known-exploited-vulnerabilities |
| OSV | Open source vulns | https://osv.dev |

## Project-Scoped Scanning

When run within a project, the monitoring skill automatically detects
dependency files and scans against vulnerability databases:

| File | Ecosystem |
|---|---|
| `package.json` / `bun.lockb` | npm |
| `requirements.txt` / `Pipfile.lock` | PyPI |
| `go.mod` / `go.sum` | Go modules |
| `Cargo.lock` | Rust crates |
| `Gemfile.lock` | Ruby gems |
