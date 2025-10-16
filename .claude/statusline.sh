#!/bin/bash

# DevSolo Status Line Script
# Outputs current devsolo session status for Claude Code status line

# ANSI Color Codes
RED='\033[0;31m'
BOLD_RED='\033[1;31m'
GREEN='\033[0;32m'
BOLD_GREEN='\033[1;32m'
YELLOW='\033[0;33m'
BOLD_YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BRIGHT_BLUE='\033[0;94m'
BOLD_BLUE='\033[1;34m'
BOLD_BRIGHT_BLUE='\033[1;94m'
MAGENTA='\033[0;35m'
BOLD_MAGENTA='\033[1;35m'
BRIGHT_MAGENTA='\033[0;95m'
BOLD_BRIGHT_MAGENTA='\033[1;95m'
CYAN='\033[0;36m'
BOLD_CYAN='\033[1;36m'
WHITE='\033[0;37m'
BOLD_WHITE='\033[1;37m'
GRAY='\033[0;90m'
BOLD_GRAY='\033[1;90m'
BOLD_DARK_GRAY='\033[1;30m'
BOLD='\033[1m'
BLACK='\033[0;30m'
BOLD_BLACK='\033[1;30m'
BOLD_DARK_ORANGE='\033[1;38;5;58m'
RESET='\033[0m'

# Read JSON input from Claude Code (optional, contains session info)
INPUT=$(cat)

# DEBUG: Log the input for troubleshooting
echo "$INPUT" > /tmp/statusline-input-debug.json 2>/dev/null || true

# Extract working directory from JSON input if available
CWD=$(echo "$INPUT" | jq -r '.cwd // empty' 2>/dev/null)

# Extract context/token information from transcript
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // empty' 2>/dev/null)
TOKEN_USED="0"  # Default to 0 to show "Pending..." when no transcript data available
TOKEN_TOTAL=200000  # Claude Code's standard context window
TOKEN_BUDGET=""

if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
  # Get context length from the MOST RECENT message (inspired by ccstatusline)
  # Context = input_tokens + cache_read_input_tokens
  # Note: cache_creation_input_tokens represents tokens WRITTEN to cache and should NOT be added
  # as they are already included in the input - adding them would double-count those tokens
  TOKEN_USED=$(tail -1 "$TRANSCRIPT_PATH" | jq '.message.usage | (.input_tokens + (.cache_read_input_tokens // 0))' 2>/dev/null)

  # If transcript is empty or extraction failed, default to 0 to show "Pending..." state
  if [ "$TOKEN_USED" = "null" ] || [ -z "$TOKEN_USED" ]; then
    TOKEN_USED="0"
  fi
fi

# Extract model information if available
# Try to extract model display_name first (object format), then fall back to model as string
MODEL_DISPLAY=$(echo "$INPUT" | jq -r 'if .model | type == "object" then .model.display_name elif .model | type == "string" then .model else .model_name // empty end' 2>/dev/null)
# If we got an ID instead of display name, format it (e.g., "claude-sonnet-4-5" → "sonnet-4.5")
if [ -n "$MODEL_DISPLAY" ] && [[ "$MODEL_DISPLAY" == claude-* ]]; then
  MODEL_DISPLAY=$(echo "$MODEL_DISPLAY" | sed -E 's/^claude-//' | sed -E 's/-([0-9]+)-([0-9]+).*$/.\1.\2/' | sed 's/-20[0-9]{6}$//')
fi

# Change to workspace directory if provided
if [ -n "$CWD" ]; then
  cd "$CWD" 2>/dev/null || true
fi

# Read current git branch
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "no-branch")

