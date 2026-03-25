# Domain Reconnaissance Workflow

Comprehensive domain intelligence gathering. Enumerates DNS records, discovers
subdomains, maps mail infrastructure, and retrieves registration data.

## Prerequisites

- Target domain name (e.g., `example.com`)
- Operator confirms ownership or authorization

## Procedure

### Phase 1: DNS Enumeration

```bash
# A/AAAA records
dig +short A $TARGET
dig +short AAAA $TARGET

# Nameservers
dig +short NS $TARGET

# Mail servers
dig +short MX $TARGET

# TXT records (SPF, DKIM, DMARC)
dig +short TXT $TARGET
dig +short TXT _dmarc.$TARGET

# SOA record
dig +short SOA $TARGET

# CAA records (certificate authority authorization)
dig +short CAA $TARGET
```

### Phase 2: WHOIS Registration

```bash
whois $TARGET
```

Extract: registrar, creation date, expiry date, nameservers, registrant org.

### Phase 3: Subdomain Discovery

```bash
# Common subdomain brute-check (passive, DNS-only)
for sub in www mail ftp api dev staging admin portal vpn git; do
  dig +short A "$sub.$TARGET" 2>/dev/null
done

# Certificate Transparency logs
curl -s "https://crt.sh/?q=%25.$TARGET&output=json" | \
  jq -r '.[].name_value' | sort -u
```

### Phase 4: HTTP Probing

```bash
# Check web presence
curl -sI "https://$TARGET" -o /dev/null -w "%{http_code} %{redirect_url}"
curl -sI "http://$TARGET" -o /dev/null -w "%{http_code} %{redirect_url}"

# Security headers check
curl -sI "https://$TARGET" | grep -iE \
  '(strict-transport|content-security|x-frame|x-content-type|referrer-policy)'
```

## Output

Produce a findings table with columns: Finding, Value, Severity, Next Step.
Flag missing security headers as Medium, wildcard DNS as Medium, expired WHOIS
as High, missing DMARC as Medium.
