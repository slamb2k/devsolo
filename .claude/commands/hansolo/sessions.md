# Sessions

List and manage workflow sessions.

## Arguments

- `all` (optional): Show all sessions including completed ones (default: false, shows only active)
- `verbose` (optional): Show detailed session information including metadata and state history (default: false)
- `cleanup` (optional): Remove expired sessions (default: false)

## Workflow

1. Use the `mcp__hansolo__hansolo_sessions` tool to query sessions
2. Pass along the provided arguments (`all`, `verbose`, `cleanup`)
3. Display the sessions in a clear table format

## Output Format

Present sessions information as a table with columns:
- Session ID (short form)
- Branch Name
- Workflow Type
- Current State
- Created At
- Active Status

If verbose mode is enabled, also show:
- Metadata (PR info, etc)
- State History

If cleanup mode is used, show:
- Number of expired sessions cleaned up
