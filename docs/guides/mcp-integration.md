# devsolo MCP Integration Guide

## Overview

devsolo v2.0.0 is a pure Model Context Protocol (MCP) server that integrates with Claude Code for AI-native Git workflow automation. This guide covers setup, usage patterns, and best practices for the MCP integration.

## Architecture

devsolo v2.0.0 operates exclusively through MCP - there is no standalone CLI. All interactions happen through Claude Code using two supported patterns:

1. **Natural Language** (Recommended): Conversational requests that Claude interprets
2. **Direct MCP Tool Calls**: Explicit tool invocation with parameters

## Installation & Configuration

### 1. Build the MCP Server

```bash
# Clone and build devsolo
git clone https://github.com/slamb2k/devsolo.git
cd devsolo

# Install dependencies
npm install

# Build project and MCP server
npm run build
npm run build:mcp
```

This creates the MCP server at `bin/devsolo-mcp`.

### 2. Configure Claude Code

Add devsolo to your Claude Code MCP configuration:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Linux**: `~/.config/Claude/claude_desktop_config.json`

**Windows (WSL)**: `~/.config/Claude/claude_desktop_config.json`

**Configuration**:

```json
{
  "mcpServers": {
    "devsolo": {
      "command": "node",
      "args": ["/absolute/path/to/devsolo/bin/devsolo-mcp"],
      "cwd": "${workspaceFolder}"
    }
  }
}
```

**Important**: Replace `/absolute/path/to/devsolo` with your actual installation path.

### 3. Restart Claude Code

Restart Claude Code to load the devsolo MCP server.

### 4. Verify Installation

In Claude Code, navigate to any project and ask:

```
Show me the devsolo status
```

You should see either "devsolo is not initialized" (normal) or current workflow status.

## Usage Patterns

### Natural Language (Recommended)

Ask Claude to perform Git workflow tasks conversationally. Claude understands intent and invokes the appropriate MCP tools.

**Examples**:

```
"Initialize devsolo in this project"
→ Claude calls devsolo_init

"Start a new feature branch for user authentication"
→ Claude calls devsolo_launch with description

"Show me all my active workflow sessions"
→ Claude calls devsolo_sessions

"Commit these changes with message 'feat: add login page'"
→ Claude calls devsolo_commit

"Ship this feature to production"
→ Claude calls devsolo_ship

"Abort the current workflow"
→ Claude calls devsolo_abort
```

**Advantages**:
- Most intuitive and conversational
- Claude interprets intent and context
- Can handle complex, multi-step requests
- Claude generates good commit messages and PR descriptions

**Best For**:
- Learning devsolo
- Complex workflows
- When you're unsure of exact parameters
- Letting Claude assist with Git best practices

### Direct MCP Tool Calls

Explicitly invoke MCP tools with specific parameters for precise control.

**Examples**:

```
Use devsolo_init to set up devsolo

Use devsolo_launch with branchName "feature/oauth" and description "OAuth2 authentication"

Use devsolo_sessions with verbose true

Use devsolo_commit with message "feat: add OAuth support" and stagedOnly false

Use devsolo_ship with push true, createPR true, merge true, and prDescription "Add OAuth authentication system"

Use devsolo_abort with deleteBranch true
```

**Advantages**:
- Explicit parameter control
- Predictable behavior
- Good for repetitive tasks
- Clear what's happening

**Best For**:
- When you know exact parameters
- Repetitive workflows
- Automation patterns
- Precise control over tool behavior

### Hybrid Approach

Combine both patterns as needed:

```
"Start a new feature for payment integration"
*work on implementation*
Use devsolo_commit with message "feat: add Stripe integration" and stagedOnly false
"Ship this feature when ready"
```

## Available MCP Tools

devsolo v2.0.0 provides 11 MCP tools:

| Tool | Purpose | Type |
|------|---------|------|
| `devsolo_init` | Initialize devsolo in project | Configuration |
| `devsolo_launch` | Start new feature workflow | Workflow |
| `devsolo_commit` | Commit changes | Workflow |
| `devsolo_ship` | Push, create PR, merge | Workflow |
| `devsolo_swap` | Switch between workflows | Workflow |
| `devsolo_abort` | Cancel workflow | Workflow |
| `devsolo_hotfix` | Create emergency hotfix | Workflow |
| `devsolo_cleanup` | Clean up old sessions | Workflow |
| `devsolo_status` | Show current status | Query |
| `devsolo_sessions` | List all sessions | Query |
| `devsolo_status_line` | Manage status display | Configuration |

See [MCP Tools Reference](mcp-tools-reference.md) for complete documentation of each tool.

## Common Workflows

### Starting a New Feature

**Natural Language**:
```
"Start a new feature for user profile functionality"
```

**Direct Tool**:
```
Use devsolo_launch with branchName "feature/user-profile" and description "User profile CRUD operations"
```

**What happens**:
- Pre-flight checks run (on main, clean working directory, etc.)
- Feature branch created
- Branch checked out
- Session created and tracked
- Post-flight verifications confirm success

### Committing Changes

**Natural Language**:
```
"Commit my changes with message 'feat: add profile API endpoints'"
```

