# OWASP Top 10 Scan Workflow

Systematic check of a web application against the OWASP Top 10 (2021).

## Prerequisites

- Target URL (e.g., `https://myapp.local`)
- Operator confirms ownership or authorization

## Procedure

### A01 — Broken Access Control

```bash
curl -s "$TARGET/api/users/1" -H "Authorization: Bearer $TOKEN"
curl -s "$TARGET/api/users/2" -H "Authorization: Bearer $TOKEN"
curl -s "$TARGET/admin" -H "Authorization: Bearer $USER_TOKEN"
curl -sI "$TARGET" -H "Origin: https://evil.com" | grep -i access-control
```

### A02 — Cryptographic Failures

```bash
openssl s_client -connect "$HOST:443" </dev/null 2>&1 | grep "Protocol\|Cipher"
curl -sI "http://$HOST" -o /dev/null -w "%{http_code} %{redirect_url}"
```

### A03 — Injection

```bash
curl -s "$TARGET/search?q=test'%20OR%201=1--"
curl -s "$TARGET/api/ping?host=127.0.0.1;id"
```

### A04 — Insecure Design

Manual review: missing rate limiting, absent bot detection, no fraud controls.

### A05 — Security Misconfiguration

```bash
curl -sI "$TARGET" | grep -iE \
  '(strict-transport|content-security|x-frame|x-content-type|permissions-policy)'
curl -s "$TARGET/nonexistent-path-$(date +%s)" | head -20
curl -sI "$TARGET/actuator/health" "$TARGET/.env" "$TARGET/phpinfo.php"
```

### A06 — Vulnerable Components

Parse dependency files, cross-reference versions with NVD/OSV databases.

### A07 — Auth Failures

Test: default credentials, brute-force protection, session fixation.

### A08 — Data Integrity Failures

Check: deserialization endpoints, CI/CD integrity, unsigned updates.

### A09 — Logging Failures

Verify: login attempts logged, failed access logged, logs not public.

### A10 — SSRF

```bash
curl -s "$TARGET/api/fetch?url=http://169.254.169.254/latest/meta-data/"
```

## Output

Findings table per category: code, description, evidence, severity, remediation.
