# han-solo MCP Integration Guide

## Overview

han-solo provides a Model Context Protocol (MCP) server that enables seamless integration with Claude Desktop and other MCP-compatible AI assistants. This integration supports **two usage patterns**:

1. **Natural Language**: Ask Claude to perform Git workflow tasks conversationally
2. **Structured Prompts**: Use command-like syntax for precise, quick actions

## Installation & Configuration

### 1. Install han-solo MCP Server

```bash
# In your han-solo directory
npm install
npm run build

# Make the MCP server executable
npm link
```

### 2. Configure Claude Desktop

Add the han-solo MCP server to your Claude Desktop configuration:

**Location**: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)
or `~/.config/Claude/claude_desktop_config.json` (Linux)

```json
{
  "mcpServers": {
    "hansolo": {
      "command": "node",
      "args": ["/path/to/hansolo/dist/mcp/hansolo-mcp-server-enhanced.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

Replace `/path/to/hansolo` with your actual han-solo installation path.

### 3. Restart Claude Desktop

After updating the configuration, restart Claude Desktop for the changes to take effect.

## Usage Patterns

### Natural Language (Tools)

Simply describe what you want to do in plain English. Claude will understand the context and invoke the appropriate han-solo commands.

**Examples:**
- "Initialize han-solo in this project"
- "Start a new feature branch for user authentication"
- "Show me all active workflow sessions"
- "Switch to the main branch and stash my changes"
- "Ship my changes with a commit message 'feat: add login'"
- "Abort the current workflow and delete the branch"

### Structured Prompts (Command-like)

Use prompt syntax for more precise control. These work like slash commands but with better parameter support.

**Available Prompts:**
- `hansolo/init` - Initialize han-solo
- `hansolo/launch` - Start new feature workflow
- `hansolo/sessions` - List workflow sessions
- `hansolo/swap` - Switch between branches
- `hansolo/ship` - Ship changes (commit, push, PR, merge)
- `hansolo/abort` - Abort workflow
- `hansolo/status` - Show current status

**Examples:**
```
hansolo/init scope:project
hansolo/launch branchName:feature/oauth description:"Add OAuth support"
hansolo/sessions all:true verbose:true
hansolo/swap branchName:main stash:true
hansolo/ship message:"fix: resolve memory leak" push:true createPR:true
hansolo/abort deleteBranch:true
```

## Feature Details

### Tools vs Prompts

**Tools** (Natural Language):
- Invoked automatically by Claude based on context
- Best for complex requests or when you're unsure of exact parameters
- Claude interprets intent and fills in defaults
- Examples:
  - "Help me set up han-solo for this project"
  - "I need to switch to my authentication feature branch"
  
**Prompts** (Structured Commands):
- Direct invocation with specific parameters
- Best when you know exactly what you want
- Faster for experienced users
- Provides autocomplete for branch names (swap, abort)
- Examples:
  - `hansolo/launch branchName:fix/bug-123`
  - `hansolo/ship push:true createPR:true`

### Autocomplete Support

The enhanced MCP server provides intelligent autocomplete for:
- Branch names when using `hansolo/swap` or `hansolo/abort`
- Parameter suggestions based on context
- Session IDs from active workflows

### Error Handling

Both usage patterns include:
- Clear error messages with suggested fixes
- State validation before operations
- Rollback capabilities for failed operations
- Confirmation prompts for destructive actions (unless bypassed with `yes:true` or `force:true`)

## Common Workflows

### Starting a New Feature

**Natural Language:**
"Start a new feature branch for adding user profile functionality"

**Structured:**
```
hansolo/launch branchName:feature/user-profile description:"User profile CRUD operations"
```

### Shipping Changes

**Natural Language:**
"Commit my changes with message 'feat: add profile API', push to remote, and create a PR"

**Structured:**
```
hansolo/ship message:"feat: add profile API" push:true createPR:true
```

### Managing Multiple Features

**Natural Language:**
"Show me all my active han-solo sessions, then switch to the payments branch"

**Structured:**
```
hansolo/sessions
hansolo/swap branchName:feature/payments stash:true
```

### Cleaning Up

**Natural Language:**
"Abort the current feature and delete the branch"

**Structured:**
```
hansolo/abort deleteBranch:true yes:true
```

## Troubleshooting

### MCP Server Not Detected

1. Verify the server path in `claude_desktop_config.json`
2. Check that the MCP server file exists and is executable
3. Look for errors in Claude Desktop logs
4. Restart Claude Desktop after configuration changes

### Commands Not Working

1. Ensure han-solo is initialized in your project (`hansolo/init`)
2. Check you're in a Git repository
3. Verify Git remote is configured
4. Use `hansolo/status` to check current state

### Autocomplete Not Showing

1. Ensure you have active sessions for branch autocomplete
2. The enhanced server (`hansolo-mcp-server-enhanced.js`) must be used
3. Claude Desktop must be restarted after server updates

### Permission Errors

1. Ensure the MCP server has read/write access to `.hansolo` directory
2. Check Git credentials are configured
3. Verify SSH keys or tokens for remote operations

## Advanced Configuration

### Environment Variables

You can pass environment variables to the MCP server:

```json
{
  "mcpServers": {
    "hansolo": {
      "command": "node",
      "args": ["/path/to/hansolo/dist/mcp/hansolo-mcp-server-enhanced.js"],
      "env": {
        "NODE_ENV": "production",
        "HANSOLO_BASE_PATH": ".hansolo",
        "HANSOLO_DEFAULT_BRANCH": "main",
        "HANSOLO_AUTO_CLEANUP": "true"
      }
    }
  }
}
```

### Custom Preferences

Configure default behaviors in `.hansolo/config.yaml`:

```yaml
preferences:
  defaultBranchPrefix: feature/
  autoCleanup: true
  confirmBeforePush: true
  colorOutput: true
  verboseLogging: false
```

## Best Practices

1. **Use Natural Language** for:
   - Complex, multi-step operations
   - When you're unsure of exact parameters
   - Exploratory work

2. **Use Prompts** for:
   - Repetitive tasks
   - When you know exact parameters
   - Quick operations
   - Scripted workflows

3. **Combine Both**:
   - Start with natural language to understand options
   - Switch to prompts for efficiency once familiar

4. **State Management**:
   - Always check `hansolo/status` if unsure of current state
   - Use `hansolo/sessions` to see all active workflows
   - Clean up completed sessions regularly

## Examples

### Example 1: Full Feature Development Flow

```
User: Initialize han-solo for this project
Claude: [Executes hansolo/init]

User: hansolo/launch branchName:feature/search description:"Add search functionality"
Claude: [Creates branch and starts workflow]

User: [Makes code changes]

User: Ship my changes with a good commit message and create a PR
Claude: [Executes hansolo/ship with appropriate parameters]

User: hansolo/status
Claude: [Shows current workflow state]
```

### Example 2: Multi-Branch Management

```
User: Show me what I'm working on
Claude: [Executes hansolo/sessions]

User: I need to quickly fix something on the auth branch
Claude: [Suggests hansolo/swap with stash option]

User: hansolo/swap branchName:feature/auth stash:true
Claude: [Switches branch, stashing current changes]

User: [Makes fixes]

User: Ship this hotfix immediately to main
Claude: [Executes hansolo/ship with push and merge options]
```

## Support

For issues or questions:
1. Check the [han-solo documentation](https://github.com/yourusername/hansolo)
2. Review MCP server logs in Claude Desktop
3. File issues on the han-solo GitHub repository