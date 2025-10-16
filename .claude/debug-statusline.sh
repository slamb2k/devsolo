#!/bin/bash
INPUT=$(cat)

# Save input to a file for inspection
echo "$INPUT" > /tmp/statusline-input.json

# Try all extraction methods and log results
echo "=== EXTRACTION DEBUG ===" > /tmp/statusline-debug.log
echo "context_used: $(echo "$INPUT" | jq -r '.context_used // "NOT FOUND"')" >> /tmp/statusline-debug.log
echo "tokens_used: $(echo "$INPUT" | jq -r '.tokens_used // "NOT FOUND"')" >> /tmp/statusline-debug.log
echo "context.used: $(echo "$INPUT" | jq -r '.context.used // "NOT FOUND"')" >> /tmp/statusline-debug.log
echo "transcript_path: $(echo "$INPUT" | jq -r '.transcript_path // "NOT FOUND"')" >> /tmp/statusline-debug.log

# Try transcript if path exists
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // empty' 2>/dev/null)
if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
  echo "transcript exists: YES" >> /tmp/statusline-debug.log
  echo "transcript last usage: $(jq -s 'map(select(.message.usage != null)) | last | .message.usage | ((.input_tokens // 0) + (.output_tokens // 0))' "$TRANSCRIPT_PATH" 2>/dev/null)" >> /tmp/statusline-debug.log
else
  echo "transcript exists: NO" >> /tmp/statusline-debug.log
fi

# Output something visible
echo "Debug mode - check /tmp/statusline-debug.log"
echo "Input saved to /tmp/statusline-input.json"
