# Sessions

List and manage workflow sessions.

## Arguments

- `all` (optional): Show all sessions including completed ones (default: false, shows only active)
- `verbose` (optional): Show detailed session information including metadata and state history (default: false)
- `cleanup` (optional): Remove expired sessions (default: false)

## Workflow

**Display the following banner immediately before commencing the workflow:**

```
░█▀▀░█▀▀░█▀▀░█▀▀░▀█▀░█▀█░█▀█░█▀▀░
░▀▀█░█▀▀░▀▀█░▀▀█░░█░░█░█░█░█░▀▀█░
░▀▀▀░▀▀▀░▀▀▀░▀▀▀░▀▀▀░▀▀▀░▀░▀░▀▀▀░
```

**Before starting the workflow, resolve verbose mode:**
1. If `--verbose` argument was provided: use that value (true or false)
2. Otherwise, read `.devsolo/config.yaml` and check for `preferences.verboseMode`
3. If not in config, default to `false` (brief mode)
4. Pass the resolved verbose mode to the MCP tool call

1. Use the `mcp__devsolo__devsolo_sessions` tool to query sessions
2. Pass along the provided arguments (`all`, `verbose`, `cleanup`)
3. Display the sessions in a clear table format

## Output Format

Present sessions information in a clear, structured format:

```
## 📋 Active Sessions

| ID       | Branch                      | Type    | State         | Created    |
|----------|----------------------------|---------|---------------|------------|
| 0c2a20a7 | feature/user-auth          | feature | BRANCH_READY  | 2025-10-12 |
| 8f3d91bc | fix/login-bug              | fix     | PUSHED        | 2025-10-11 |

**Total:** 2 active session(s)

---

**Next Steps:**

- Use `/devsolo:swap --branchName=<branch>` to switch sessions
- Use `/devsolo:info` to see detailed session info
```

**Formatting Guidelines:**
- Use tables for session lists
- Show clear totals
- Provide actionable next steps
- In verbose mode: show metadata and state history
- In cleanup mode: show cleanup summary with counts
- Follow markdown formatting standards
