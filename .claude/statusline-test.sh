#!/bin/bash
INPUT=$(cat)

# Try to extract actual context usage from Claude Code JSON
TOKENS_USED=$(echo "$INPUT" | jq -r '.context_used // .tokens_used // .context.used // empty' 2>/dev/null)
TOKENS_TOTAL=$(echo "$INPUT" | jq -r '.context_limit // .tokens_total // .context.total // .context.limit // empty' 2>/dev/null)

# Debug output
echo "DEBUG: tokens_used from JSON: '$TOKENS_USED'" >&2
echo "DEBUG: tokens_total from JSON: '$TOKENS_TOTAL'" >&2

# If not provided directly, check transcript
if [ -z "$TOKENS_USED" ]; then
  TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // empty' 2>/dev/null)
  echo "DEBUG: transcript_path: '$TRANSCRIPT_PATH'" >&2
  
  if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
    # Get the LAST message's cumulative token usage, not sum of all
    TOKENS_USED=$(jq -s '[.[] | select(.message.usage != null) | .message.usage | ((.input_tokens // 0) + (.output_tokens // 0))] | last' "$TRANSCRIPT_PATH" 2>/dev/null)
    echo "DEBUG: tokens from transcript (last): '$TOKENS_USED'" >&2
  fi
fi

echo "TOKENS_USED=$TOKENS_USED"
echo "TOKENS_TOTAL=$TOKENS_TOTAL"
