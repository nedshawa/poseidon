---
name: web-assessment
description: >-
  Web application security testing using OWASP methodology. Systematic
  vulnerability scanning, structured penetration testing, and STRIDE-based
  threat modeling. Browser-based testing with Playwright where applicable.
---

# Web Assessment Sub-Skill

Structured web application security testing grounded in OWASP standards
and industry-standard penetration testing methodology.

## Workflows

| Workflow | File | Use When |
|---|---|---|
| OWASP Scan | `workflows/owasp-scan.md` | Systematic OWASP Top 10 check |
| Pentest Methodology | `workflows/pentest-methodology.md` | Full penetration test |
| Threat Model | `workflows/threat-model.md` | Architecture-level threat analysis |

## Approach

Testing follows a checklist-driven approach to ensure consistent coverage:

1. **OWASP Top 10** serves as the minimum baseline for every assessment
2. **Pentest methodology** provides structure for deeper testing
3. **Threat modeling** identifies architectural risks before testing begins

## Tool Requirements

| Tool | Required | Purpose |
|---|---|---|
| `curl` | Yes | HTTP request crafting |
| `openssl` | Yes | TLS/certificate analysis |
| Playwright | No | Browser-based testing, JavaScript-heavy apps |
| `nikto` | No | Automated web vulnerability scanning |
| `sqlmap` | No | SQL injection testing |

## Severity Rating

All findings use a consistent severity scale:

| Severity | Criteria |
|---|---|
| Critical | Remote code execution, auth bypass, data breach |
| High | Significant data exposure, privilege escalation |
| Medium | Information disclosure, missing security controls |
| Low | Minor issues, defense-in-depth gaps |
| Info | Observations, best practice recommendations |

## Output Format

```
## Web Assessment: [target]

| # | Finding | Severity | Category | Evidence | Remediation |
|---|---|---|---|---|---|
| 1 | SQL Injection in /api/search | Critical | A03:2021 | payload: ' OR 1=1-- | Parameterized queries |
```

## Ethical Boundaries

Testing targets only applications the operator owns or has written
authorization to test. No automated exploitation without explicit approval.
Findings are reported, not exploited.
