# Capability Manifest

The capability manifest (`poseidon-manifest.yaml`) is the single source of truth for what a Poseidon instance can do. Every hook, skill, agent, and tool reads from this file. If a service is not enabled here, it does not exist.

## How Services Are Enabled and Disabled

Each service entry in the manifest has an `enabled` field:

```yaml
perplexity:
  enabled: false
  category: research
  agent_type: PerplexityResearcher
  purpose: "Real-time web research"
  requires_key: true
```

When `enabled: true`, the service is available to all skills, hooks, and agents. When `enabled: false`, the service is invisible — never attempted, never referenced, never mentioned in output. This is not a soft toggle; disabled means the service does not exist from the agent's perspective.

## How the Manifest Affects Behavior

**Research workflows** only dispatch to agents whose services are enabled. If only `claude_websearch` is enabled, all research runs through Claude's built-in web search. Enable `perplexity`, `gemini`, or `grok` and research workflows automatically gain multi-agent triangulation.

**Voice** is a no-op when `elevenlabs` is disabled. The notification handler checks `capabilities.voice_enabled` and skips TTS calls entirely — no errors, no latency, no failed HTTP requests.

**Notifications** work the same way. If no notification service is enabled (`ntfy`, `discord`, `telegram`), push notification calls silently return without error.

**Finance and design tools** gate on their respective capability flags. The FMP client, screeners, and Stitch SDK all check the manifest before making API calls.

## Derived Capabilities

The bottom of the manifest contains a `capabilities` block that is auto-computed from the services above:

```yaml
capabilities:
  research_agents: [claude_websearch, perplexity]
  research_tier_max: standard    # quick=1, standard=2-3, extensive=4+
  voice_enabled: true
  notifications_enabled: false
  finance_enabled: false
  design_enabled: false
```

These fields are regenerated every time the manifest is read by `manifest-loader` or modified by `manifest.ts`. Do not edit them manually — your changes will be overwritten.

The `research_tier_max` determines research depth:
- **quick** — 1 agent, single-pass lookup
- **standard** — 2-3 agents, triangulation possible
- **extensive** — 4+ agents, full multi-perspective synthesis

## Adding a New Service

The simplest path: paste your API key in conversation. The pre-prompt hook auto-detects keys (patterns like `sk-*`, `pplx-*`, `AKIA*`, etc.), stores them through the active secret backend, and updates the manifest to enable the service. No manual YAML editing required.

If you prefer manual setup:

1. Store the key: `bun tools/secret.ts write services/perplexity` (pipe JSON to stdin)
2. Edit `poseidon-manifest.yaml` and set `enabled: true` for the service
3. Run `bun tools/manifest.ts` to verify the change and recompute capabilities

## Switching Secret Backends

Poseidon supports four secret backends: `age` (default, file-based encryption), `vault` (HashiCorp Vault), `onepassword` (1Password CLI), and `bitwarden` (Bitwarden CLI).

Switch with:

```bash
bun tools/manifest.ts --backend vault
```

This updates `secrets.backend` in the manifest. Each backend has its own config block under `secrets.config`. Uncomment and fill in the relevant section before switching.

The secret backend only affects where keys are stored and retrieved. It does not change which services are enabled — those are controlled independently by the `enabled` field on each service.

## CLI Commands

```bash
# Show summary of enabled capabilities
bun tools/manifest.ts

# List all services with enabled/disabled status
bun tools/manifest.ts --list

# Enable or disable a service
bun tools/manifest.ts --enable perplexity
bun tools/manifest.ts --disable elevenlabs

# Switch secret backend
bun tools/manifest.ts --backend vault

# Export manifest as JSON (for scripting)
bun tools/manifest.ts --json

# Show help
bun tools/manifest.ts --help
```

## Design Principles

The manifest implements two core Poseidon principles:

**Principle #21 — Graceful degradation.** Every capability degrades to a no-op when its service is disabled. No crashes, no error dialogs, no "service unavailable" messages cluttering output. The system runs with whatever is available and stays silent about what is not.

**Rule #27 — Single source of truth.** There is exactly one place that declares what this instance can do. Hooks do not hardcode service checks. Skills do not maintain their own feature flags. Everything reads from `poseidon-manifest.yaml`. If you need to know whether voice works, you check one file.
