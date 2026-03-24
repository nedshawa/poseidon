---
name: security-audit
description: >-
  Scans for OWASP top 10 vulnerabilities, dependency CVEs, and secrets in code.
  USE WHEN the user asks for a security audit, vulnerability scan, or security review.
---

## Instructions

Perform a structured security audit covering the most common vulnerability classes.

### Step 1: Dependency Scan

Check for known vulnerabilities in dependencies:
- Run `bun audit` or `npm audit` (Node.js projects)
- Check `pip audit` or `safety check` (Python projects)
- Review lock files for outdated packages with known CVEs
- Flag any dependency not updated in 12+ months

### Step 2: Secret Scan

Search the codebase for exposed secrets:
- API keys, tokens, passwords in source files
- Hardcoded credentials in config files
- `.env` files committed to git (check `git log --all -- '*.env'`)
- Private keys or certificates in the repository
- Connection strings with embedded passwords

Search patterns:
- `password`, `secret`, `api_key`, `token`, `bearer`
- Base64-encoded strings over 20 characters
- Strings matching key formats (AWS: `AKIA...`, GitHub: `ghp_...`)

### Step 3: OWASP Top 10 Review

Check for each category:

**A01 Broken Access Control**
- Missing auth checks on endpoints
- Direct object reference without ownership validation
- Missing rate limiting on sensitive endpoints

**A02 Cryptographic Failures**
- Sensitive data transmitted without TLS
- Weak hashing algorithms (MD5, SHA1 for passwords)
- Missing encryption for PII at rest

**A03 Injection**
- SQL queries built with string concatenation
- Shell command execution with user input
- Template injection in server-rendered pages
- Path traversal in file operations

**A07 Authentication Failures**
- No brute-force protection
- Weak password requirements
- Session tokens in URLs
- Missing session expiration

**A09 Logging Failures**
- Sensitive data in logs (passwords, tokens, PII)
- Missing audit trail for admin actions
- No alerting on repeated auth failures

### Step 4: Output Format

```
## Security Audit: [project]

**Risk Level:** CRITICAL | HIGH | MEDIUM | LOW

### Findings

| # | Severity | Category          | Location        | Description          |
|---|----------|-------------------|-----------------|----------------------|
| 1 | CRITICAL | Secret Exposure   | src/config.ts:5 | Hardcoded API key    |
| 2 | HIGH     | Injection         | src/db.ts:23    | SQL concatenation    |

### Recommendations
1. [Prioritized fix for finding 1]
2. [Prioritized fix for finding 2]

### Clean Areas
[Areas that passed review with no issues]
```

## Scope

NOT for:
- Penetration testing or active exploitation
- Network security or firewall configuration
- Compliance audits (SOC2, HIPAA, PCI)
- Runtime security monitoring
