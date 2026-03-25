# IP Reconnaissance Workflow

Intelligence gathering on a specific IP address. Reverse DNS, geolocation,
ASN identification, and port scanning when tools are available.

## Prerequisites

- Target IP address (IPv4 or IPv6)
- Operator confirms ownership or authorization

## Procedure

### Phase 1: Reverse DNS

```bash
dig +short -x $TARGET
host $TARGET
```

### Phase 2: ASN and Network Info

```bash
# Team Cymru ASN lookup
dig +short TXT "$REVERSED_IP.origin.asn.cymru.com"
whois -h whois.cymru.com " -v $TARGET"
```

### Phase 3: Geolocation (passive)

```bash
# Free geolocation API
curl -s "https://ipinfo.io/$TARGET/json"
```

Extract: city, region, country, org, ASN.

### Phase 4: Port Scanning (if nmap available)

```bash
# Check if nmap is installed
command -v nmap >/dev/null 2>&1 || echo "SKIP: nmap not installed"

# Quick top-ports scan (respectful, non-aggressive)
nmap -T3 --top-ports 100 -sV --open $TARGET

# If more detail needed
nmap -T3 -p- -sV --open $TARGET
```

If nmap is not available, skip this phase and note it in findings.

### Phase 5: Banner Grabbing (fallback without nmap)

```bash
# Manual banner grab on common ports
for port in 22 80 443 8080 8443; do
  timeout 3 bash -c "echo '' | nc -w2 $TARGET $port" 2>/dev/null
done

# HTTP server header
curl -sI "http://$TARGET" | head -5
curl -sI "https://$TARGET" | head -5
```

## Output

Findings table: Finding, Value, Severity, Next Step.
Flag unexpected open ports as Medium, unpatched service versions as High,
missing reverse DNS as Info.
