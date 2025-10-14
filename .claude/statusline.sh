#!/bin/bash

# DevSolo Status Line Script
# Outputs current devsolo session status for Claude Code status line

# ANSI Color Codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
BOLD='\033[1m'
RESET='\033[0m'

# Read JSON input from Claude Code (optional, contains session info)
INPUT=$(cat)

# Extract working directory from JSON input if available
CWD=$(echo "$INPUT" | jq -r '.cwd // empty' 2>/dev/null)

# Extract context/token information from transcript
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // empty' 2>/dev/null)
TOKEN_USED=""
TOKEN_TOTAL=200000  # Claude Code's standard context window
TOKEN_BUDGET=""

if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
  # Sum all token usage from the transcript (only count actual input/output, not cache reads)
  TOKEN_USED=$(jq -s '[.[] | select(.message.usage != null) | .message.usage | ((.input_tokens // 0) + (.output_tokens // 0))] | add' "$TRANSCRIPT_PATH" 2>/dev/null)

  # If transcript is empty or sum failed, set to empty
  if [ "$TOKEN_USED" = "null" ] || [ -z "$TOKEN_USED" ]; then
    TOKEN_USED=""
  fi
fi

# Extract model information if available
# Try to extract model.id first (object format), then fall back to model as string
MODEL_NAME=$(echo "$INPUT" | jq -r 'if .model | type == "object" then .model.id elif .model | type == "string" then .model else .model_name // empty end' 2>/dev/null)
# Format model name to be shorter (e.g., "claude-sonnet-4-5" → "sonnet-4.5")
if [ -n "$MODEL_NAME" ]; then
  MODEL_DISPLAY=$(echo "$MODEL_NAME" | sed -E 's/^claude-//' | sed -E 's/-([0-9]+)-([0-9]+).*$/.\1.\2/' | sed 's/-20[0-9]{6}$//')
else
  MODEL_DISPLAY=""
fi

# Change to workspace directory if provided
if [ -n "$CWD" ]; then
  cd "$CWD" 2>/dev/null || true
fi

# Read current git branch
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "no-branch")

# Get git stats: uncommitted changes and commits ahead/behind remote
GIT_STATS=""
GIT_STATS_CONTENT=""
if [ "$BRANCH" != "no-branch" ]; then
  # Check for uncommitted changes
  CHANGED_FILES=$(git status --porcelain 2>/dev/null | wc -l)
  if [ "$CHANGED_FILES" -gt 0 ]; then
    GIT_STATS_CONTENT="✎ ${YELLOW}${CHANGED_FILES}${RESET}"
  fi

  # Check if branch has upstream
  UPSTREAM=$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null)
  if [ -n "$UPSTREAM" ]; then
    # Get ahead/behind counts
    AHEAD=$(git rev-list --count HEAD@{u}..HEAD 2>/dev/null || echo "0")
    BEHIND=$(git rev-list --count HEAD..HEAD@{u} 2>/dev/null || echo "0")

    if [ "$AHEAD" != "0" ] || [ "$BEHIND" != "0" ]; then
      [ -n "$GIT_STATS_CONTENT" ] && GIT_STATS_CONTENT+=" "
      GIT_STATS_CONTENT+="🔀"
      [ "$AHEAD" != "0" ] && GIT_STATS_CONTENT+=" ${GREEN}↑${AHEAD}${RESET}"
      [ "$BEHIND" != "0" ] && GIT_STATS_CONTENT+=" ${RED}↓${BEHIND}${RESET}"
    fi
  fi

  # Add divider if we have git stats
  if [ -n "$GIT_STATS_CONTENT" ]; then
    GIT_STATS=" ${GRAY}|${RESET} 🌿 ${GIT_STATS_CONTENT}"
  fi
fi

# Check for active devsolo session on current branch
SESSION_DIR=".devsolo/sessions"
SESSION_FILE=""
SESSION_ID=""
SESSION_STATE=""

