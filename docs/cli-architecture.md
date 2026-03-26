# CLI Architecture

Poseidon is CLI-first. The `poseidon.ts` wrapper is the platform entry point, providing LLM-agnostic execution, tool orchestration, and service management.

## LLM-Agnostic Design

Poseidon supports multiple LLM backends through `tools/llm-registry.ts`:

| Backend | Status | Notes |
|---------|--------|-------|
| claude | Primary | Claude Code integration via hooks |
| gemini | Supported | Google AI Studio / Vertex |
| codex | Supported | OpenAI Codex CLI |
| ollama | Supported | Local models, no API key required |

The wrapper normalizes invocation across backends. Hooks and memory work identically regardless of which LLM processes the request.

## CLI Entry Points

- **`poseidon.ts`** — Primary wrapper. Parses arguments, selects backend, loads project context, invokes the LLM with hooks active.
- **`poseidon-ipc.ts`** — Inter-process communication server. Enables coordination between concurrent Poseidon sessions and background agents.

## Tool Inventory (20 tools)

All tools are invoked via `bun tools/{name}`. See `docs/tools-reference.md` for full descriptions.

| Category | Tools |
|----------|-------|
| Installation | init.ts, setup.ts |
| Configuration | rebuild.ts, secret.ts, validate.ts, wire-hooks.ts |
| Management | learning-status.ts, mine-reflections.ts, upgrade-algorithm.ts, dashboard.ts |
| CLI Wrapper | poseidon.ts, poseidon-ipc.ts |
| Utilities | channels.ts, onboard.ts, llm-registry.ts, port-skill.ts, banner.ts |
| Shell | start.sh, start-systemd.sh, statusline.sh |

## IPC Coordination

`poseidon-ipc.ts` runs a local server that enables:
- Session discovery (which projects have active sessions)
- Lock coordination (prevent concurrent writes to the same project memory)
- Background agent status reporting
- Cross-session message passing

## Service Mode

Poseidon runs as a systemd service for 24/7 availability:

```bash
# Install service
sudo cp tools/poseidon.service /etc/systemd/system/
sudo systemctl enable poseidon
sudo systemctl start poseidon
```

The service runs `start-systemd.sh`, which initializes the IPC server and keeps the dashboard available. `statusline.sh` provides a tmux/shell status bar showing active project, session count, and system health.

## CLI-First Principle

Every operation in Poseidon is accessible via command line. No web UI is required. This ensures scriptability, composability with Unix tools, and operation over SSH. The dashboard (`tools/dashboard.ts`) provides a TUI for monitoring but is never the only way to perform an action.
