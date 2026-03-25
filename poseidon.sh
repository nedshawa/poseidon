#!/bin/bash
# Poseidon — launch with one command
export PATH="$HOME/.bun/bin:$PATH:/usr/local/bin"
export POSEIDON_DIR="${POSEIDON_DIR:-$(cd "$(dirname "$0")" && pwd)}"
exec bun "$POSEIDON_DIR/tools/poseidon.ts" "$@"
