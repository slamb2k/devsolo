# Status Line

Manage Claude Code status line display to show current devsolo workflow status.

## Arguments

- `action` (required): Action to perform - "enable", "disable", "update", or "show"
- `format` (optional): Custom format string (e.g., "{icon} {branch} {state}")
- `showBranchInfo` (optional): Show branch name in status line (default: true)
- `showSessionInfo` (optional): Show session ID in status line (default: true)
- `showStateInfo` (optional): Show workflow state in status line (default: true)

## Workflow

**Display the following banner immediately before commencing the workflow:**

```
░█▀▀░▀█▀░█▀█░▀█▀░█░█░█▀▀░░░█░░░▀█▀░█▀█░█▀▀░
░▀▀█░░█░░█▀█░░█░░█░█░▀▀█░░░█░░░░█░░█░█░█▀▀░
░▀▀▀░░▀░░▀░▀░░▀░░▀▀▀░▀▀▀░░░▀▀▀░▀▀▀░▀░▀░▀▀▀░
```

1. Use the `mcp__devsolo__devsolo_status_line` tool to manage status line
2. Pass along the provided arguments
3. Report configuration changes

## Status Line Format

The status line displays workflow information directly in Claude Code:

```
[devsolo] 💻 0c2a20a7 | feature/my-feature | BRANCH_READY | ██████░░░░░░░░░ 92K/200K
```

Components:
- **Icon**: 💻 (workflow active), ⏸️ (paused), ✅ (complete)
- **Session ID**: Short form of session identifier (8 chars)
- **Branch Name**: Current feature branch
- **State**: Current workflow state
- **Context Window**: Bar graph showing remaining tokens with color coding:
  - 🟢 Green: >50% remaining (plenty of context)
  - 🟡 Yellow: 20-50% remaining (getting low)
  - 🔴 Red: <20% remaining (context nearly exhausted)

## Actions

### Enable
Turns on the status line display in Claude Code.

```
/devsolo:status-line --action="enable"
```

### Disable
Turns off the status line display.

```
/devsolo:status-line --action="disable"
```

### Update
Updates status line configuration without disabling.

```
# Show only branch and state
/devsolo:status-line --action="update" --showSessionInfo=false

# Custom format
/devsolo:status-line --action="update" --format="{icon} {branch}"
```

### Show
Displays current status line configuration.

```
/devsolo:status-line --action="show"
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
[devsolo] {icon} {session} | {branch} | {state} | {type}

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
/devsolo:status-line --action="enable"

# Enable with custom format
/devsolo:status-line --action="enable" --format="{icon} {branch} | {state}"

# Show only branch name
/devsolo:status-line --action="update" --showSessionInfo=false --showStateInfo=false

# Disable status line
/devsolo:status-line --action="disable"

# Check current configuration
/devsolo:status-line --action="show"
```

## Output Format

Present status line configuration in a clear, structured format:

**For Enable/Update Actions:**
```
## 📊 Status Line Configured

**Action:** Enabled
**Format:** {icon} {session} | {branch} | {state}
**Components:**
- Session ID: ✓ Visible
- Branch Name: ✓ Visible
- State: ✓ Visible

**Example Display:**
[devsolo] 💻 0c2a20a7 | feature/my-feature | BRANCH_READY

---

**Next Steps:**

- Status line will update automatically as workflow progresses
- Use `/devsolo:status-line --action="show"` to view current configuration
```

**For Disable Action:**
```
## 📊 Status Line Disabled

**Action:** Disabled
**Status:** Status line hidden from Claude Code display

---

**Next Steps:**

- Use `/devsolo:status-line --action="enable"` to re-enable
- Use `/devsolo:info` to check workflow status manually
```

**For Show Action:**
```
## 📊 Current Status Line Configuration

**Status:** Enabled
**Format:** {icon} {session} | {branch} | {state}
**Components:**
- Session ID: ✓ Visible
- Branch Name: ✓ Visible
- State: ✓ Visible

**Current Display:**
[devsolo] 💻 0c2a20a7 | feature/my-feature | BRANCH_READY

---

**Next Steps:**

- Use `/devsolo:status-line --action="update"` to modify configuration
- Use `/devsolo:status-line --action="disable"` to hide status line
```

**Formatting Guidelines:**
- Show clear action confirmation (enabled/disabled/updated/showing)
- Display current format string
- List which components are visible
- Show example of actual status line output
- Provide actionable next steps based on action type
- Use consistent section structure
- Follow markdown formatting standards

## Notes

- Status line updates automatically as workflow progresses
- Integrates with Claude Code's native status line
- Provides at-a-glance workflow status
- Can be customized to show only desired information
- Persists across Claude Code sessions
- **Context Window Bar Graph**: Displays remaining tokens in real-time with color-coded visual indicator
  - Helps you monitor when to wrap up long conversations
  - Green bar indicates plenty of context remaining
  - Yellow/Red bars suggest starting a new conversation soon
