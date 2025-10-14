# Installing devsolo as a Claude Code Plugin

This guide explains how to install devsolo as a native Claude Code plugin, which provides the easiest installation method with automatic MCP server configuration.

## Overview

devsolo can be installed as a Claude Code plugin, which bundles:
- MCP server with all 11 workflow tools
- 13 slash commands (`/devsolo:*`)
- 2 sub-agents (git-droid and docs-droid)
- All necessary dependencies

## Prerequisites

- Claude Code installed
- Node.js 20+ (for MCP server execution)
- Git installed and configured

## Installation Methods

### Method 1: Plugin Installation (Recommended)

**Status**: Coming soon - awaiting Claude Code marketplace

When the Claude Code marketplace becomes available, you'll be able to install with:

```bash
/plugin install devsolo
```

### Method 2: Local Plugin Installation (For Development/Testing)

For testing or development, you can install the plugin from a local build:

#### Step 1: Build the Plugin

```bash
# Clone the repository
git clone https://github.com/slamb2k/devsolo.git
cd devsolo

# Install dependencies and build
npm install
npm run build:plugin
```

This creates a `dist-plugin/` directory with the complete plugin package.

#### Step 2: Add Local Marketplace (Optional)

Create or update your Claude Code marketplace configuration to point to the local plugin:

```json
{
  "name": "local-test",
  "plugins": {
    "devsolo": {
      "name": "devsolo",
      "version": "2.0.0",
      "source": "file:///path/to/devsolo/dist-plugin"
    }
  }
}
```

#### Step 3: Install from Local Marketplace

Use Claude Code's plugin system to install from your local marketplace.

### Method 3: Manual MCP Installation (Alternative)

If you prefer manual control or the plugin system isn't available, see [Manual Installation](./installation.md).

## Verification

After installation, verify devsolo is working:

1. **Check MCP server status**: The MCP server should auto-start when Claude Code loads
2. **Test a slash command**: Try `/devsolo:info` to check workflow status
3. **Verify tools are available**: MCP tools should be listed in Claude Code's tool panel

## Usage

Once installed as a plugin, use devsolo through its slash commands:

```
/devsolo:init         # Initialize devsolo in your project
/devsolo:launch       # Start a new feature workflow
/devsolo:commit       # Commit changes
/devsolo:ship         # Push, create PR, merge, and cleanup
/devsolo:info       # Show current workflow status
/devsolo:sessions     # List active workflow sessions
/devsolo:swap         # Switch between workflow sessions
/devsolo:abort        # Abort a workflow session
/devsolo:hotfix       # Create emergency hotfix workflow
/devsolo:cleanup      # Clean up expired sessions
/devsolo:info-line  # Manage status line display
```

For detailed usage of each command, see the [Quickstart Guide](./quickstart.md).

## Plugin Structure

When installed as a plugin, devsolo uses this structure:

```
${CLAUDE_PLUGIN_ROOT}/
├── .claude-plugin/
│   └── plugin.json          # Plugin manifest with MCP server config
├── commands/                # Slash commands
│   ├── init.md
│   ├── launch.md
│   ├── commit.md
│   └── ... (13 commands)
├── agents/                  # Sub-agents
│   ├── git-droid.md
│   └── docs-droid.md
├── dist/                    # Compiled MCP server
│   └── mcp/
│       └── devsolo-mcp-server.js
└── node_modules/            # Bundled dependencies
```

The `${CLAUDE_PLUGIN_ROOT}` environment variable is set by Claude Code and points to the plugin's installation directory.

## Troubleshooting

### MCP Server Not Starting

**Symptoms**: Commands fail with "MCP server not available"

**Solutions**:
1. Check Claude Code logs for MCP server startup errors
2. Verify Node.js 20+ is installed: `node --version`
3. Check that the plugin directory exists and contains `dist/mcp/devsolo-mcp-server.js`
4. Restart Claude Code to reload the plugin

### Slash Commands Not Available

**Symptoms**: `/devsolo:*` commands are not recognized

**Solutions**:
1. Verify the plugin is enabled in Claude Code settings
2. Check that `commands/` directory contains all 13 `.md` files
3. Restart Claude Code to reload slash command definitions

### Plugin Path Issues

**Symptoms**: MCP server fails to start with "module not found" errors

**Solutions**:
1. Check that `${CLAUDE_PLUGIN_ROOT}` is being set correctly
2. Verify all dependencies are bundled in `node_modules/`
3. Check MCP server logs for specific path resolution errors

### Updating the Plugin

To update to a new version:

1. **If installed from marketplace**: Use Claude Code's update mechanism
2. **If installed locally**:
   ```bash
   cd devsolo
   git pull
   npm install
   npm run build:plugin
   # Then reload plugin in Claude Code
   ```

## Differences from Manual Installation

| Feature | Plugin Installation | Manual Installation |
|---------|-------------------|---------------------|
| Setup complexity | Automatic | Manual MCP config |
| MCP server | Auto-configured | Manual configuration |
| Slash commands | Auto-registered | Manual registration |
| Updates | Automatic (marketplace) | Manual `git pull` |
| Portability | Per Claude Code instance | Per system |

## Uninstalling

To uninstall the devsolo plugin:

1. Use Claude Code's plugin management to disable/remove the plugin
2. Remove any project-specific `.devsolo/` directories if desired
3. MCP server configuration is automatically removed with plugin

## Next Steps

- [Quickstart Guide](./quickstart.md) - Learn the basic workflow
- [Slash Commands Reference](../reference/slash-commands.md) - All available commands
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions

## Support

- [GitHub Issues](https://github.com/slamb2k/devsolo/issues)
- [Documentation](https://github.com/slamb2k/devsolo/tree/main/docs)
- [Contributing Guide](../../CONTRIBUTING.md)
