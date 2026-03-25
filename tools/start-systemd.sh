#!/bin/bash
# start-systemd.sh — Systemd-compatible start (no tmux, direct exec)
# Called by poseidon.service — do not run manually (use start.sh instead)

POSEIDON_DIR="${POSEIDON_DIR:-$HOME/.poseidon}"

# Ensure log directory exists
mkdir -p "$POSEIDON_DIR/logs"

# Build the channel command
CHANNELS=$(POSEIDON_DIR="$POSEIDON_DIR" bun "$POSEIDON_DIR/tools/channels.ts" --start 2>/dev/null)

if [ -z "$CHANNELS" ]; then
    CHANNELS="claude"
fi

# Direct exec — systemd manages the process lifecycle
exec $CHANNELS
