# Status

Show the current workflow status including session information and git status.

## Workflow

**Display the following banner immediately before doing anything else:**

```
░█▀▀░▀█▀░█▀█░▀█▀░█░█░█▀▀░
░▀▀█░░█░░█▀█░░█░░█░█░▀▀█░
░▀▀▀░░▀░░▀░▀░░▀░░▀▀▀░▀▀▀░
```

Once displayed, continue with the following steps:

1. Use the `mcp__hansolo__hansolo_status` tool to query current workflow status
2. Display the current branch, session information (if any), and git status
3. Show whether there's an active workflow session

## Output Format

Present status information in a clear, structured format:
- Current branch
- Session status (active/none)
- If session exists: session ID, workflow type, state, created time, PR info
- Git status: staged files, unstaged changes, untracked files
