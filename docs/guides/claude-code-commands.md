# Using han-solo with Claude Code

## Overview

han-solo integrates with Claude Code through the Model Context Protocol (MCP). This guide explains how to effectively use han-solo MCP tools within Claude Code.

## How MCP Tools Work in Claude Code

han-solo exposes 11 MCP tools that Claude Code can call. You interact with these tools in two ways:

1. **Natural Language** (Recommended): Ask Claude to perform tasks conversationally
2. **Direct Tool Invocation**: Explicitly tell Claude to use specific tools

**Important**: han-solo does not use slash commands (like `/hansolo:command`). All interaction happens through MCP tool calls that Claude makes based on your requests.

## Setup

### 1. Configure MCP Server

Add han-solo to your Claude Code configuration:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "hansolo": {
      "command": "node",
      "args": ["/absolute/path/to/hansolo/bin/hansolo-mcp"],
      "cwd": "${workspaceFolder}"
    }
  }
}
```

### 2. Restart Claude Code

Restart Claude Code to load the han-solo MCP server.

### 3. Verify MCP Server

Ask Claude:

```
Show me the han-solo status
```

If configured correctly, Claude will call the `hansolo_status` tool.

## Available MCP Tools

han-solo v2.0.0 provides 11 MCP tools:

| Tool Name | Purpose | Type |
|-----------|---------|------|
| `hansolo_init` | Initialize han-solo in project | Configuration |
| `hansolo_launch` | Start new feature workflow | Workflow |
| `hansolo_commit` | Commit changes | Workflow |
| `hansolo_ship` | Push, create PR, merge | Workflow |
| `hansolo_swap` | Switch between workflows | Workflow |
| `hansolo_abort` | Cancel workflow | Workflow |
| `hansolo_hotfix` | Create emergency hotfix | Workflow |
| `hansolo_cleanup` | Clean up old sessions/branches | Workflow |
| `hansolo_status` | Show current workflow status | Query |
| `hansolo_sessions` | List all workflow sessions | Query |
| `hansolo_status_line` | Manage Claude Code status display | Configuration |

See [MCP Tools Reference](mcp-tools-reference.md) for complete documentation.

## Usage Patterns

### Natural Language (Recommended)

Ask Claude to perform Git workflow tasks conversationally. Claude interprets your intent and calls the appropriate MCP tools.

**Advantages**:
- Most intuitive
- Claude understands context
- Can combine multiple steps
- Claude generates good messages/descriptions

**Examples**:

```
"Initialize han-solo in this project"
→ Claude calls: hansolo_init

"Start a new feature for user authentication"
→ Claude calls: hansolo_launch with description parameter

"Show me all my active workflow sessions"
→ Claude calls: hansolo_sessions

"Commit these changes with message 'feat: add login page'"
→ Claude calls: hansolo_commit with message parameter

"Ship this feature with PR description: Add user authentication system"
→ Claude calls: hansolo_ship with prDescription parameter

"Abort the current workflow"
→ Claude calls: hansolo_abort
```

### Direct Tool Invocation

Explicitly tell Claude which tool to use with specific parameters.

**Advantages**:
- Precise control over parameters
- Predictable behavior
- Good for repetitive tasks
- Clear what's happening

**Examples**:

```
Use hansolo_init to set up han-solo

Use hansolo_launch with branchName "feature/oauth" and description "OAuth2 authentication"

Use hansolo_sessions with verbose true

Use hansolo_commit with message "feat: add OAuth support" and stagedOnly false

Use hansolo_ship with push true, createPR true, merge true, and prDescription "Add OAuth authentication system"

