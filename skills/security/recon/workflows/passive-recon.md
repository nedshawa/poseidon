# Passive Reconnaissance Workflow

Intelligence from public data only. No packets sent to the target.
Suitable when active scanning is not authorized.

## Prerequisites

- Target domain, IP, or organization name

## Procedure

### Phase 1: DNS Intelligence

```bash
# Standard DNS records (queries go to public resolvers, not target)
dig +short A $TARGET @8.8.8.8
dig +short MX $TARGET @8.8.8.8
dig +short NS $TARGET @8.8.8.8
dig +short TXT $TARGET @8.8.8.8
```

### Phase 2: Certificate Transparency

```bash
# Historical and current certificates
curl -s "https://crt.sh/?q=%25.$TARGET&output=json" | \
  jq -r '.[].name_value' | sort -u

# Extract unique subdomains from CT logs
```

### Phase 3: WHOIS and Registration

```bash
whois $TARGET
# Extract: registrar, dates, nameservers, registrant (if not redacted)
```

### Phase 4: Web Archive

```bash
# Check historical snapshots
curl -s "https://web.archive.org/web/timemap/link/$TARGET" | head -20

# Technology detection from cached pages
curl -s "https://web.archive.org/web/2024/*/$TARGET" | head -5
```

### Phase 5: Search Engine Intelligence

```bash
# Public search queries (manual, not automated scraping)
# site:example.com filetype:pdf
# site:example.com inurl:admin
# "example.com" site:github.com
```

Document suggested search queries for the operator to run manually.

### Phase 6: Public Code Repositories

Search public repositories for references to the target domain:
- GitHub code search for domain references
- Exposed configuration files
- API keys or credentials in public commits

## Output

Findings table: Finding, Source, Severity, Next Step.
All findings include the public source they came from. No active scanning
results are included.
