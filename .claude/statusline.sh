#!/bin/bash

# Han-Solo Status Line Script
# Outputs current han-solo session status for Claude Code status line

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

# Extract context/token information if available
TOKEN_USED=$(echo "$INPUT" | jq -r '.tokens_used // .token_count // .context.used // empty' 2>/dev/null)
TOKEN_TOTAL=$(echo "$INPUT" | jq -r '.tokens_total // .token_limit // .context.total // .context.limit // empty' 2>/dev/null)
TOKEN_BUDGET=$(echo "$INPUT" | jq -r '.budget.token_budget // .token_budget // empty' 2>/dev/null)

# Change to workspace directory if provided
if [ -n "$CWD" ]; then
  cd "$CWD" 2>/dev/null || true
fi

# Read current git branch
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "no-branch")

# Check for active han-solo session on current branch
SESSION_DIR=".hansolo/sessions"
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

# Function to create a bar graph
create_bar() {
  local used=$1
  local total=$2
  local width=10

  if [ -z "$used" ] || [ -z "$total" ] || [ "$total" -eq 0 ]; then
    echo ""
    return
  fi

  local percentage=$((used * 100 / total))
  local filled=$((used * width / total))

  # Choose color based on usage
  local bar_color=""
  if [ $percentage -lt 50 ]; then
    bar_color="$GREEN"
  elif [ $percentage -lt 80 ]; then
    bar_color="$YELLOW"
  else
    bar_color="$RED"
  fi

  # Build the bar
  local bar="${bar_color}"
  for ((i=0; i<filled; i++)); do
    bar+="█"
  done
  bar+="${GRAY}"
  for ((i=filled; i<width; i++)); do
    bar+="░"
  done
  bar+="${RESET}"

  echo -e " ${bar} ${percentage}%"
}

# Build status line
if [ -n "$SESSION_ID" ]; then
  # Active session found
  SHORT_ID="${SESSION_ID:0:8}"

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
      EMOJI="📝"
      state_color="$MAGENTA"
      ;;
    "REBASING"|"MERGING")
      EMOJI="🔄"
      state_color="$CYAN"
      ;;
    *)
      EMOJI="🚀"
      state_color="$CYAN"
      ;;
  esac

  # Build context window display if available
  CONTEXT_DISPLAY=""
  if [ -n "$TOKEN_USED" ] && [ -n "$TOKEN_TOTAL" ]; then
    BAR=$(create_bar "$TOKEN_USED" "$TOKEN_TOTAL")
    CONTEXT_DISPLAY="${GRAY}|${RESET} ${CYAN}${TOKEN_USED}${RESET}/${CYAN}${TOKEN_TOTAL}${RESET}${BAR}"
  elif [ -n "$TOKEN_BUDGET" ]; then
    CONTEXT_DISPLAY="${GRAY}|${RESET} ${CYAN}budget: ${TOKEN_BUDGET}${RESET}"
  fi

  echo -e "${BOLD}[han-solo]${RESET} $EMOJI ${GREEN}${SHORT_ID}${RESET} ${GRAY}|${RESET} ${YELLOW}${BRANCH}${RESET} ${GRAY}|${RESET} ${state_color}${SESSION_STATE}${RESET}${CONTEXT_DISPLAY}"
else
  # No active session
  # Build context window display if available
  CONTEXT_DISPLAY=""
  if [ -n "$TOKEN_USED" ] && [ -n "$TOKEN_TOTAL" ]; then
    BAR=$(create_bar "$TOKEN_USED" "$TOKEN_TOTAL")
    CONTEXT_DISPLAY=" ${GRAY}|${RESET} ${CYAN}${TOKEN_USED}${RESET}/${CYAN}${TOKEN_TOTAL}${RESET}${BAR}"
  elif [ -n "$TOKEN_BUDGET" ]; then
    CONTEXT_DISPLAY=" ${GRAY}|${RESET} ${CYAN}budget: ${TOKEN_BUDGET}${RESET}"
  fi

  echo -e "${BOLD}[han-solo]${RESET} 📁 ${YELLOW}${BRANCH}${RESET} ${GRAY}|${RESET} ${GRAY}no session${RESET}${CONTEXT_DISPLAY}"
fi
