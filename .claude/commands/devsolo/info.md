# Info

Show the current workflow information including session details and git status.

## Workflow

**Display the following banner immediately before commencing the workflow:**

```
░▀█▀░█▀█░█▀▀░█▀█░
░░█░░█░█░█▀▀░█░█░
░▀▀▀░▀░▀░▀░░░▀▀▀░
```

1. Use the `mcp__devsolo__devsolo_info` tool to query current workflow status
2. Display the current branch, session information (if any), and git status
3. Show whether there's an active workflow session
4. Report current workflow state

## Output Format

Present status information in a clear, structured format following these guidelines:

```
## 📊 Current Info

**Branch:** branch-name
**Session:** session-id (active) or "None"
**State:** current-state
**Type:** workflow-type

---

**Git Status:**
- Staged: N files
- Modified: N files
- Untracked: N files

**Last Commit:** message (hash)

---

**Next Steps:**

- Actionable guidance based on current state
```

**Formatting Guidelines:**
- Use consistent section structure
- Show all relevant information clearly
- Provide next steps based on current state
- Use tables for multiple items (if needed)
- Follow markdown formatting standards
