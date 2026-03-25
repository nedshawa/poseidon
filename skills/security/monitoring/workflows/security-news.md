# Security News Aggregation Workflow

Gathers the latest security news, advisories, and threat intelligence from
trusted sources. Produces a prioritized briefing.

## Procedure

### Phase 1: Source Aggregation

Check the following sources for recent activity:

```bash
# CISA Known Exploited Vulnerabilities (JSON feed)
curl -s "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json" | \
  jq '.vulnerabilities | sort_by(.dateAdded) | reverse | .[0:10]'

# GitHub Security Advisories (requires gh CLI)
gh api /advisories --jq '.[0:10] | .[] | {ghsa_id, summary, severity, published_at}'

# NVD recent CVEs
curl -s "https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=10" | \
  jq '.vulnerabilities[].cve | {id, descriptions: .descriptions[0].value, published}'
```

### Phase 2: Relevance Filtering

If running within a project context, filter news for relevance:

- Match CVEs against project tech stack
- Prioritize advisories for project dependencies
- Flag any CISA KEV entries matching project technologies

### Phase 3: Severity Prioritization

Sort findings by operational impact:

1. **Actively exploited** (CISA KEV) — immediate action
2. **Critical CVSS 9.0+** — urgent review
3. **High CVSS 7.0-8.9** — planned remediation
4. **Medium and below** — awareness only

## Output

```
## Security Briefing: [date]

### Actively Exploited
| CVE | Product | Added to KEV | Action Required |
|---|---|---|---|

### Critical Advisories
| CVE | Product | CVSS | Summary |
|---|---|---|---|

### Notable News
- [headline and one-line summary]
```
