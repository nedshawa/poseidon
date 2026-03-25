#!/bin/bash
# start.sh — Start Poseidon in a persistent tmux session
# Usage: bash tools/start.sh

POSEIDON_DIR="${POSEIDON_DIR:-$HOME/.poseidon}"
SESSION_NAME="poseidon"

# Check if already running
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "Poseidon is already running in tmux session '$SESSION_NAME'"
    echo "  Attach: tmux attach -t $SESSION_NAME"
    echo "  Kill:   tmux kill-session -t $SESSION_NAME"
    exit 0
fi

# Ensure log directory exists
mkdir -p "$POSEIDON_DIR/logs"

# Get channel flags from channels.ts
CHANNELS=$(POSEIDON_DIR="$POSEIDON_DIR" bun "$POSEIDON_DIR/tools/channels.ts" --start 2>/dev/null)

if [ -z "$CHANNELS" ]; then
    CHANNELS="claude"
fi

# Start in tmux with auto-restart loop
tmux new-session -d -s "$SESSION_NAME" \
    "while true; do $CHANNELS; echo 'Poseidon restarting in 10s...'; sleep 10; done"

echo "Poseidon started in tmux session '$SESSION_NAME'"
echo "  Attach: tmux attach -t $SESSION_NAME"
echo "  Kill:   tmux kill-session -t $SESSION_NAME"
