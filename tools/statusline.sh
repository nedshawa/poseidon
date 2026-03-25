#!/bin/bash
# Poseidon Status Line — runs via Claude Code statusLine config
# Shows 4 lines: system health, project context, today's learning, context window

set -o pipefail

POSEIDON_DIR="${POSEIDON_DIR:-$HOME/.poseidon}"
SETTINGS="$POSEIDON_DIR/settings.json"

# Read input from Claude Code (JSON with context_window, model, session info)
input=$(cat)

# Colors (ANSI 256)
BLUE='\033[38;2;88;166;255m'
GREEN='\033[38;2;63;185;80m'
YELLOW='\033[38;2;210;153;34m'
RED='\033[38;2;248;81;73m'
CYAN='\033[38;2;121;192;255m'
DIM='\033[38;2;110;118;129m'
WHITE='\033[38;2;201;209;217m'
RESET='\033[0m'

# Parse Claude Code input JSON
context_pct=$(echo "$input" | jq -r '.context_window.used_percentage // 0' 2>/dev/null)
context_max=$(echo "$input" | jq -r '.context_window.context_window_size // 200000' 2>/dev/null)
context_remaining=$(echo "$input" | jq -r '.context_window.remaining_percentage // 100' 2>/dev/null)
total_input=$(echo "$input" | jq -r '.context_window.total_input_tokens // 0' 2>/dev/null)
total_output=$(echo "$input" | jq -r '.context_window.total_output_tokens // 0' 2>/dev/null)
model_name=$(echo "$input" | jq -r '.model.display_name // "unknown"' 2>/dev/null)

# Ensure defaults
context_pct=${context_pct:-0}
context_max=${context_max:-200000}

# Agent name from settings
agent_name=$(jq -r '.identity.agent_name // "Poseidon"' "$SETTINGS" 2>/dev/null)
agent_name="${agent_name:-Poseidon}"

# Active project
active_project=$(jq -r '.project.active_project // "_general"' "$SETTINGS" 2>/dev/null)
active_project="${active_project:-_general}"

# Count projects (excluding .template)
project_count=$(find "$POSEIDON_DIR/memory/projects" -mindepth 1 -maxdepth 1 -type d ! -name ".template" 2>/dev/null | wc -l)
project_count=$((project_count + 0))

# Count skills
skill_count=$(find "$POSEIDON_DIR/skills" -name "SKILL.md" 2>/dev/null | wc -l)
skill_count=$((skill_count + 0))

# Count rules
rule_count=$(find "$POSEIDON_DIR/memory/learning/rules" -name "*.md" 2>/dev/null | wc -l)
rule_count=$((rule_count + 0))

# Count candidates
candidate_count=$(find "$POSEIDON_DIR/memory/learning/candidates" -name "*.md" 2>/dev/null | wc -l)
candidate_count=$((candidate_count + 0))

# Errors today
today=$(date +%Y-%m-%d)
errors_today=0
if [ -f "$POSEIDON_DIR/memory/learning/error-log.jsonl" ]; then
    errors_today=$(grep -c "$today" "$POSEIDON_DIR/memory/learning/error-log.jsonl" 2>/dev/null || echo 0)
fi

# Rules added today
rules_today=0
if [ -d "$POSEIDON_DIR/memory/learning/rules" ]; then
    rules_today=$(find "$POSEIDON_DIR/memory/learning/rules" -name "*.md" -newer "$POSEIDON_DIR/memory/learning/rules" -mtime 0 2>/dev/null | wc -l)
fi

# Average rating (last 10)
avg_rating="—"
if [ -f "$POSEIDON_DIR/memory/learning/signals/ratings.jsonl" ] && [ -s "$POSEIDON_DIR/memory/learning/signals/ratings.jsonl" ]; then
    avg_rating=$(tail -10 "$POSEIDON_DIR/memory/learning/signals/ratings.jsonl" | jq -r '.score // empty' 2>/dev/null | awk '{s+=$1; n++} END {if(n>0) printf "%.1f", s/n; else print "—"}')
fi

# Learning score from metrics
learning_display="calibrating"
if [ -f "$POSEIDON_DIR/memory/learning/metrics.jsonl" ] && [ -s "$POSEIDON_DIR/memory/learning/metrics.jsonl" ]; then
    score=$(tail -1 "$POSEIDON_DIR/memory/learning/metrics.jsonl" | jq -r '.score // empty' 2>/dev/null)
    if [ -n "$score" ] && [ "$score" != "null" ]; then
        learning_display="${score}/100"
    fi
fi

# Git info
git_info=""
if git rev-parse --is-inside-work-tree &>/dev/null; then
    branch=$(git branch --show-current 2>/dev/null)
    dirty=$(git status --porcelain 2>/dev/null | wc -l)
    if [ "$dirty" -eq 0 ]; then
        git_info="${branch} ✓"
    else
        git_info="${branch} +${dirty}"
    fi
fi

# Context bar (10 chars)
pct_int=${context_pct%.*}
pct_int=${pct_int:-0}
filled=$((pct_int / 10))
empty=$((10 - filled))
bar=""
for ((i=0; i<filled; i++)); do bar+="█"; done
for ((i=0; i<empty; i++)); do bar+="░"; done

# Token display (K format)
total_tokens=$((total_input + total_output))
tokens_k=$((total_tokens / 1000))
max_k=$((context_max / 1000))
remaining_k=$(( (context_max - total_tokens) / 1000 ))
[ "$remaining_k" -lt 0 ] && remaining_k=0

# Context color based on usage
ctx_color="$GREEN"
[ "$pct_int" -gt 50 ] && ctx_color="$YELLOW"
[ "$pct_int" -gt 75 ] && ctx_color="$RED"

# Line 1: System health
echo -e "${CYAN}⚡${RESET} ${WHITE}${agent_name}${RESET} ${DIM}│${RESET} ${DIM}${model_name}${RESET} ${DIM}│${RESET} ${BLUE}${skill_count} skills${RESET} ${DIM}│${RESET} ${GREEN}${rule_count} rules${RESET} ${DIM}│${RESET} Learning: ${CYAN}${learning_display}${RESET} ${DIM}│${RESET} ${errors_today} errors today"

# Line 2: Project context
echo -e "${CYAN}📂${RESET} ${WHITE}${active_project}${RESET} ${DIM}│${RESET} ${project_count} projects ${DIM}│${RESET} ${git_info} ${DIM}│${RESET} ${candidate_count} pending"

# Line 3: Today's learning
echo -e "${CYAN}📊${RESET} Today: ${GREEN}+${rules_today} rules${RESET} ${DIM}│${RESET} ${errors_today} errors ${DIM}│${RESET} Rating: ${WHITE}${avg_rating}${RESET}"

# Line 4: Context
echo -e "${CYAN}🧠${RESET} ${ctx_color}[${bar}] ${pct_int}%${RESET} ${DIM}│${RESET} ${tokens_k}K/${max_k}K ${DIM}│${RESET} ${remaining_k}K left"