Use hansolo_abort with deleteBranch true
```

## Common Workflows

### Initializing a Project

**Natural Language**:
```
"Initialize han-solo for this project"
```

**Direct Tool**:
```
Use hansolo_init
```

**What Claude does**:
- Calls `hansolo_init`
- Creates `.hansolo` directory
- Sets up configuration

### Starting a New Feature

**Natural Language**:
```
"Start a new feature for user profile management"
```

**Direct Tool**:
```
Use hansolo_launch with branchName "feature/user-profile" and description "User profile management"
```

**What Claude does**:
- Calls `hansolo_launch` with parameters
- Creates feature branch
- Starts workflow session
- Shows pre/post-flight check results

### Committing Changes

**Natural Language**:
```
"Commit my changes with message 'feat: add user profiles'"
```

**Direct Tool**:
```
Use hansolo_commit with message "feat: add user profiles" and stagedOnly false
```

**What Claude does**:
- Calls `hansolo_commit`
- Stages changes (unless stagedOnly is true)
- Creates commit
- Updates workflow state

**AI-Assisted Commit Message**:
```
"Commit my changes with an appropriate commit message"
```

Claude analyzes your changes and generates a conventional commit message.

### Shipping to Production

**Natural Language**:
```
"Ship this feature with PR description: Add user profile management system"
```

**Direct Tool**:
```
Use hansolo_ship with push true, createPR true, merge true, and prDescription "Add user profile management system"
```

**What Claude does**:
- Calls `hansolo_ship`
- Pushes to remote
- Creates pull request
- Waits for CI
- Auto-merges
- Cleans up branches
- Returns to main

**AI-Assisted PR Description**:
```
"Ship this feature with a comprehensive PR description"
```

Claude analyzes commits and generates a structured PR description.

### Checking Status

**Natural Language**:
```
"What's my current han-solo workflow status?"
```

**Direct Tool**:
```
Use hansolo_status
```

**What Claude does**:
- Calls `hansolo_status`
- Shows current branch
- Shows workflow state
- Shows session ID
- Suggests next steps

### Viewing Sessions

**Natural Language**:
```
"Show me all my active han-solo sessions with details"
```

**Direct Tool**:
```
Use hansolo_sessions with verbose true
```

**What Claude does**:
- Calls `hansolo_sessions`
- Lists all active sessions
- Shows session details (with verbose)
- Shows branch, state, timestamps

### Switching Branches

**Natural Language**:
```
"Switch to the authentication feature branch"
```

**Direct Tool**:
```
Use hansolo_swap with branchName "feature/authentication"
```

**What Claude does**:
- Calls `hansolo_swap`
- Saves current session
- Switches to specified branch
- Activates that branch's session

**With Stash**:
```
Use hansolo_swap with branchName "main" and stash true
```

Stashes uncommitted changes before switching.

### Aborting a Workflow

**Natural Language**:
```
"Abort the current workflow and delete the branch"
```

**Direct Tool**:
```
Use hansolo_abort with deleteBranch true
```

**What Claude does**:
- Calls `hansolo_abort`
- Deletes session
- Optionally deletes branch
- Returns to main

### Creating a Hotfix

**Natural Language**:
```
"Create a hotfix for the critical security bug in the auth module"
```

**Direct Tool**:
```
Use hansolo_hotfix with issue "security vulnerability in auth module" and severity "critical"
```

**What Claude does**:
- Calls `hansolo_hotfix`
- Creates hotfix branch
- Creates hotfix session
- Sets up for rapid merge

### Cleaning Up

**Natural Language**:
```
"Clean up old han-solo sessions and merged branches"
```

**Direct Tool**:
```
Use hansolo_cleanup with deleteBranches true
```

**What Claude does**:
- Calls `hansolo_cleanup`
- Removes old sessions
- Optionally deletes merged branches

### Managing Status Line

**Natural Language**:
```
"Enable the han-solo status line in Claude Code"
```

**Direct Tool**:
```
Use hansolo_status_line with action "enable"
```

**What Claude does**:
- Calls `hansolo_status_line`
- Enables status line display
- Shows workflow info in Claude Code UI

**Display Format**:
```
[han-solo] 📝 0c2a20a7 | feature/user-auth | CHANGES_COMMITTED
```

## AI-Assisted Features

### AI-Generated Commit Messages

Let Claude analyze your changes and generate commit messages:

**Request**:
```
"Commit my changes with an appropriate commit message"
```

**What happens**:
1. Claude examines changed files
2. Analyzes the nature of changes
3. Generates conventional commit message
4. Calls `hansolo_commit` with generated message

**Example Output**:
```
"feat: add user profile management with edit and view capabilities"
```

### AI-Generated PR Descriptions

Let Claude analyze your commits and generate PR descriptions:

**Request**:
```
"Ship this feature with a comprehensive PR description"
```

**What happens**:
1. Claude reviews all commits in the feature
2. Analyzes the overall changes
3. Generates structured PR description
4. Calls `hansolo_ship` with generated description

**Example Output**:
```markdown
## Summary
Adds user profile management system with edit and view capabilities.

## Changes
- User profile model and database schema
- Profile view and edit pages with validation
- Profile API endpoints with authentication
- Comprehensive test coverage

## Testing
- All unit tests passing
- Integration tests for profile CRUD operations
- Manual testing completed
```

## Tool Call Permissions

When Claude Code asks for permission to use han-solo tools, you can:

**Approve individual tool calls**:
- Click "Allow" when prompted
- Tool executes once

**Approve all tools from han-solo**:
- Click "Always allow mcp__hansolo"
- All han-solo tools auto-approved

**Approve specific tool permanently**:
- Click "Always allow mcp__hansolo__ship"
- Only that specific tool auto-approved

## Understanding Tool Results

MCP tools return structured results with validation details.

### Success Result Example

```javascript
{
  success: true,
  branchName: "feature/user-auth",
  state: "BRANCH_READY",
  sessionId: "0c2a20a7",
  preFlightChecks: [
    {
      name: "on-main-branch",
      passed: true,
      message: "Currently on main branch",
      severity: "info"
    },
    {
      name: "working-directory-clean",
      passed: true,
      message: "Working directory is clean",
      severity: "info"
    }
  ],
  postFlightVerifications: [
    {
      name: "session-created",
      passed: true,
      message: "Session created successfully",
      severity: "info"
    },
    {
      name: "branch-created",
      passed: true,
      message: "Feature branch created: feature/user-auth",
      severity: "info"
    }
  ],
  nextSteps: [
    "Make your changes on the feature branch",
    "Commit changes when ready",
    "Ship the feature when complete"
  ]
}
```

### Error Result Example

```javascript
{
  success: false,
  errors: [
    "LaunchTool failed: Cannot launch workflow - working directory has uncommitted changes"
  ],
  preFlightChecks: [
    {
      name: "working-directory-clean",
      passed: false,
      message: "Working directory has uncommitted changes",
      severity: "error",
      details: {
        actual: "modified: src/auth.ts",
        suggestion: "Commit or stash changes before launching new workflow"
      }
    }
  ]
}
```

Claude presents these results in a user-friendly way, highlighting:
- What succeeded ✅
- What failed ❌
- Suggested fixes
- Next steps

## Combining Natural Language and Direct Tools

You can mix both approaches in the same conversation:

**Example Workflow**:

```
User: Start a new feature for payment integration
Claude: [Calls hansolo_launch with description]

