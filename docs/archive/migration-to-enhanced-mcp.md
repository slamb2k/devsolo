# Migration Guide: Legacy to Enhanced MCP Server

## Overview

The enhanced MCP server (`devsolo-mcp-server-enhanced`) provides significant improvements over the legacy version, including support for both natural language tools and structured prompts. This guide will help you migrate from the legacy server to the enhanced version.

## What's New in the Enhanced Server

### 1. Dual Usage Patterns
- **Tools**: Natural language invocation (existing functionality)
- **Prompts**: NEW - Structured command-like interface with slash-command style

### 2. Improved Features
- Intelligent autocomplete for branch names
- Rich feedback with emojis and formatting
- Better error messages with recovery suggestions
- Prompt templates with examples
- Enhanced parameter validation

### 3. Better Developer Experience
- Clearer next-step guidance after each command
- Contextual help based on current state
- Support for both naming conventions (`devsolo_init` and `devsolo/init`)

## Migration Steps

### Step 1: Update Claude Desktop Configuration

**Before (Legacy):**
```json
{
  "mcpServers": {
    "devsolo": {
      "command": "node",
      "args": ["/path/to/devsolo/dist/mcp/devsolo-mcp-server.js"]
    }
  }
}
```

**After (Enhanced):**
```json
{
  "mcpServers": {
    "devsolo": {
      "command": "node",
      "args": ["/path/to/devsolo/dist/mcp/devsolo-mcp-server-enhanced.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### Step 2: Build the Enhanced Server

```bash
# Clean previous builds
npm run clean

# Build both CLI and enhanced MCP server
npm run build
npm run build:mcp

# Or build everything at once
npm run prepack
```

### Step 3: Verify Installation

```bash
# Test that the enhanced server starts correctly
npm run mcp:start

# Or use the bin script
./bin/devsolo-mcp-enhanced

# Run tests to ensure everything works
npm run test:mcp
```

### Step 4: Restart Claude Desktop

After updating the configuration, you must restart Claude Desktop for the changes to take effect.

## Usage Changes

### Legacy Server (Tools Only)

With the legacy server, you could only use natural language:
- "Initialize devsolo in this project"
- "Start a new feature branch"
- "Show me my sessions"

### Enhanced Server (Tools + Prompts)

With the enhanced server, you have both options:

**Natural Language (unchanged):**
- "Initialize devsolo in this project"
- "Start a new feature branch for authentication"
- "Show me all active sessions"

**NEW - Structured Prompts:**
- `devsolo/init scope:project`
- `devsolo/launch branchName:feature/auth`
- `devsolo/sessions all:true verbose:true`
- `devsolo/swap branchName:main stash:true`
- `devsolo/ship push:true createPR:true`

## Feature Comparison

| Feature | Legacy Server | Enhanced Server |
|---------|--------------|-----------------|
| Natural language tools | ✅ | ✅ |
| Structured prompts | ❌ | ✅ |
| Autocomplete | ❌ | ✅ |
| Emoji feedback | ❌ | ✅ |
| Prompt templates | ❌ | ✅ |
| Examples in prompts | ❌ | ✅ |
| Next-step guidance | Basic | Enhanced |
| Error recovery hints | Basic | Enhanced |
| Command normalization | ❌ | ✅ |

## Breaking Changes

### None! 🎉

The enhanced server is fully backward compatible. All existing natural language interactions will continue to work exactly as before. The enhanced server simply adds new capabilities on top of the existing functionality.

## Configuration Options

### Environment Variables

The enhanced server supports additional environment variables:

```json
{
  "mcpServers": {
    "devsolo": {
      "command": "node",
      "args": ["/path/to/devsolo/dist/mcp/devsolo-mcp-server-enhanced.js"],
      "env": {
        "NODE_ENV": "production",
        "DEVSOLO_BASE_PATH": ".devsolo",
        "DEVSOLO_DEFAULT_BRANCH": "main",
        "DEVSOLO_AUTO_CLEANUP": "true",
        "DEVSOLO_VERBOSE": "false"
      }
    }
  }
}
```

## Testing the Migration

### 1. Test Natural Language (Should Work As Before)

Ask Claude:
- "Initialize devsolo for this project"
- "Start a new feature branch"
- "Show current status"

### 2. Test New Prompt Features

Try the new structured commands:
- `devsolo/init`
- `devsolo/launch branchName:test-feature`
- `devsolo/status`

### 3. Test Autocomplete

When using `devsolo/swap`, you should see branch name suggestions if you have active sessions.

### 4. Verify Enhanced Feedback

Commands should now return:
- Emoji indicators (✅, 🚀, 📋, etc.)
- Clear next steps
- Helpful error messages

## Rollback Instructions

If you need to rollback to the legacy server:

1. Update `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "devsolo": {
      "command": "node",
      "args": ["/path/to/devsolo/dist/mcp/devsolo-mcp-server.js"]
    }
  }
}
```

2. Restart Claude Desktop

3. Use the legacy start script if needed:
```bash
npm run mcp:start:legacy
```

## Troubleshooting

### Server Not Found

```bash
# Ensure the enhanced server is built
npm run build:mcp

# Check the file exists
ls -la dist/mcp/devsolo-mcp-server-enhanced.js
```

### Prompts Not Appearing

1. Verify you're using the enhanced server (check logs)
2. Restart Claude Desktop
3. Check that the server supports prompts capability

### Autocomplete Not Working

1. Ensure you have active sessions for branch completion
2. The enhanced server must be running (not legacy)
3. Claude Desktop must support the completion capability

### Performance Issues

If the enhanced server seems slower:
1. Check `NODE_ENV=production` is set
2. Disable verbose logging
3. Consider increasing Node.js memory: `--max-old-space-size=2048`

## Benefits of Migrating

1. **Flexibility**: Users can choose their preferred interaction style
2. **Efficiency**: Power users get faster command execution with prompts
3. **Discovery**: New users can explore with natural language
4. **Precision**: Structured prompts eliminate ambiguity
5. **Better UX**: Enhanced feedback and guidance
6. **Future-Proof**: New features will be added to enhanced server

## Support

If you encounter issues during migration:

1. Check the [MCP Integration Guide](./MCP-INTEGRATION.md)
2. Review test output: `npm run test:mcp`
3. Check Claude Desktop logs for errors
4. File an issue on GitHub with:
   - Your configuration
   - Error messages
   - Steps to reproduce

## Next Steps

After successful migration:

1. Explore the new prompt commands
2. Try autocomplete features
3. Enjoy the enhanced feedback
4. Share feedback for future improvements

## Version Compatibility

| devsolo Version | Legacy Server | Enhanced Server | Recommended |
|-----------------|---------------|-----------------|-------------|
| < 1.0.0 | ✅ | ❌ | Legacy |
| 1.0.0 - 1.9.x | ✅ | ❌ | Legacy |
| 2.0.0+ | ✅ | ✅ | **Enhanced** |

## FAQ

### Q: Will my existing workflows break?
A: No, the enhanced server is fully backward compatible.

### Q: Can I run both servers simultaneously?
A: No, Claude Desktop should only connect to one devsolo MCP server at a time.

### Q: Do I need to retrain my usage patterns?
A: No, but you can optionally learn the new prompt syntax for faster operations.

### Q: Is the enhanced server stable?
A: Yes, it includes comprehensive tests and error handling.

### Q: Can I contribute to the enhanced server?
A: Yes! The codebase is modular and well-documented for contributions.