**Direct Tool**:
```
Use devsolo_commit with message "feat: add profile API endpoints" and stagedOnly false
```

**What happens**:
- Pre-flight checks run (session exists, has changes, etc.)
- Changes staged (unless stagedOnly is true)
- Changes committed with provided message
- Session state updated
- Post-flight verifications confirm commit exists

### Shipping to Production

**Natural Language**:
```
"Ship this feature with PR description: Add user profile management system"
```

**Direct Tool**:
```
Use devsolo_ship with push true, createPR true, merge true, and prDescription "Add user profile management system"
```

**What happens**:
- Pre-flight checks run (commits exist, GitHub auth, etc.)
- Rebases on latest main (maintains linear history)
- Pushes to remote
- Creates pull request
- Waits for CI checks to pass
- Auto-merges PR
- Cleans up branches
- Returns to main
- Post-flight verifications confirm success

### Managing Multiple Features

**Natural Language**:
```
"Show me all my active sessions, then switch to the authentication branch"
```

**Direct Tools**:
```
Use devsolo_sessions with verbose true
Use devsolo_swap with branchName "feature/authentication"
```

**What happens**:
- Sessions listed with details
- Current session saved
- Branch switched
- New session activated

### Cleaning Up

**Natural Language**:
```
"Abort the current feature and delete the branch"
```

**Direct Tool**:
```
Use devsolo_abort with deleteBranch true
```

**What happens**:
- Pre-flight checks run (session exists)
- Session deleted
- Branch optionally deleted
- Returns to main
- Post-flight verifications confirm cleanup

## Validation System

Every MCP tool implements comprehensive validation:

### Pre-Flight Checks

**Run before operation executes**:
- Verify devsolo is initialized
- Check Git repository state
- Validate session state
- Verify branch conditions
- Check GitHub authentication (when needed)

**Example pre-flight checks** for `devsolo_launch`:
```javascript
{
  name: "on-main-branch",
  passed: true,
  message: "Currently on main branch",
  severity: "info"
},
{
  name: "working-directory-clean",
  passed: false,
  message: "Working directory has uncommitted changes",
  severity: "error",
  details: {
    actual: "modified: src/example.ts",
    suggestion: "Commit or stash changes before launching"
  }
}
```

### Post-Flight Verifications

**Run after operation completes**:
- Verify expected state changes occurred
- Confirm Git operations succeeded
- Validate session state
- Check branch existence/state

**Example post-flight verifications** for `devsolo_launch`:
```javascript
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
},
{
  name: "on-correct-branch",
  passed: true,
  message: "Checked out to feature/user-auth",
  severity: "info"
}
```

### Force Override

Most tools support `force: true` to bypass pre-flight check failures (use cautiously):

```
Use devsolo_launch with force true and description "Emergency fix"
```

## Error Handling

MCP tools provide detailed, actionable error messages.

### Error Result Structure

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
        actual: "modified: src/auth.ts, deleted: src/old.ts",
        suggestion: "Commit or stash changes, or use force: true to proceed"
      }
    }
  ]
}
```

### Common Error Categories

1. **Initialization Errors**: devsolo not initialized in project
2. **Pre-Flight Failures**: Validation checks failed
3. **Execution Errors**: Core operation failed
4. **Post-Flight Failures**: Operation completed but verification failed

### Recovery Patterns

**For initialization errors**:
```
"Initialize devsolo in this project"
```

**For validation failures**:
- Read the `suggestion` field in check details
- Fix the issue and retry
- Or use `force: true` if appropriate

**For execution errors**:
- Check error message for specific issue
- Verify Git/GitHub configuration
- Check session state with `devsolo_status`

## Troubleshooting

### MCP Server Not Detected

**Problem**: Claude Code can't find devsolo

**Solutions**:
1. Verify path in `claude_desktop_config.json` is absolute
2. Check file exists: `ls /path/to/devsolo/bin/devsolo-mcp`
3. Make executable: `chmod +x /path/to/devsolo/bin/devsolo-mcp`
4. Restart Claude Code after config changes

### Tools Not Working

**Problem**: devsolo tools fail or aren't available

**Solutions**:
1. Initialize devsolo: `"Initialize devsolo in this project"`
2. Check you're in a Git repository: `git status`
3. Verify Git remote: `git remote -v`
4. Check status: `"Show me devsolo status"`

### Permission Errors

**Problem**: Permission denied errors

**Solutions**:
1. Ensure read/write access to `.devsolo` directory
2. Check Git credentials configured: `gh auth status`
3. Verify SSH keys or personal access token

### Pre-Flight Check Failures

**Problem**: Pre-flight checks block operation

**Solutions**:
1. Read the check failure message and `suggestion`
2. Fix the underlying issue
3. Or use `force: true` to bypass (use cautiously)

**Example**:
```
# Check fails: "Not on main branch"
# Solution: Switch to main
"Switch to main branch"

# Or force if intentional
Use devsolo_launch with force true and description "Feature from feature branch"
```

### Session State Issues

**Problem**: Session seems stuck or inconsistent

**Solutions**:
```
# Check detailed session info
"Show me verbose session information"

