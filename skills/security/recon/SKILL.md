---
name: recon
description: >-
  Network reconnaissance and infrastructure mapping. DNS enumeration, WHOIS
  lookups, port scanning, netblock discovery, and passive intelligence
  gathering. Gracefully degrades when advanced tools are unavailable.
---

# Reconnaissance Sub-Skill

Infrastructure discovery and mapping using a combination of standard system
tools and optional advanced scanners.

## Workflows

| Workflow | File | Use When |
|---|---|---|
| Domain Recon | `workflows/domain-recon.md` | Target is a domain name |
| IP Recon | `workflows/ip-recon.md` | Target is an IP address |
| Netblock Recon | `workflows/netblock-recon.md` | Target is a CIDR range or ASN |
| Passive Recon | `workflows/passive-recon.md` | No active scanning allowed |

## Tool Availability

The skill checks for available tools at runtime and adapts accordingly:

| Tool | Required | Purpose | Fallback |
|---|---|---|---|
| `dig` | Yes | DNS resolution | `nslookup` or `host` |
| `whois` | Yes | Registration data | Web WHOIS services |
| `nmap` | No | Port scanning | Skip port scan phase |
| `curl` | Yes | HTTP probing | `wget` |
| Shodan API | No | Passive port/banner data | Skip enrichment |

## Output Format

All recon workflows produce structured findings:

```
## Findings: [target]

| Finding | Value | Severity | Next Step |
|---|---|---|---|
| Open port | 22/tcp SSH | Info | Verify authorized |
| Wildcard DNS | *.example.com | Medium | Check for subdomain takeover |
```

## Authorization

Before any active scanning (port scans, HTTP probing), the workflow confirms:

1. The operator owns the target or has written authorization
2. The scanning scope is explicitly defined
3. Rate limits are respected (no aggressive scanning by default)

## Graceful Degradation

If `nmap` is not installed, port scanning steps are skipped with a note.
If Shodan API key is not configured, passive enrichment falls back to
DNS-only intelligence. The skill always produces useful output regardless
of which optional tools are available.
