# Security Tools Guide

Recommended tools organized by security domain. Includes installation
commands for common package managers.

## Reconnaissance Tools

| Tool | Purpose | Install |
|---|---|---|
| `dig` | DNS queries | `apt install dnsutils` / `brew install bind` |
| `whois` | Registration data | `apt install whois` / `brew install whois` |
| `nmap` | Port scanning | `apt install nmap` / `brew install nmap` |
| `nslookup` | DNS lookup | Included with `dnsutils` |
| `amass` | Subdomain enum | `go install github.com/owasp-amass/amass/v4/...@master` |
| `subfinder` | Subdomain discovery | `go install github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest` |
| `masscan` | Fast port scan | `apt install masscan` / build from source |

## Web Application Testing

| Tool | Purpose | Install |
|---|---|---|
| `curl` | HTTP requests | Pre-installed on most systems |
| `nikto` | Web vuln scanner | `apt install nikto` |
| `sqlmap` | SQL injection | `apt install sqlmap` / `pip install sqlmap` |
| `ffuf` | Fuzzer | `go install github.com/ffuf/ffuf/v2@latest` |
| `nuclei` | Template scanner | `go install github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest` |
| `Playwright` | Browser testing | `bun add playwright` / `npm install playwright` |

## Network and TLS

| Tool | Purpose | Install |
|---|---|---|
| `openssl` | TLS analysis | Pre-installed on most systems |
| `testssl.sh` | TLS config check | `git clone https://github.com/drwetter/testssl.sh` |
| `sslyze` | SSL scanner | `pip install sslyze` |
| `tcpdump` | Packet capture | `apt install tcpdump` |
| `wireshark` | Packet analysis | `apt install wireshark` / `brew install wireshark` |

## Vulnerability Databases

| Source | URL | API |
|---|---|---|
| NVD | https://nvd.nist.gov | REST API, free |
| OSV | https://osv.dev | REST API, free |
| GitHub Advisories | https://github.com/advisories | GraphQL via `gh` CLI |
| CISA KEV | https://www.cisa.gov/known-exploited-vulnerabilities | JSON feed |
| Exploit-DB | https://www.exploit-db.com | `searchsploit` CLI |

## LLM Security

| Tool | Purpose | Install |
|---|---|---|
| `garak` | LLM vuln scanner | `pip install garak` |
| `promptfoo` | LLM red-teaming | `bun add promptfoo` / `npm install promptfoo` |
| `rebuff` | Injection detection | `pip install rebuff` |

## General Advice

- Start with tools already installed on the system (`dig`, `curl`, `openssl`)
- Add specialized tools only when needed for specific assessments
- Keep tools updated — security tools with outdated signatures miss new vulns
- Verify tool integrity after download (check GPG signatures or checksums)
