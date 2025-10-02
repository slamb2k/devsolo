# Claude Code MCP Slash Commands Guide

## How MCP Commands Actually Work in Claude Code

Based on the official Claude Code documentation, MCP servers CAN expose prompts as slash commands that become available in Claude Code. This is a key feature that makes MCP servers more powerful than initially understood.

## Command Format

When your MCP server is connected, the prompts appear as slash commands following this pattern:

```
/mcp__<server-name>__<prompt-name> [arguments]
```

For the han-solo MCP server, the commands will appear as:

- `/mcp__hansolo__init` - Initialize han-solo
- `/mcp__hansolo__launch` - Start a new feature workflow  
- `/mcp__hansolo__sessions` - List workflow sessions
- `/mcp__hansolo__swap` - Switch between branches
- `/mcp__hansolo__ship` - Ship your changes
- `/mcp__hansolo__abort` - Abort workflow session
- `/mcp__hansolo__status` - Show workflow status

## Setting Up han-solo Commands

### 1. Configure the MCP Server

In your Claude Desktop configuration (`claude_desktop_config.json`):

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

### 2. Build the Enhanced Server

```bash
# Build the MCP server
npm run build:mcp

# Or build everything
npm run build && npm run build:mcp
```

### 3. Restart Claude Desktop

After configuration, restart Claude Desktop to load the MCP server.

### 4. Verify Commands Are Available

Type `/mcp` in Claude Code to:
- View all configured MCP servers
- Check connection status
- View available tools and prompts from each server

Then type `/mcp__hansolo` and you should see the available commands appear!

## Using the Commands

### Basic Commands (No Arguments)

```
/mcp__hansolo__status
/mcp__hansolo__sessions
```

### Commands with Arguments

```
/mcp__hansolo__init project
/mcp__hansolo__launch feature/auth "Authentication feature"
/mcp__hansolo__swap main true
/mcp__hansolo__ship "feat: add login" true true
```

### Argument Handling

Based on how we've defined the prompts:

| Command | Arguments | Example |
|---------|-----------|---------|
| `init` | `[scope]` `[force]` | `/mcp__hansolo__init project true` |
| `launch` | `[branchName]` `[description]` | `/mcp__hansolo__launch feature/auth "OAuth implementation"` |
| `sessions` | `[all]` `[verbose]` | `/mcp__hansolo__sessions true true` |
| `swap` | `<branchName>` `[stash]` | `/mcp__hansolo__swap main true` |
| `ship` | `[message]` `[push]` `[createPR]` | `/mcp__hansolo__ship "fix: bug" true true` |
| `abort` | `[branchName]` `[deleteBranch]` | `/mcp__hansolo__abort feature/test true` |
| `status` | - | `/mcp__hansolo__status` |

**Note**: `<>` = required, `[]` = optional

## Features

### Dynamic Discovery
- Commands are automatically available when the MCP server is connected
- The server must expose prompts through the MCP protocol
- Prompts are discovered during connection

### Naming Conventions
According to Claude Code docs:
- Server and prompt names are normalized
- Spaces and special characters become underscores
- Names are lowercased for consistency

So our prompt names like `init`, `launch`, etc. become:
- `mcp__hansolo__init`
- `mcp__hansolo__launch`

### Autocomplete
The enhanced server provides branch name completions for:
- `swap` command - suggests available branches
- `abort` command - suggests active session branches

## Permissions

When configuring permissions for MCP tools, note that wildcards are NOT supported:

✅ **Correct**:
- `mcp__hansolo` - Approves ALL tools from the hansolo server
- `mcp__hansolo__ship` - Approves specific tool

❌ **Incorrect**:
- `mcp__hansolo__*` - Wildcards not supported

## Troubleshooting

### Commands Not Appearing

1. **Check MCP Server Connection**:
   ```
   /mcp
   ```
   This shows all configured servers and their status.

2. **Verify Server is Running**:
   Check that the MCP server process is active and not erroring.

3. **Check Prompt Registration**:
   The server must properly implement `ListPromptsRequestSchema` and `GetPromptRequestSchema`.

4. **Restart Claude Desktop**:
   After configuration changes, always restart Claude Desktop.

### Command Format Issues

If commands aren't working:
1. Check the exact format: `/mcp__hansolo__<command>`
2. Note the double underscores between segments
3. All lowercase (hansolo, not HanSolo)

### Arguments Not Working

1. Ensure arguments are space-separated
2. Quote strings with spaces: `"feature description"`
3. Booleans can be `true`/`false` or omitted for false

## Dual Usage Pattern

With the enhanced MCP server, you get BOTH:

### 1. Slash Commands (Structured)
```
/mcp__hansolo__launch feature/auth
/mcp__hansolo__ship "fix: memory leak" true true
```

### 2. Natural Language (Flexible)
```
"Start a new feature branch for authentication"
"Ship my changes with a fix for the memory leak"
```

Both patterns work simultaneously, giving users maximum flexibility!

## Examples

### Starting a New Feature
```
/mcp__hansolo__launch feature/user-profile "User profile management"
```

### Checking Status
```
/mcp__hansolo__status
```

### Shipping Changes
```
/mcp__hansolo__ship "feat: add user profiles" true true
```
This commits with the message, pushes to remote, and creates a PR.

### Switching Branches with Stash
```
/mcp__hansolo__swap main true
```
This switches to main and stashes current changes.

### Viewing All Sessions
```
/mcp__hansolo__sessions true true
```
Shows all sessions (including completed) with verbose output.

## Benefits

1. **Fast Access**: Type `/mcp__h` and autocomplete helps
2. **Precise Control**: Exact parameters without ambiguity  
3. **Discoverable**: Commands show up in the slash menu
4. **Natural Alternative**: Can still use conversational style
5. **Visual Feedback**: See available commands and their descriptions

## Summary

The han-solo MCP server provides slash commands in Claude Code through the MCP protocol. After proper setup, you can use commands like `/mcp__hansolo__launch` directly in Claude Code, getting the best of both command-line precision and AI assistance!