# Data Sources Guide

**How Poseidon manages external data sources with quality-based fallback routing.**

## Architecture

```
User asks for data (e.g., "get latest stock prices")
    ↓
Detect domain: finance
    ↓
data-sources.yaml: find all finance sources
    ↓
Sort by quality: FMP (premium) > Yahoo Finance (free)
    ↓
Check manifest: is FMP enabled?
    ↓
YES → use FMP (highest quality)
NO → follow fallback: FMP → Yahoo Finance (free, always available)
    ↓
Return data from best available source
```

## Quality Tiers

| Tier | Characteristics | Example |
|------|----------------|---------|
| **Premium** | Paid API, structured data, reliable, high rate limits | FMP, Perplexity, Apify |
| **Standard** | Free API with limits, good quality, may rate-limit | FRED, BLS, Brave Search |
| **Free** | No key needed, scraping-based or built-in, lower reliability | Yahoo Finance, Claude WebSearch, YouTube |

## Fallback Chains

| Domain | Premium → Standard → Free |
|--------|--------------------------|
| **Finance (stocks)** | FMP → Yahoo Finance |
| **Finance (economics)** | FRED API → FRED website (scraping) |
| **Research** | Perplexity/Gemini → Brave → Claude WebSearch |
| **Media** | Replicate → OpenAI Images |
| **Scraping** | Apify → Bright Data |

## Domain Coverage

| Domain | Sources | Skills Using |
|--------|---------|-------------|
| finance | FMP, Yahoo, FRED, BLS, Treasury, EIA | equity-research, technical-analysis, daily-screener, us-metrics, watchlist |
| research | Perplexity, Gemini, Grok, Claude, Brave | research |
| scraping | Apify, Bright Data | scraping |
| media | Replicate, OpenAI Images | media |
| voice | ElevenLabs, Deepgram | voice-completion, content-analysis |
| security | Shodan, IPinfo | security |
| content | YouTube, Fabric | content-analysis, research |
| notifications | ntfy, Discord, Telegram | notifications |
| infrastructure | GitHub, Google Calendar | commit, deploy, calendar |

## How to Add a Data Source

1. Add entry to `data-sources.yaml` with all fields
2. If it requires an API key, add the corresponding service to `poseidon-manifest.yaml`
3. Add API key via `bun tools/manifest.ts --enable <service>` or paste naturally in conversation

## Connection to Manifest

The `manifest_service` field in data-sources.yaml links each source to its manifest entry. If the manifest service is disabled, the data source is considered unavailable and the fallback chain activates.

```
data-sources.yaml: manifest_service: fmp
    → checks: poseidon-manifest.yaml: services.fmp.enabled
    → if true: source available
    → if false: follow fallback chain
```

## Auto-Indexing

When a new API key is pasted in conversation:

1. **Key pattern match** — checked against `key_patterns` in data-sources.yaml
   - If match → auto-identify service, enable in manifest, confirm to user
   - Example: `pplx-abc123...` matches Perplexity → auto-enabled

2. **No pattern match** — Poseidon asks 5 questions:
   - Service name, domain, cost model, what it provides, docs URL
   - Auto-generates entry in data-sources.yaml
   - Determines fallback chain by domain + cost tier

3. **Setup wizard** — reads from data-sources.yaml (not services.yaml)
   - Shows 💰 for paid, 🔄 for freemium, 🆓 for free
   - Displays cost_note so user knows exact pricing

## CLI

```bash
# View available data sources (from data-source-router)
bun tools/manifest.ts --list   # Shows enabled services
```

## Founding Principle #22 / Rule #29

Data source routing is enshrined as a permanent pillar:
- **Principle #22:** Data Source Awareness — use best available, follow fallback chain
- **Rule #29:** Data access routes through the data source index — never blind-attempt
