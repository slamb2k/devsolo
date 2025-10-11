# devsolo Installation Guide

Complete installation instructions for devsolo v2.0.0 MCP server with Claude Code.

## Overview

devsolo v2.0.0 is a pure MCP (Model Context Protocol) server that integrates with Claude Code. There is no standalone CLI installation - devsolo works exclusively through Claude Code's MCP interface.

## Prerequisites

Before installing devsolo, ensure you have:

- **Node.js 20+** and npm
- **Git 2.30+**
- **Claude Code** installed and configured
- **GitHub account** with authentication
- **Terminal/shell access** for building the MCP server

## Quick Install

### 1. Install Prerequisites

**Node.js 20+**

Check if you have Node.js 20 or higher:

```bash
node --version  # Should show v20.x.x or higher
```

If not installed or version is too old, see [Platform-Specific Instructions](#platform-specific-instructions) below.

**Git 2.30+**

Check if you have Git 2.30 or higher:

```bash
git --version  # Should show 2.30.x or higher
```

**Claude Code**

Download and install Claude Code from: https://claude.com/claude-code

### 2. Clone and Build devsolo

```bash
# Clone the repository
git clone https://github.com/slamb2k/devsolo.git
cd devsolo

# Install dependencies
npm install

# Build the project
npm run build

# Build the MCP server
npm run build:mcp
```

This creates the MCP server at `bin/devsolo-mcp`.

### 3. Configure Claude Code MCP Server

Add devsolo to your Claude Code MCP configuration file:

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

**Important**: Replace `/absolute/path/to/devsolo` with the actual absolute path to your devsolo installation.

**Example**:

```json
{
  "mcpServers": {
    "devsolo": {
      "command": "node",
      "args": ["/home/yourname/projects/devsolo/bin/devsolo-mcp"],
      "cwd": "${workspaceFolder}"
    }
  }
}
```

### 4. Restart Claude Code

Restart Claude Code to load the devsolo MCP server.

### 5. Verify Installation

In Claude Code, navigate to any project directory and ask:

```
Show me the devsolo status
```

You should see either:
- "devsolo is not initialized" (normal for first time)
- Current workflow status (if already initialized)

If you see an error about devsolo not being available, see [Troubleshooting](#troubleshooting) below.

### 6. Initialize in Your Project

In Claude Code, in your project directory:

```
Initialize devsolo in this project
```

Or use the MCP tool directly:

```
Use devsolo_init to set up devsolo
```

This creates a `.devsolo` directory in your project with configuration and session storage.

### 7. Configure GitHub Authentication

**Option A: GitHub CLI** (Recommended for local development)

```bash
# Install GitHub CLI if not already installed
# See: https://cli.github.com/

# Authenticate
gh auth login
```

Follow the prompts to authenticate with GitHub.

**Option B: Personal Access Token** (For headless/automation)

1. Create a token at: https://github.com/settings/tokens
2. Required scopes: `repo`, `workflow`
3. Set the token as an environment variable:

```bash
export GITHUB_TOKEN=ghp_your_token_here

# Add to shell profile for persistence
echo 'export GITHUB_TOKEN=ghp_your_token_here' >> ~/.bashrc  # or ~/.zshrc
```

## Platform-Specific Instructions

### macOS

#### Install Node.js

**Using Homebrew** (Recommended):

```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js 20
brew install node@20

# Link Node.js 20
brew link node@20
```

**Using nvm** (Recommended for managing multiple Node versions):

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload shell
source ~/.zshrc  # or ~/.bash_profile

# Install Node.js 20
nvm install 20
nvm use 20
nvm alias default 20
```

#### Install Git

```bash
# Using Homebrew
brew install git
```

Or download from: https://git-scm.com/download/mac

#### Install GitHub CLI

```bash
brew install gh
gh auth login
```

### Linux

#### Ubuntu/Debian

**Install Node.js 20**:

```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js
sudo apt-get install -y nodejs

# Verify installation
node --version
```

**Install Git**:

```bash
sudo apt-get update
sudo apt-get install -y git
```

**Install GitHub CLI**:

```bash
# Add GitHub CLI repository
type -p curl >/dev/null || sudo apt install curl -y
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
sudo chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null

# Install
sudo apt update
sudo apt install gh -y

# Authenticate
gh auth login
```

#### Fedora/RHEL/CentOS

**Install Node.js 20**:

```bash
# Enable Node.js 20 module
sudo dnf module install nodejs:20

# Or using nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
```

**Install Git**:

```bash
sudo dnf install git
```

**Install GitHub CLI**:

```bash
sudo dnf install gh
gh auth login
```

#### Arch Linux

**Install Node.js**:

```bash
sudo pacman -S nodejs npm
```

**Install Git**:

```bash
sudo pacman -S git
```

**Install GitHub CLI**:

```bash
sudo pacman -S github-cli
gh auth login
```

### Windows

devsolo is best used on Windows via WSL2 (Windows Subsystem for Linux).

#### Install WSL2

1. Open PowerShell as Administrator
2. Run:

```powershell
wsl --install
```

3. Restart your computer
4. Follow the Ubuntu setup prompts

#### Install Dependencies in WSL2

Once in WSL2, follow the [Ubuntu/Debian](#ubuntudebian) instructions above.

#### Install Claude Code

Download and install Claude Code for Windows from: https://claude.com/claude-code

Configure the MCP server in WSL2 following the standard instructions.

## Advanced Installation Options

### Using Node Version Manager (nvm)

For managing multiple Node.js versions:

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload shell configuration
source ~/.bashrc  # or ~/.zshrc

# Install Node.js 20
nvm install 20

# Set as default
nvm alias default 20

# Verify
node --version  # Should show v20.x.x
```

### Building from Specific Branch/Tag

```bash
# Clone specific tag
git clone --branch v2.0.0 https://github.com/slamb2k/devsolo.git
cd devsolo

# Or clone and checkout specific branch
git clone https://github.com/slamb2k/devsolo.git
cd devsolo
git checkout feature/my-feature

# Then build normally
npm install
npm run build
npm run build:mcp
```

### Installing in Custom Location

```bash
# Clone to custom location
git clone https://github.com/slamb2k/devsolo.git /opt/devsolo
cd /opt/devsolo

# Build
npm install
npm run build
npm run build:mcp

# Update Claude Code config with custom path
# In claude_desktop_config.json:
{
  "mcpServers": {
    "devsolo": {
      "command": "node",
      "args": ["/opt/devsolo/bin/devsolo-mcp"],
      "cwd": "${workspaceFolder}"
    }
  }
}
```

## Troubleshooting

### MCP Server Not Found

**Problem**: Claude Code can't find the devsolo MCP server

**Solutions**:

1. **Verify path is absolute**:
   ```bash
   # Get absolute path
   cd /path/to/devsolo
   pwd  # Copy this absolute path
   ```

2. **Check file exists**:
   ```bash
   ls -l /path/to/devsolo/bin/devsolo-mcp
   ```

3. **Make executable**:
   ```bash
   chmod +x /path/to/devsolo/bin/devsolo-mcp
   ```

4. **Verify Node.js path**:
   ```bash
   which node  # Should show /usr/bin/node or similar
   ```

5. **Restart Claude Code** after making config changes

### Node.js Version Too Old

**Problem**: `npm install` fails with version error

**Solution**:

```bash
# Check current version
node --version

# Install Node.js 20 using nvm
nvm install 20
nvm use 20
nvm alias default 20
```

### Build Errors

**Problem**: `npm run build` fails

**Common Solutions**:

1. **Clear cache and rebuild**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

2. **Check Node.js version**:
   ```bash
   node --version  # Must be 20+
   ```

3. **Check for TypeScript errors**:
   ```bash
   npm run build  # Read error messages carefully
   ```

### Permission Errors

**Problem**: Permission denied during installation

**Solutions**:

```bash
# Option 1: Install in user directory
cd ~
git clone https://github.com/slamb2k/devsolo.git
cd devsolo

# Option 2: Fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH

# Add to shell profile
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
```

### GitHub Authentication Fails

**Problem**: "GitHub authentication failed" when using devsolo

**Solutions**:

1. **Use GitHub CLI**:
   ```bash
   gh auth login
   gh auth status  # Verify authentication
   ```

2. **Use Personal Access Token**:
   ```bash
   # Create token at https://github.com/settings/tokens
   # Required scopes: repo, workflow
   export GITHUB_TOKEN=ghp_your_token_here

   # Verify token works
   curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user
   ```

3. **Check token expiration**:
   - Tokens may expire
   - Create a new token if needed
   - Update environment variable

### Claude Code Not Loading MCP Server

**Problem**: devsolo tools not available in Claude Code

**Solutions**:

1. **Check Claude Code logs**:
   - Look for MCP server startup messages
   - Check for error messages

2. **Verify JSON configuration**:
   ```bash
   # Validate JSON syntax
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | python3 -m json.tool
   ```

3. **Test MCP server manually**:
   ```bash
   cd /path/to/devsolo
   node bin/devsolo-mcp
   # Should start without errors
   ```

4. **Restart Claude Code completely**:
   - Quit Claude Code (not just close window)
   - Restart Claude Code
   - Wait for MCP server to initialize

### devsolo Not Initialized

**Problem**: "devsolo is not initialized in this project"

**Solution**:

In Claude Code:
```
Initialize devsolo in this project
```

This is normal for first-time use in a project.

## Verification Checklist

After installation, verify everything works:

- [ ] Node.js 20+ installed: `node --version`
- [ ] Git 2.30+ installed: `git --version`
- [ ] Claude Code installed and running
- [ ] devsolo cloned and built successfully
- [ ] MCP server configured in `claude_desktop_config.json`
- [ ] Claude Code restarted
- [ ] devsolo status check works in Claude Code
- [ ] GitHub authentication configured (`gh auth login` or `GITHUB_TOKEN`)
- [ ] devsolo initialized in a test project

## Next Steps

After successful installation:

1. **Read the Quick Start**: [Quick Start Guide](quickstart.md)
2. **Initialize a project**: Ask Claude to "Initialize devsolo in this project"
3. **Try your first workflow**: See [Usage Guide](usage.md)
4. **Explore MCP tools**: [MCP Tools Reference](mcp-tools-reference.md)
5. **Migrating from v1.x?**: [Migration Guide](migration-from-cli.md)

## Updating devsolo

To update to the latest version:

```bash
cd /path/to/devsolo

# Pull latest changes
git pull origin main

# Rebuild
npm install
npm run build
npm run build:mcp

# Restart Claude Code
```

## Uninstalling

To remove devsolo:

```bash
# 1. Remove from Claude Code config
# Edit claude_desktop_config.json and remove the "devsolo" entry

# 2. Delete devsolo directory
rm -rf /path/to/devsolo

# 3. Remove project configurations (optional)
# In each project that used devsolo:
cd /path/to/your/project
rm -rf .devsolo

# 4. Restart Claude Code
```

## Getting Help

If you encounter installation issues:

- **Troubleshooting Guide**: [troubleshooting.md](troubleshooting.md)
- **GitHub Issues**: [Report a bug](https://github.com/slamb2k/devsolo/issues)
- **Discussions**: [Ask questions](https://github.com/slamb2k/devsolo/discussions)
- **Ask Claude**: "Help me troubleshoot devsolo installation"

---

**Installation complete?** Head to the [Quick Start Guide](quickstart.md) to start using devsolo! 🚀
