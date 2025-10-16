#!/bin/bash
INPUT=$(cat)
CWD=$(echo "$INPUT" | jq -r '.cwd // empty' 2>/dev/null)
[ -n "$CWD" ] && cd "$CWD" 2>/dev/null

# Simple test - just show what we can extract
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // "NO_PATH"' 2>/dev/null)
echo "Transcript: $TRANSCRIPT_PATH"

if [ -f "$TRANSCRIPT_PATH" ]; then
  COUNT=$(wc -l < "$TRANSCRIPT_PATH")
  echo "File exists: $COUNT lines"
  
  # Try old method (sum)
  OLD=$(jq -s '[.[] | select(.message.usage != null) | .message.usage | ((.input_tokens // 0) + (.output_tokens // 0))] | add' "$TRANSCRIPT_PATH" 2>/dev/null)
  echo "Old method (sum): $OLD"
  
  # Try new method (last)
  NEW=$(jq -s 'map(select(.message.usage != null)) | last | .message.usage | ((.input_tokens // 0) + (.output_tokens // 0))' "$TRANSCRIPT_PATH" 2>/dev/null)
  echo "New method (last): $NEW"
else
  echo "File does not exist"
fi
