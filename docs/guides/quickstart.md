# devsolo Quick Start Guide

Get up and running with devsolo in under 5 minutes using Claude Code.

## Prerequisites

- **Node.js 20+** and npm
- **Git 2.30+**
- **Claude Code** installed ([Download here](https://claude.com/claude-code))
- **GitHub account** with authentication set up

## Installation

devsolo v2.0.0 is a pure MCP server that works exclusively with Claude Code. There is no standalone CLI.

### 1. Clone and Build devsolo

```bash
# Clone the repository
git clone https://github.com/slamb2k/devsolo.git
cd devsolo

# Install dependencies and build
npm install
npm run build
npm run build:mcp
```

### 2. Configure Claude Code MCP Server

Add devsolo to your Claude Code MCP configuration:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

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

Replace `/absolute/path/to/devsolo` with your actual installation path.

### 3. Restart Claude Code

Restart Claude Code to load the devsolo MCP server.

### 4. Verify Installation

In Claude Code, in your project directory:

```
Show me the devsolo status
```

If you see "devsolo is not initialized," you're ready to initialize it in your project.

## Setup Your Project

### 1. Navigate to Your Project

Open your project directory in Claude Code.

### 2. Initialize devsolo

Ask Claude in natural language:

```
Initialize devsolo in this project
```

Or use the MCP tool directly:

```
Use devsolo_init to set up devsolo
```

This creates a `.devsolo` directory with configuration and session storage.

### 3. Configure GitHub Authentication

**Option A: GitHub CLI** (Recommended for local development)
```bash
gh auth login
```

**Option B: Personal Access Token** (For automation/CI)
```bash
export GITHUB_TOKEN=ghp_your_token_here
```

That's it! devsolo is ready to use.

## Your First Workflow

### Step 1: Launch a New Feature

Ask Claude in natural language:

```
Start a new feature branch for user authentication
```

Or use the MCP tool directly:

```
Use devsolo_launch with description "User authentication system"
```

This creates a feature branch and starts tracking your workflow.

### Step 2: Make Your Changes

Work with Claude Code to implement your feature:

```
Let's add a login page with email and password fields
```

Check status anytime:

```
What's my current devsolo workflow status?
```

### Step 3: Commit Your Changes

When ready to commit:

```
Commit these changes with message "feat: add login page"
```

Or use the MCP tool:

```
Use devsolo_commit with message "feat: add login page"
```

### Step 4: Ship Your Feature

When ready to merge:

```
Ship this feature with PR description: Add user authentication system
```

Or use the MCP tool:

```
Use devsolo_ship with push true, createPR true, merge true, and prDescription "Add user authentication system"
```

This single operation:
- ✅ Pushes to GitHub
- ✅ Creates a pull request
- ✅ Waits for CI checks to pass
- ✅ Auto-merges the PR
- ✅ Cleans up branches
- ✅ Returns you to main

**Done!** Your feature is live and you're ready for the next one.

## Interaction Patterns

devsolo works with both natural language and direct MCP tool invocation.

### Natural Language (Recommended)

Claude Code understands your intent:

```
"Start working on a new dashboard feature"
→ Calls devsolo_launch

"Commit my changes with message 'feat: add dashboard'"
→ Calls devsolo_commit

"Ship this feature to production"
→ Calls devsolo_ship
```

### Direct MCP Tool Invocation

For more explicit control:

```
Use devsolo_launch with branchName "feature/dashboard" and description "Admin dashboard"

Use devsolo_commit with message "feat: add dashboard" and stagedOnly false

Use devsolo_ship with createPR true and prDescription "Add admin dashboard"
```

### Hybrid Approach

Mix both styles as needed:

```
"Start a new feature for user profiles"
*work on code*
Use devsolo_commit with message "feat: add user profile page"
"Ship this when CI passes"
```

## Common Workflows

### Quick Bug Fix

```
"Create a hotfix for the login timeout bug"
*fix the code*
"Commit this fix"
"Ship the hotfix immediately"
```

Or with direct tools:

```
Use devsolo_hotfix with issue "login timeout" and severity "critical"
Use devsolo_commit with message "fix: resolve login timeout"
Use devsolo_ship with merge true
```

### Multiple Features in Parallel

```
"Start a new feature for user authentication"
*work on auth*

"Start another feature for the dashboard"
*work on dashboard*

"Switch back to the authentication feature"
*continue auth work*

"Ship the authentication feature"

"Switch to the dashboard feature"
*finish dashboard*

"Ship the dashboard feature"
```

### Cancel a Feature

```
"Abort the current workflow"
```

Or with options:

```
Use devsolo_abort with deleteBranch true
```

### View All Active Sessions

```
"Show me all my active devsolo sessions"
```

Or:

```
Use devsolo_sessions with verbose true
```

### Clean Up Old Sessions

```
"Clean up old devsolo sessions and merged branches"
```

Or:

```
Use devsolo_cleanup with deleteBranches true
```

## Key MCP Tools Reference

| MCP Tool | What It Does | Natural Language Example |
|----------|--------------|--------------------------|
| `devsolo_init` | Set up devsolo in your project | "Initialize devsolo here" |
| `devsolo_launch` | Start a new feature workflow | "Start a feature for user auth" |
| `devsolo_commit` | Commit your changes | "Commit with message 'feat: add auth'" |
| `devsolo_ship` | Push, create PR, merge | "Ship this feature" |
| `devsolo_status` | Check current workflow status | "What's my workflow status?" |
| `devsolo_sessions` | List all active workflows | "Show my active sessions" |
| `devsolo_swap` | Switch between workflows | "Switch to the dashboard branch" |
| `devsolo_abort` | Cancel current workflow | "Abort this workflow" |
| `devsolo_hotfix` | Create emergency hotfix | "Create a hotfix for bug X" |
| `devsolo_cleanup` | Clean up old sessions/branches | "Clean up old sessions" |
| `devsolo_status_line` | Manage Claude Code status display | "Enable the status line" |

## Status Line Integration

Enable the status line to see workflow status directly in Claude Code:

```
Enable the devsolo status line
```

Or:

```
Use devsolo_status_line with action "enable"
```

You'll see your workflow status:

```
[devsolo] 📝 0c2a20a7 | feature/user-auth | CHANGES_COMMITTED
```

Customize the format:

```
Use devsolo_status_line with action "update" and format "{icon} {branch} ({state})"
```

## Tips for Success

1. **Use natural language** - Claude Code understands your intent and calls the right tools
2. **Ask for status often** - "What's my workflow status?" keeps you informed
3. **Let devsolo manage Git** - Avoid direct `git commit`, `git push`, or `gh pr create` during active sessions
4. **Clean up periodically** - "Clean up old sessions" keeps things tidy
5. **Enable the status line** - Visual feedback helps track workflow state
6. **Use structured commits** - Follow conventional commits (feat:, fix:, docs:, etc.)

## Understanding Workflow States

devsolo tracks your progress through workflow states:

| State | Meaning | Next Step |
|-------|---------|-----------|
| `INIT` | Just initialized | Launch a feature |
| `BRANCH_READY` | Feature branch created | Make changes |
| `CHANGES_COMMITTED` | Changes committed | Ship or commit more |
| `PUSHED` | Pushed to remote | Create PR |
| `PR_CREATED` | PR is open | Merge or wait for CI |
| `WAITING_APPROVAL` | Awaiting review | Get approval |
| `MERGED` | PR merged | Launch next feature |
| `COMPLETE` | Workflow finished | Launch next feature |

Ask Claude anytime: "What state am I in and what should I do next?"

## Troubleshooting

### MCP Server Not Found

**Problem**: Claude Code can't find devsolo MCP server

**Solutions**:
1. Verify path in `claude_desktop_config.json` is absolute
2. Check file exists: `ls /path/to/devsolo/bin/devsolo-mcp`
3. Make executable: `chmod +x /path/to/devsolo/bin/devsolo-mcp`
4. Restart Claude Code after config changes

### devsolo Not Initialized

**Problem**: "devsolo is not initialized in this project"

**Solution**:
```
Initialize devsolo in this project
```

This creates `.devsolo` directory in your project.

### GitHub Authentication Fails

**Problem**: "GitHub authentication failed"

**Solutions**:
```bash
# Use GitHub CLI (easiest)
gh auth login

# Or set token explicitly
export GITHUB_TOKEN=ghp_your_token

# Verify authentication
gh auth status
```

### Session Seems Stuck

**Problem**: Workflow state doesn't match reality

**Solutions**:
```
"Show me verbose session information"

# If stuck, abort and restart
"Abort this workflow"
"Start a new feature for X"
```

### Validation Errors

**Problem**: Pre-flight checks fail

**Example**: "Working directory is not clean"

**Solution**: devsolo strictly validates before operations. To resolve:
- Commit your changes: `git commit -am "message"`
- Stash your changes: `git stash`
- Discard your changes: `git restore .`

Pre-flight checks cannot be bypassed - you must have a clean working directory before launching.

### Can't Find Old Sessions

**Problem**: Previous sessions not showing

**Solution**:
```
Use devsolo_sessions with all true to see completed sessions
```

## Next Steps

Now that you're set up:

- **Learn more**: See [Usage Guide](usage.md) for advanced patterns
- **Explore tools**: Read [MCP Tools Reference](mcp-tools-reference.md) for complete documentation
- **Understand architecture**: Check [MCP Architecture](../dev/system/mcp-architecture.md) for design details
- **Migrating from v1.x?**: See [Migration Guide](migration-from-cli.md)
- **Troubleshooting**: Visit [Troubleshooting Guide](troubleshooting.md)

## Getting Help

- **Documentation**: [GitHub Repository](https://github.com/slamb2k/devsolo)
- **Issues**: [Report a bug](https://github.com/slamb2k/devsolo/issues)
- **Discussions**: [Ask questions](https://github.com/slamb2k/devsolo/discussions)
- **Ask Claude**: "How do I use devsolo to...?"

---

**You're all set!** Start shipping features with Claude Code:

```
"Start a new feature for [your feature]"
*work with Claude to implement*
"Commit these changes"
"Ship this feature"
```

🚀 Welcome to AI-native Git workflow automation!
