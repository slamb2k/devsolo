# Status Line

Manage Claude Code status line display to show current han-solo workflow status.

## Arguments

- `action` (required): Action to perform - "enable", "disable", "update", or "show"
- `format` (optional): Custom format string (e.g., "{icon} {branch} {state}")
- `showBranchInfo` (optional): Show branch name in status line (default: true)
- `showSessionInfo` (optional): Show session ID in status line (default: true)
- `showStateInfo` (optional): Show workflow state in status line (default: true)

## Workflow

1. Use the `mcp__hansolo__hansolo_status_line` tool to manage status line
2. Pass along the provided arguments
3. Report configuration changes

## Status Line Format

The status line displays workflow information directly in Claude Code:

```
[han-solo] 💻 0c2a20a7 | feature/my-feature | BRANCH_READY
```

Components:
- **Icon**: 💻 (workflow active), ⏸️ (paused), ✅ (complete)
- **Session ID**: Short form of session identifier (8 chars)
- **Branch Name**: Current feature branch
- **State**: Current workflow state

## Actions

### Enable
Turns on the status line display in Claude Code.

```
/hansolo status-line --action="enable"
```

### Disable
Turns off the status line display.

```
/hansolo status-line --action="disable"
```

### Update
Updates status line configuration without disabling.

```
# Show only branch and state
/hansolo status-line --action="update" --showSessionInfo=false

# Custom format
/hansolo status-line --action="update" --format="{icon} {branch}"
```

### Show
Displays current status line configuration.

```
/hansolo status-line --action="show"
```

## Custom Format Strings

Available placeholders:
- `{icon}` - Workflow status icon
- `{session}` - Session ID (short form)
- `{branch}` - Branch name
- `{state}` - Workflow state
- `{type}` - Workflow type (feature/hotfix)

Examples:
```
# Minimal format
{icon} {branch}

# Verbose format
[han-solo] {icon} {session} | {branch} | {state} | {type}

# Custom format
{branch} ({state})
```

## Workflow State Icons

- 💻 - BRANCH_READY (working)
- 📝 - CHANGES_COMMITTED (committed)
- 🚀 - PUSHED (pushed to remote)
- 🔄 - PR_CREATED (PR created)
- ⏳ - WAITING_APPROVAL (waiting for CI/review)
- ✅ - MERGED (merged to main)
- ⏸️ - Paused/Inactive
- ✓ - COMPLETE (workflow finished)

## Examples

```
# Enable with default settings
/hansolo status-line --action="enable"

# Enable with custom format
/hansolo status-line --action="enable" --format="{icon} {branch} | {state}"

# Show only branch name
/hansolo status-line --action="update" --showSessionInfo=false --showStateInfo=false

# Disable status line
/hansolo status-line --action="disable"

# Check current configuration
/hansolo status-line --action="show"
```

## Output Format

Present status line configuration clearly:
- Action performed: enabled/disabled/updated
- Current format: show the format string
- Components shown: session, branch, state
- Example output: show what the status line looks like

## Notes

- Status line updates automatically as workflow progresses
- Integrates with Claude Code's native status line
- Provides at-a-glance workflow status
- Can be customized to show only desired information
- Persists across Claude Code sessions