User: *Makes code changes*

User: Use hansolo_commit with message "feat: add Stripe payment integration"
Claude: [Calls hansolo_commit with exact parameters]

User: Ship this feature when ready
Claude: [Calls hansolo_ship]
```

**Benefits**:
- Use natural language for exploration
- Use direct tools for precision
- Switch between as needed

## Troubleshooting

### Claude doesn't know about han-solo tools

**Problem**: Claude says han-solo tools aren't available

**Solutions**:
1. Verify MCP server configured in `claude_desktop_config.json`
2. Check path to `bin/hansolo-mcp` is correct and absolute
3. Restart Claude Code
4. Ask Claude: "What MCP tools are available?"

### Tool calls fail

**Problem**: MCP tool calls return errors

**Solutions**:
1. Check han-solo is initialized: `"Initialize han-solo"`
2. Verify you're in a Git repository: `git status`
3. Check Git remote configured: `git remote -v`
4. Verify GitHub authentication: `gh auth status`

### Pre-flight checks fail

**Problem**: Tool blocked by validation

**Solutions**:
1. Read the check failure message
2. Follow the suggestion in `details.suggestion`
3. Or use `force: true` to bypass (use cautiously)

**Example**:
```
User: Use hansolo_launch with force true and description "Emergency fix"
```

### Status line not showing

**Problem**: Status line not visible in Claude Code

**Solutions**:
1. Enable it: `"Enable the han-solo status line"`
2. Check configuration was updated
3. Verify active han-solo session exists

## Best Practices

### 1. Use Natural Language for Learning

When getting started:
```
"How do I start a new feature with han-solo?"
"What's the workflow for shipping changes?"
"Show me what han-solo can do"
```

Claude explains and demonstrates the tools.

### 2. Use Direct Tools for Precision

When you know exactly what you want:
```
Use hansolo_launch with branchName "feature/TICKET-123-user-auth" and description "User authentication per TICKET-123"
```

### 3. Let Claude Help with Messages

For commit messages and PR descriptions:
```
"Commit my changes with a good conventional commit message"
"Ship with a comprehensive PR description"
```

### 4. Check Status Frequently

Stay aware of workflow state:
```
"What's my current workflow status?"
"Show me all active sessions"
```

### 5. Review Tool Results

Pay attention to:
- Pre-flight check results
- Post-flight verification results
- Suggested next steps
- Error messages and suggestions

## Example Conversation

**Complete Feature Development**:

```
User: Initialize han-solo in this project
Claude: I'll initialize han-solo for you.
Claude: [Calls hansolo_init]
Claude: han-solo is now initialized! You can start workflows with the launch command.

User: Start a new feature for search functionality
Claude: [Calls hansolo_launch with description "search functionality"]
Claude: Created feature branch: feature/search-functionality
       Session ID: a1b2c3d4
       State: BRANCH_READY
       You can now make changes on this branch.

User: *Makes code changes with Claude's help*

User: Commit my changes with an appropriate message
Claude: I'll analyze your changes and create a commit.
Claude: [Analyzes git diff]
Claude: [Calls hansolo_commit with message "feat: add search with fuzzy matching and filters"]
Claude: Changes committed successfully!
       State: CHANGES_COMMITTED

User: Ship this feature
Claude: [Calls hansolo_ship]
Claude: Pushing to remote...
       Creating pull request...
       Waiting for CI checks...
       ✅ All checks passed
       Merging pull request #42...
       Cleaning up branches...
       Returning to main branch...
       Feature shipped successfully! 🚀

User: What's my status now?
Claude: [Calls hansolo_status]
Claude: Current state: COMPLETE
       Branch: main
       No active workflow
       Ready to start a new feature!
```

## Summary

han-solo integrates with Claude Code through MCP tools, not slash commands. You can:

1. **Use natural language** for intuitive, conversational workflows
2. **Use direct tool invocation** for precise parameter control
3. **Let Claude assist** with commit messages and PR descriptions
4. **Monitor workflow** through status and sessions tools
5. **Review validation results** from pre/post-flight checks

For complete tool documentation, see:
- [MCP Tools Reference](mcp-tools-reference.md)
- [MCP Integration Guide](mcp-integration.md)
- [Quick Start Guide](quickstart.md)
- [Usage Guide](usage.md)

---

**Ready to use han-solo with Claude Code?** See the [Quick Start Guide](quickstart.md)! 🚀
