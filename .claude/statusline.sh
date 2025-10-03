#!/bin/bash

# Han-Solo Status Line Script
# Outputs current han-solo session status for Claude Code status line

# Read JSON input from Claude Code (optional, contains session info)
INPUT=$(cat)

# Extract working directory from JSON input if available
CWD=$(echo "$INPUT" | jq -r '.cwd // empty' 2>/dev/null)

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
      SESSION_BRANCH=$(jq -r '.gitBranch // empty' "$session" 2>/dev/null)
      if [ "$SESSION_BRANCH" = "$BRANCH" ]; then
        SESSION_FILE="$session"
        SESSION_ID=$(jq -r '.id // empty' "$session" 2>/dev/null)
        SESSION_STATE=$(jq -r '.currentState // empty' "$session" 2>/dev/null)
        break
      fi
    fi
  done
fi

# Build status line
if [ -n "$SESSION_ID" ]; then
  # Active session found
  SHORT_ID="${SESSION_ID:0:8}"

  # Color/emoji based on state
  case "$SESSION_STATE" in
    "COMPLETE")
      EMOJI="✅"
      ;;
    "ABORTED")
      EMOJI="❌"
      ;;
    "WAITING_APPROVAL"|"PR_CREATED")
      EMOJI="⏳"
      ;;
    "BRANCH_READY")
      EMOJI="✏️"
      ;;
    "CHANGES_COMMITTED"|"PUSHED")
      EMOJI="📝"
      ;;
    "REBASING"|"MERGING")
      EMOJI="🔄"
      ;;
    *)
      EMOJI="🚀"
      ;;
  esac

  echo "[han-solo] $EMOJI $SHORT_ID | $BRANCH | $SESSION_STATE"
else
  # No active session
  echo "[han-solo] 📁 $BRANCH | no session"
fi
