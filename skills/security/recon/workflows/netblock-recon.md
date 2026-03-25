# Netblock Reconnaissance Workflow

Maps a CIDR range or ASN to discover related infrastructure. Identifies
live hosts, shared hosting patterns, and organizational network boundaries.

## Prerequisites

- Target CIDR (e.g., `203.0.113.0/24`) or ASN (e.g., `AS12345`)
- Operator confirms ownership or authorization for the entire range

## Procedure

### Phase 1: ASN to Prefix Mapping

```bash
# If starting from ASN, find announced prefixes
whois -h whois.radb.net -- "-i origin AS$ASN"

# BGP prefix lookup
curl -s "https://stat.ripe.net/data/announced-prefixes/data.json?resource=AS$ASN" | \
  jq '.data.prefixes[].prefix'
```

### Phase 2: WHOIS on Netblock

```bash
# ARIN/RIPE/APNIC lookup
whois -h whois.arin.net "n $CIDR"
whois -h whois.ripe.net "$CIDR"
```

Extract: organization name, abuse contact, allocation date, network name.

### Phase 3: Live Host Discovery

```bash
# Ping sweep (if nmap available)
nmap -T3 -sn $CIDR

# DNS-based discovery (no nmap needed)
for ip in $(seq 1 254); do
  dig +short -x "${NETWORK_PREFIX}.${ip}" 2>/dev/null
done
```

### Phase 4: Reverse DNS Patterns

```bash
# Look for naming patterns that reveal infrastructure purpose
# e.g., mail-*, web-*, db-*, vpn-*
# Aggregate by subdomain pattern
```

### Phase 5: Related Infrastructure

```bash
# Check if same ASN has other ranges
whois -h whois.cymru.com " -v $SAMPLE_IP"

# Look for shared DNS nameservers across the block
```

## Output

Findings table: Finding, Value, Severity, Next Step.
Summarize: total IPs in range, live hosts found, naming patterns,
organizational ownership chain, related ASNs.
