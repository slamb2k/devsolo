# Installing hansolo Dev Version

This guide explains how to install the development version of hansolo for use in other projects as both a CLI tool and MCP server.

## Prerequisites

- Node.js v20.0.0 or higher
- npm or yarn
- Git

## Installation Methods

### Method 1: Global Link (Recommended for Development)

This method creates a symbolic link to your development version. Changes in the source are immediately reflected.

```bash
# 1. Clone and navigate to hansolo directory
cd /home/slamb2k/work/hansolo

# 2. Install dependencies
npm install

# 3. Build the project
npm run build

# 4. Create global link
npm link --force

# 5. Verify installation
which hansolo        # Should show: ~/.nvm/versions/node/vXX.X.X/bin/hansolo
which hansolo-mcp    # Should show: ~/.nvm/versions/node/vXX.X.X/bin/hansolo-mcp
```

#### Using in Another Project

```bash
# In your other project directory
cd /path/to/your/project

# Link to the dev version
npm link hansolo-cli

# Or add manually to package.json
{
  "dependencies": {
    "hansolo-cli": "file:../hansolo"
  }
}
```

### Method 2: Local File Installation

Install directly from the local filesystem:

```bash
# In your target project
npm install ../hansolo

# Or with absolute path
npm install /home/slamb2k/work/hansolo
```

### Method 3: Git Repository Installation

```bash
# Install from local git repository
npm install git+file:///home/slamb2k/work/hansolo

# Or if you've pushed to GitHub
npm install git+https://github.com/yourusername/hansolo.git
```

### Method 4: Pack and Install (Production-like)

This creates a tarball similar to what would be published to npm:

```bash
# In hansolo directory
npm pack
# Creates: hansolo-cli-1.0.0.tgz

# In target project
npm install /path/to/hansolo-cli-1.0.0.tgz
```

## Setting Up MCP Server

### For Claude Desktop

1. **Configure Claude Desktop settings**:

Create or edit `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "hansolo": {
      "command": "hansolo-mcp",
      "args": [],
      "env": {
        "HANSOLO_DEBUG": "false"
      }
    }
  }
}
```

2. **Alternative: Project-specific MCP configuration**:

In your project, create `.mcp.json`:

```json
{
  "mcpServers": {
    "hansolo": {
      "command": "/home/slamb2k/.nvm/versions/node/v22.19.0/bin/hansolo-mcp",
      "args": [],
      "env": {
        "HANSOLO_DEBUG": "false",
        "NODE_PATH": "/home/slamb2k/work/hansolo/node_modules"
      }
    }
  }
}
```

### Starting MCP Server Manually

```bash
# Start in foreground
hansolo-mcp

# Start with debug output
HANSOLO_DEBUG=1 hansolo-mcp

# Start on custom port
HANSOLO_MCP_PORT=8081 hansolo-mcp

# Start as background service
nohup hansolo-mcp > ~/.hansolo/mcp.log 2>&1 &
```

## Verifying Installation

### CLI Verification

```bash
# Check CLI version
hansolo --version

# Initialize in a test project
mkdir test-project && cd test-project
git init
hansolo init

# Check status
hansolo status
```

### MCP Server Verification

```bash
# Test MCP server
hansolo-mcp &
sleep 2
curl http://localhost:8080/health

# Kill test server
killall hansolo-mcp
```

## Using in Your Project

### As CLI Tool

```bash
# Initialize hansolo in your project
cd /path/to/your/project
hansolo init

# Start a workflow
hansolo launch --branch feature/my-feature

# Ship changes
hansolo ship --push --create-pr
```

### As MCP Server (with Claude)

In Claude Desktop, use commands like:
```
/hansolo:init
/hansolo:launch
/hansolo:ship
/hansolo:status
```

### Programmatic Usage

```javascript
// In your Node.js project
const { InitCommand } = require('hansolo-cli/dist/commands/hansolo-init');
const { LaunchCommand } = require('hansolo-cli/dist/commands/hansolo-launch');

async function useHansolo() {
  // Initialize
  const init = new InitCommand();
  await init.execute();

  // Launch workflow
  const launch = new LaunchCommand();
  await launch.execute({
    branchName: 'feature/automated',
    description: 'Automated feature'
  });
}
```

## Development Workflow

When developing hansolo:

```bash
# Make changes in hansolo source
cd /home/slamb2k/work/hansolo
# Edit files...

# Rebuild
npm run build

# Changes are immediately available in linked projects
# No need to reinstall!
```

### Watch Mode

For active development:
```bash
# Auto-rebuild on changes
npm run dev
```

## Troubleshooting

### Issue: Command not found

```bash
# Ensure npm bin is in PATH
export PATH="$(npm bin -g):$PATH"

# Or add to ~/.zshrc or ~/.bashrc
echo 'export PATH="$(npm bin -g):$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Issue: Permission denied

```bash
# Fix permissions
chmod +x /home/slamb2k/work/hansolo/bin/hansolo.js
chmod +x /home/slamb2k/work/hansolo/bin/hansolo-mcp
```

### Issue: Module not found

```bash
# Rebuild and relink
cd /home/slamb2k/work/hansolo
npm install
npm run build
npm link --force
```

### Issue: MCP server won't start

```bash
# Check if port is in use
lsof -i :8080

# Use different port
HANSOLO_MCP_PORT=8081 hansolo-mcp

# Check logs
tail -f ~/.hansolo/logs/mcp-server.log
```

## Uninstalling

### Remove global link

```bash
# Unlink globally
npm unlink -g hansolo-cli

# Remove from project
cd /path/to/your/project
npm unlink hansolo-cli
```

### Clean up

```bash
# Remove hansolo data (careful!)
rm -rf ~/.hansolo
rm -rf ./.hansolo  # In project directory
```

## Environment Variables

Configure hansolo behavior:

```bash
export HANSOLO_DEBUG=1           # Enable debug output
export HANSOLO_MCP_PORT=8081     # Custom MCP port
export HANSOLO_LOG_LEVEL=debug   # Set log level
export HANSOLO_NO_COLOR=1        # Disable colors
export GITHUB_TOKEN=ghp_xxx      # Optional: For GitHub integration (or use 'gh auth login')
```

## Next Steps

1. Initialize hansolo in your project: `hansolo init`
2. Configure Claude Desktop for MCP integration
3. Read the [Command Reference](../reference/command-reference.md)
4. Check the [Troubleshooting Guide](./troubleshooting.md)

## Support

- Documentation: `/docs` directory
- Issues: GitHub Issues (when published)
- Logs: `~/.hansolo/logs/`

---

*Installation guide v1.0.0*
*Last updated: 2025-10-02*