# If stuck, abort and restart
"Abort this workflow"
"Start a new feature for X"
```

## Advanced Configuration

### Environment Variables

Pass environment variables to the MCP server:

```json
{
  "mcpServers": {
    "devsolo": {
      "command": "node",
      "args": ["/path/to/devsolo/bin/devsolo-mcp"],
      "cwd": "${workspaceFolder}",
      "env": {
        "NODE_ENV": "production",
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

### Project Configuration

Configure defaults in `.devsolo/config.yaml`:

```yaml
git:
  platform: github
  mainBranch: main
  remoteName: origin

workflows:
  launch:
    branchPrefix: feature/
    allowLaunchFromFeature: false
    enforceLinearHistory: true

  ship:
    requireCleanWorkingDir: true
    autoMerge: true
    deleteBranchAfterMerge: true
    waitForCI: true

github:
  prTemplate: |
    ## Summary
    [Description here]

    ## Changes
    - Change 1
    - Change 2
```

## Best Practices

### 1. Use Natural Language for Complex Workflows

```
"I need to fix a bug in production, create a hotfix, commit the fix, and ship immediately"
```

Claude orchestrates multiple tools:
1. `devsolo_hotfix` - Creates hotfix workflow
2. `devsolo_commit` - Commits the fix
3. `devsolo_ship` - Ships with expedited merge

### 2. Use Direct Tools for Repetitive Tasks

```
Use devsolo_launch with description "Daily standup notes"
# ... make changes
Use devsolo_commit with message "docs: add standup notes"
Use devsolo_ship with merge true
```

### 3. Check Status Frequently

```
"What's my current workflow status?"
"Show me all active sessions"
```

Helps maintain awareness of:
- Current branch
- Workflow state
- Active sessions
- Next steps

### 4. Let devsolo Manage Git

**Avoid during active sessions**:
```bash
git commit -m "message"
git push
gh pr create
```

**Use devsolo instead**:
```
"Commit with message 'feat: add feature'"
"Ship this feature"
```

**Why?** devsolo maintains a state machine. Direct Git operations bypass tracking.

### 5. Clean Up Regularly

```
"Clean up old sessions and merged branches"
```

Or:

```
Use devsolo_cleanup with deleteBranches true
```

Keeps repository and session storage tidy.

## Examples

### Example 1: Full Feature Development

```
User: Initialize devsolo in this project
Claude: [Calls devsolo_init, confirms setup]

User: Start a new feature for search functionality
Claude: [Calls devsolo_launch, creates feature/search-functionality]

User: *Makes code changes with Claude's help*

User: Commit my changes with a good message
Claude: [Calls devsolo_commit with "feat: add search with fuzzy matching"]

User: Ship this feature
Claude: [Calls devsolo_ship, creates PR, merges]

User: What's my status?
Claude: [Calls devsolo_status, shows COMPLETE state on main branch]
```

### Example 2: Multi-Feature Management

```
User: Show me what I'm working on
Claude: [Calls devsolo_sessions, shows 2 active sessions]

User: Switch to the authentication feature
Claude: [Calls devsolo_swap with branchName "feature/authentication"]

User: *Makes changes*

User: Commit this
Claude: [Calls devsolo_commit]

User: Switch to the dashboard feature
Claude: [Calls devsolo_swap with branchName "feature/dashboard"]

User: Ship both features when ready
Claude: [Calls devsolo_ship for current branch, suggests swapping and shipping other]
```

### Example 3: Emergency Hotfix

```
User: Create a hotfix for the critical security bug in auth module
Claude: [Calls devsolo_hotfix with severity "critical"]

User: *Fixes the vulnerability*

User: Commit this fix immediately
Claude: [Calls devsolo_commit with "fix: patch critical security vulnerability"]

User: Ship this hotfix now
Claude: [Calls devsolo_ship with force true, expedited merge]
```

## Integration with Claude Code Features

### Status Line

Enable persistent workflow status display:

```
"Enable the devsolo status line"
```

Shows in Claude Code:
```
[devsolo] 📝 0c2a20a7 | feature/user-auth | CHANGES_COMMITTED
```

### AI-Assisted Commit Messages

Let Claude generate commit messages:

```
"Commit my changes with an appropriate commit message"
```

Claude analyzes changes and generates conventional commit message.

### AI-Assisted PR Descriptions

Let Claude generate PR descriptions:

```
"Ship this feature with a comprehensive PR description"
```

Claude generates structured PR description based on commits.

## Support & Resources

**Documentation**:
- [Quick Start Guide](quickstart.md) - Get started quickly
- [MCP Tools Reference](mcp-tools-reference.md) - Complete tool documentation
- [Usage Guide](usage.md) - Practical usage examples
- [Troubleshooting](troubleshooting.md) - Common issues and solutions

**Getting Help**:
- GitHub Issues: [Report bugs](https://github.com/slamb2k/devsolo/issues)
- GitHub Discussions: [Ask questions](https://github.com/slamb2k/devsolo/discussions)
- Ask Claude: "Help me troubleshoot devsolo integration"

---

**Ready to integrate?** See the [Quick Start Guide](quickstart.md) to get started! 🚀