if [ -d "$SESSION_DIR" ]; then
  # Find session for current branch
  for session in "$SESSION_DIR"/*.json; do
    if [ -f "$session" ]; then
      SESSION_BRANCH=$(jq -r '.branchName // empty' "$session" 2>/dev/null)
      if [ "$SESSION_BRANCH" = "$BRANCH" ]; then
        SESSION_FILE="$session"
        SESSION_ID=$(jq -r '.id // empty' "$session" 2>/dev/null)
        SESSION_STATE=$(jq -r '.currentState // empty' "$session" 2>/dev/null)
        break
      fi
    fi
  done
fi

# Function to create a bar graph for remaining context
create_remaining_bar() {
  local used=$1
  local total=$2
  local width=15

  if [ -z "$used" ] || [ -z "$total" ] || [ "$total" -eq 0 ]; then
    echo ""
    return
  fi

  local remaining=$((total - used))
  local percentage=$((remaining * 100 / total))
  local filled=$((remaining * width / total))

  # Choose color based on remaining capacity (inverse of usage)
  local bar_color=""
  if [ $percentage -gt 50 ]; then
    bar_color="$GREEN"
  elif [ $percentage -gt 20 ]; then
    bar_color="$YELLOW"
  else
    bar_color="$RED"
  fi

  # Build the bar showing remaining capacity
  local bar="${bar_color}"
  for ((i=0; i<filled; i++)); do
    bar+="█"
  done
  bar+="${GRAY}"
  for ((i=filled; i<width; i++)); do
    bar+="░"
  done
  bar+="${RESET}"

  # Format with K/M suffix for readability
  local remaining_display
  if [ $remaining -gt 1000 ]; then
    remaining_display="$((remaining / 1000))K"
  else
    remaining_display="${remaining}"
  fi

  local total_display
  if [ $total -gt 1000 ]; then
    total_display="$((total / 1000))K"
  else
    total_display="${total}"
  fi

  echo -e " ${bar} ${CYAN}${remaining_display}${RESET}/${GRAY}${total_display}${RESET}"
}

# Build status line
# Build context window display if available
CONTEXT_DISPLAY=""
if [ -n "$TOKEN_USED" ] && [ -n "$TOKEN_TOTAL" ]; then
  BAR=$(create_remaining_bar "$TOKEN_USED" "$TOKEN_TOTAL")
  CONTEXT_DISPLAY=" ${GRAY}|${RESET}${BAR}"
elif [ -n "$TOKEN_BUDGET" ]; then
  CONTEXT_DISPLAY=" ${GRAY}|${RESET} ${CYAN}budget: ${TOKEN_BUDGET}${RESET}"
fi

# Build model display if available
MODEL_DISPLAY_FIELD=""
if [ -n "$MODEL_DISPLAY" ]; then
  MODEL_DISPLAY_FIELD=" ${GRAY}|${RESET} ${BLUE}${MODEL_DISPLAY}${RESET}"
fi

if [ -n "$SESSION_ID" ]; then
  # Active session found - show branch with state icon
  # Color/emoji based on state
  state_color=""
  case "$SESSION_STATE" in
    "COMPLETE")
      EMOJI="✅"
      state_color="$GREEN"
      ;;
    "ABORTED")
      EMOJI="❌"
      state_color="$RED"
      ;;
    "WAITING_APPROVAL"|"PR_CREATED")
      EMOJI="⏳"
      state_color="$YELLOW"
      ;;
    "BRANCH_READY")
      EMOJI="📝"
      state_color="$BLUE"
      ;;
    "CHANGES_COMMITTED"|"PUSHED")
      EMOJI="🚀"
      state_color="$MAGENTA"
      ;;
    "REBASING"|"MERGING")
      EMOJI="🔄"
      state_color="$CYAN"
      ;;
    *)
      EMOJI="💻"
      state_color="$CYAN"
      ;;
  esac

  # Show branch in green with state-based emoji
  echo -e "${BOLD}[devsolo]${RESET}  $EMOJI ${GREEN}${BRANCH}${RESET}${GIT_STATS} ${GRAY}|${RESET} ${state_color}${SESSION_STATE}${RESET}${MODEL_DISPLAY_FIELD}${CONTEXT_DISPLAY}"
else
  # No active session
  if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
    # Main branch - show in dimmed white with folder icon
    echo -e "${BOLD}[devsolo]${RESET}  📁 ${GRAY}${BRANCH}${RESET}${GIT_STATS}${MODEL_DISPLAY_FIELD}${CONTEXT_DISPLAY}"
  else
    # Other branch without session - show in yellow with folder icon
    echo -e "${BOLD}[devsolo]${RESET}  📁 ${YELLOW}${BRANCH}${RESET}${GIT_STATS}${MODEL_DISPLAY_FIELD}${CONTEXT_DISPLAY}"
  fi
fi
