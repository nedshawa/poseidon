---
name: security
description: >-
  Security assessment and intelligence — network reconnaissance, web application
  security testing, prompt injection analysis, and security monitoring. Project-aware
  scanning that uses tech stack context for targeted analysis. USE WHEN security
  audit, vulnerability scan, recon, reconnaissance, pentest, OWASP, threat model,
  prompt injection, security news, CVE, port scan, subdomain, DNS, WHOIS.
---

# Security Skill

Multi-domain security assessment system. Routes requests to specialized sub-skills
based on the type of security work needed.

## Sub-Skill Routing

| Trigger Keywords | Sub-Skill | Description |
|---|---|---|
| recon, DNS, WHOIS, subdomain, port scan, nmap, IP lookup, netblock | `recon/` | Network reconnaissance and infrastructure mapping |
| OWASP, pentest, web vuln, XSS, SQLi, threat model, STRIDE | `web-assessment/` | Web application security testing |
| prompt injection, jailbreak, LLM security, AI safety | `prompt-injection/` | LLM and AI system security testing |
| CVE, security news, advisory, vulnerability watch | `monitoring/` | Security intelligence and CVE monitoring |

## Project-Scoped Context

When run within a project directory, the skill reads project configuration to
focus scanning on relevant technology:

1. **Read project RULES.md** (if present) for declared tech stack
2. **Read package.json / requirements.txt / go.mod** for dependency inventory
3. **Tailor scan scope** to technologies actually in use
4. **Skip irrelevant checks** (e.g., no PHP checks on a Node project)

## Findings Integration

Critical and high findings are formatted as actionable steering rules:

1. Findings rated Critical or High produce a suggested RULES.md entry
2. The operator decides whether to add the rule to the project
3. Rules follow the format: `SECURITY: [finding] — [remediation]`

## Scope Boundaries

- **In scope**: Infrastructure recon, web app testing, LLM security, CVE monitoring
- **Out of scope**: Source code review (use the `code-review` skill instead)
- **Out of scope**: People/organization OSINT (use the `investigation` skill instead)
- **Out of scope**: Exploitation of systems the operator does not own

## Ethical Boundaries

All scanning and testing targets systems the operator owns or has explicit
written authorization to test. The skill includes authorization confirmation
prompts before any active scanning.

## Quick Start

- `security recon example.com` — domain reconnaissance
- `security owasp https://myapp.local` — OWASP Top 10 scan
- `security prompt-injection test ./my-llm-app` — LLM security testing
- `security cve-watch` — check project dependencies for known CVEs

## References

- `references/owasp-top10.md` — OWASP Top 10 quick reference
- `references/tools-guide.md` — Recommended security tools by category
