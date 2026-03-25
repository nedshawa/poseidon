# OWASP Top 10 (2021) Quick Reference

Standard awareness document for web application security. Each category
represents a class of vulnerability ranked by prevalence and impact.

## The Top 10

### A01:2021 — Broken Access Control
Restrictions on authenticated users are not properly enforced. Attackers
access unauthorized functions or data. Includes IDOR, CORS misconfig,
path traversal, and missing function-level access control.

### A02:2021 — Cryptographic Failures
Failures related to cryptography that lead to sensitive data exposure.
Includes: cleartext transmission, weak algorithms, missing encryption at
rest, improper certificate validation.

### A03:2021 — Injection
User-supplied data is sent to an interpreter without validation or
sanitization. Includes: SQL injection, NoSQL injection, OS command
injection, LDAP injection, XSS (cross-site scripting).

### A04:2021 — Insecure Design
Architectural and design flaws that cannot be fixed by implementation
alone. Missing threat modeling, insecure design patterns, insufficient
business logic controls.

### A05:2021 — Security Misconfiguration
Missing hardening, default credentials, unnecessary features enabled,
overly permissive permissions, missing security headers, verbose error
messages exposing stack traces.

### A06:2021 — Vulnerable and Outdated Components
Using components with known vulnerabilities. Includes: unpatched OS,
outdated frameworks, libraries with published CVEs, unmaintained
dependencies.

### A07:2021 — Identification and Authentication Failures
Weak authentication mechanisms. Includes: credential stuffing, brute
force, default passwords, missing MFA, improper session management,
insecure password recovery.

### A08:2021 — Software and Data Integrity Failures
Assumptions about software updates, critical data, and CI/CD pipelines
without verifying integrity. Includes: insecure deserialization, unsigned
updates, compromised CI/CD.

### A09:2021 — Security Logging and Monitoring Failures
Insufficient logging, monitoring, and alerting. Breaches go undetected.
Login attempts not logged, warnings and errors produce no log entries,
logs not monitored for suspicious activity.

### A10:2021 — Server-Side Request Forgery (SSRF)
Application fetches a remote resource without validating the user-supplied
URL. Attacker can force the server to make requests to internal services,
cloud metadata endpoints, or other unintended targets.