# Get git stats: Powerlevel10k-style indicators
GIT_STATS=""
GIT_STATS_CONTENT=""
if [ "$BRANCH" != "no-branch" ]; then
  # Parse git status for different types of changes
  STATUS_OUTPUT=$(git status --porcelain 2>/dev/null)

  if [ -n "$STATUS_OUTPUT" ]; then
    # Count different types of changes
    STAGED=$(echo "$STATUS_OUTPUT" | grep -c '^[AMDRC]' 2>/dev/null || echo "0")
    MODIFIED=$(echo "$STATUS_OUTPUT" | grep -c '^ M' 2>/dev/null || echo "0")
    UNTRACKED=$(echo "$STATUS_OUTPUT" | grep -c '^??' 2>/dev/null || echo "0")
    DELETED=$(echo "$STATUS_OUTPUT" | grep -c '^ D' 2>/dev/null || echo "0")

    # Build stats string - only show non-zero counts (rainbow style colors, bold)
    [ "$STAGED" -gt 0 ] 2>/dev/null && GIT_STATS_CONTENT+="${BOLD_GREEN}+${STAGED}${RESET} "
    [ "$MODIFIED" -gt 0 ] 2>/dev/null && GIT_STATS_CONTENT+="${BOLD_YELLOW}*${MODIFIED}${RESET} "
    [ "$UNTRACKED" -gt 0 ] 2>/dev/null && GIT_STATS_CONTENT+="${BOLD_BLUE}!${UNTRACKED}${RESET} "
    [ "$DELETED" -gt 0 ] 2>/dev/null && GIT_STATS_CONTENT+="${BOLD_MAGENTA}-${DELETED}${RESET} "
  fi

  # Check if branch has upstream
  UPSTREAM=$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null)
  if [ -n "$UPSTREAM" ]; then
    # Get ahead/behind counts
    AHEAD=$(git rev-list --count HEAD@{u}..HEAD 2>/dev/null || echo "0")
    BEHIND=$(git rev-list --count HEAD..HEAD@{u} 2>/dev/null || echo "0")

    [ "$AHEAD" != "0" ] && GIT_STATS_CONTENT+="${BOLD_CYAN}⇡${AHEAD}${RESET} "
    [ "$BEHIND" != "0" ] && GIT_STATS_CONTENT+="${BOLD_MAGENTA}⇣${BEHIND}${RESET} "
  fi

  # Add divider if we have git stats (trim trailing space)
  if [ -n "$GIT_STATS_CONTENT" ]; then
    GIT_STATS=" ${GRAY}|${RESET} ${GIT_STATS_CONTENT% }"
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

  # Count active sessions (not COMPLETE or ABORTED)
  ACTIVE_SESSION_COUNT=0
  for session in "$SESSION_DIR"/*.json; do
    if [ -f "$session" ]; then
      STATE=$(jq -r '.currentState // empty' "$session" 2>/dev/null)
      if [ "$STATE" != "COMPLETE" ] && [ "$STATE" != "ABORTED" ] && [ -n "$STATE" ]; then
        ACTIVE_SESSION_COUNT=$((ACTIVE_SESSION_COUNT + 1))
      fi
    fi
  done
fi

# Function to create a bar graph for context usage
create_remaining_bar() {
  local used=$1
  local total=$2
  local width=16

  if [ -z "$used" ] || [ -z "$total" ] || [ "$total" -eq 0 ]; then
    echo ""
    return
  fi

  # Calculate autocompact buffer (22.5% of total, matches Claude Code's setting)
  local autocompact=$((total * 225 / 1000))
  local effective_limit=$((total - autocompact))

  # Calculate usage percentage against effective limit (not total)
  local usage_percentage=$((used * 100 / effective_limit))
  local filled=$((used * width / effective_limit))

  # Cap filled at width to handle edge cases
  if [ $filled -gt $width ]; then
    filled=$width
  fi

  # Calculate where the free space ends and autocompact buffer begins
  local free_end=$((effective_limit * width / total))

  # Choose background color based on usage (bar fills as you use more)
  local bg_filled=""
  local bg_free="\033[100m"  # Dark gray background for free usable space
  local bg_buffer="\033[48;5;240m"  # Medium gray for autocompact buffer (reserved, lighter for dark text)
  if [ $usage_percentage -lt 50 ]; then
    bg_filled="\033[42m"  # Green background - plenty of space
  elif [ $usage_percentage -lt 80 ]; then
    bg_filled="\033[43m"  # Yellow background - getting full
  else
    bg_filled="\033[41m"  # Red background - almost full
  fi

  # Build text - show "Pending..." when just starting
  local text
  if [ $used -lt 1000 ]; then
    text="Pending..."
  else
    # Format with K/M suffix for readability - show used/effective_limit
    local used_display
    if [ $used -gt 1000 ]; then
      used_display="$((used / 1000))K"
    else
      used_display="${used}"
    fi

    local limit_display
    if [ $effective_limit -gt 1000 ]; then
      limit_display="$((effective_limit / 1000))K"
    else
      limit_display="${effective_limit}"
    fi

    text="${used_display}/${limit_display}"
  fi

  local text_len=${#text}
  local text_start=$(((width - text_len) / 2))
  local text_end=$((text_start + text_len))

  # Build the bar with text overlay - three sections:
  # 1. Used tokens (0 to filled)
  # 2. Free usable space (filled to free_end)
  # 3. Autocompact buffer (free_end to width)
  local bar=""
  for ((i=0; i<width; i++)); do
    # Determine background color for this position
    local bg=""
    if [ $i -lt $filled ]; then
      bg="$bg_filled"  # Used tokens
    elif [ $i -lt $free_end ]; then
      bg="$bg_free"  # Free usable space
    else
      bg="$bg_buffer"  # Autocompact buffer (reserved)
    fi

    # Determine if this position has text
    if [ $i -ge $text_start ] && [ $i -lt $text_end ]; then
      local char_idx=$((i - text_start))
      local char="${text:$char_idx:1}"
      bar+="${bg}\033[1;38;5;232m${char}"  # Bold text
    else
      bar+="${bg} "
    fi
  done
  bar+="${RESET}"

  echo -e " ${bar}"
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

# Function to center text within a fixed width
center_text() {
  local text=$1
  local width=$2
  local text_len=${#text}

  if [ $text_len -ge $width ]; then
    echo "$text"
    return
  fi

  local total_padding=$((width - text_len))
  local left_padding=$((total_padding / 2))
  local right_padding=$((total_padding - left_padding))

  local result=""
  for ((i=0; i<left_padding; i++)); do
    result+=" "
  done
  result+="$text"
  for ((i=0; i<right_padding; i++)); do
    result+=" "
  done

  echo "$result"
}

# Build model display if available
MODEL_DISPLAY_FIELD=""
if [ -n "$MODEL_DISPLAY" ]; then
  # Center the model name in a fixed width of 16 characters
  CENTERED_MODEL=$(center_text "$MODEL_DISPLAY" 16)

  # Choose background color based on model type
  if [[ "$MODEL_DISPLAY" =~ [Oo]pus ]]; then
    # Dark blue background for Opus
    BG_COLOR="\033[48;5;27m"
  else
    # Dark orange background for Sonnet and other models
    BG_COLOR="\033[48;5;58m"
  fi

  MODEL_DISPLAY_FIELD=" ${GRAY}|${RESET} ${BG_COLOR}${BOLD_WHITE}${CENTERED_MODEL}${RESET}"
fi

# Build active sessions display
ACTIVE_SESSIONS_DISPLAY=""
if [ -n "$ACTIVE_SESSION_COUNT" ] && [ "$ACTIVE_SESSION_COUNT" -gt 0 ]; then
  ACTIVE_SESSIONS_DISPLAY=" ${GRAY}|${RESET} 🟢 ${GRAY}Sessions:${RESET} ${CYAN}${ACTIVE_SESSION_COUNT}${RESET}"
fi

if [ -n "$SESSION_ID" ]; then
  # Active session found - show branch with state icon
  # Color/emoji based on state
  state_color=""
  status_msg=""
  case "$SESSION_STATE" in
    "COMPLETE")
      EMOJI="✅"
      state_color="$GREEN"
      status_msg="Workflow completed successfully"
      ;;
    "ABORTED")
      EMOJI="❌"
      state_color="$RED"
      status_msg="Workflow aborted"
      ;;
    "WAITING_APPROVAL"|"PR_CREATED")
      EMOJI="⏳"
      state_color="$YELLOW"
      status_msg="Waiting for PR approval and CI checks"
      ;;
    "BRANCH_READY")
      EMOJI="📝"
      state_color="$BLUE"
      status_msg="Branch ready for development"
      ;;
    "CHANGES_COMMITTED"|"PUSHED")
      EMOJI="🚀"
      state_color="$MAGENTA"
      status_msg="Changes committed and ready to ship"
      ;;
    "REBASING"|"MERGING")
      EMOJI="🔄"
      state_color="$CYAN"
      status_msg="Rebasing or merging in progress"
      ;;
    *)
      EMOJI="💻"
      state_color="$CYAN"
      status_msg="Active development session"
      ;;
  esac

  # Show branch in green with branch emoji
  echo -e "${BOLD_BRIGHT_MAGENTA}dev${RESET}${BOLD_DARK_ORANGE} *${RESET} ${CONTEXT_DISPLAY} ${GRAY}|${RESET} 🌿 ${GREEN}${BRANCH}${RESET}${GIT_STATS}${ACTIVE_SESSIONS_DISPLAY}"
  echo -e "${BOLD_WHITE} solo${RESET} ${MODEL_DISPLAY_FIELD} ${GRAY}|${RESET} $EMOJI ${state_color}${status_msg}${RESET}"
else
  # No active session
  if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
    # Main branch - show in green with branch emoji
    echo -e "${BOLD_BRIGHT_MAGENTA}dev${RESET}${BOLD_DARK_ORANGE} *${RESET} ${CONTEXT_DISPLAY} ${GRAY}|${RESET} 🌿 ${GREEN}${BRANCH}${RESET}${GIT_STATS}${ACTIVE_SESSIONS_DISPLAY}"
    echo -e "${BOLD_WHITE} solo${RESET} ${MODEL_DISPLAY_FIELD} ${GRAY}|${RESET} 📁 ${GRAY}No active session${RESET}"
  else
    # Other branch without session - show in green with branch emoji
    echo -e "${BOLD_BRIGHT_MAGENTA}dev${RESET}${BOLD_DARK_ORANGE} *${RESET} ${CONTEXT_DISPLAY} ${GRAY}|${RESET} 🌿 ${GREEN}${BRANCH}${RESET}${GIT_STATS}${ACTIVE_SESSIONS_DISPLAY}"
    echo -e "${BOLD_WHITE} solo${RESET} ${MODEL_DISPLAY_FIELD} ${GRAY}|${RESET} 📁 ${GRAY}No active session${RESET}"
  fi
fi
