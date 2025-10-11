# Installation Guide

This guide covers various installation methods for devsolo.

## Quick Install

### npm (Recommended)

```bash
npm install -g @devsolo/cli
```

### Yarn

```bash
yarn global add @devsolo/cli
```

### pnpm

```bash
pnpm add -g @devsolo/cli
```

## From Source

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- Git >= 2.30.0

### Build and Install

```bash
# Clone the repository
git clone https://github.com/slamb2k/devsolo.git
cd devsolo

# Install dependencies
npm install

# Build the project
npm run build

# Link globally
npm link

# Verify installation
devsolo --version
```

## Docker Installation

### Using Docker Hub

```bash
docker pull slamb2k/devsolo:latest
docker run -it --rm -v $(pwd):/workspace slamb2k/devsolo
```

### Building Locally

```bash
# Clone the repository
git clone https://github.com/slamb2k/devsolo.git
cd devsolo

# Build Docker image
docker build -t devsolo:latest .

# Run container
docker run -it --rm -v $(pwd):/workspace devsolo:latest
```

### Docker Compose

```bash
# Using docker-compose
docker-compose run devsolo

# Or with specific command
docker-compose run devsolo status
```

## Platform-Specific Instructions

### macOS

#### Homebrew (Coming Soon)

```bash
brew tap slamb2k/devsolo
brew install devsolo
```

#### Manual Installation

1. Install Node.js using Homebrew:
   ```bash
   brew install node
   ```

2. Install devsolo globally:
   ```bash
   npm install -g @devsolo/cli
   ```

### Linux

#### Ubuntu/Debian

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install devsolo
npm install -g @devsolo/cli
```

#### Fedora/RHEL/CentOS

```bash
# Install Node.js
sudo dnf module install nodejs:20

# Install devsolo
npm install -g @devsolo/cli
```

#### Arch Linux

```bash
# Install Node.js
sudo pacman -S nodejs npm

# Install devsolo
npm install -g @devsolo/cli
```

### Windows

#### Using Node.js

1. Download and install Node.js from [nodejs.org](https://nodejs.org/)
2. Open PowerShell or Command Prompt
3. Install devsolo:
   ```powershell
   npm install -g @devsolo/cli
   ```

#### Using WSL2

1. Install WSL2 following [Microsoft's guide](https://docs.microsoft.com/en-us/windows/wsl/install)
2. Follow Linux installation instructions above

## Shell Completions

### Bash

```bash
# Add to ~/.bashrc
source /path/to/devsolo/completions/devsolo.bash

# Or copy to system completions
sudo cp completions/devsolo.bash /etc/bash_completion.d/
```

### ZSH

```bash
# Add to ~/.zshrc
fpath=(/path/to/devsolo/completions $fpath)
autoload -U compinit && compinit

# Or copy to system completions
cp completions/devsolo.zsh /usr/local/share/zsh/site-functions/_devsolo
```

### Fish

```fish
# Copy completion file
cp completions/devsolo.fish ~/.config/fish/completions/
```

## Git Hooks Installation

After installing devsolo, set up Git hooks in your project:

```bash
# Navigate to your project
cd /path/to/your/project

# Install hooks
devsolo init

# Or manually install hooks
sh /path/to/devsolo/hooks/install.sh
```

## Man Page Installation

```bash
# Copy man page to system location
sudo cp man/devsolo.1 /usr/local/share/man/man1/

# Update man database
sudo mandb

# View man page
man devsolo
```

## Post-Installation Setup

### 1. Initialize in Your Project

```bash
cd /path/to/your/project
devsolo init
```

This will:
- Create `.devsolo` directory with configuration
- Install Git hooks (pre-commit, pre-push)
- Set up session storage
- Install status line script for Claude Code
- Configure MCP server (if Claude Code is detected)

### 2. Configure Git User

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### 3. Set Up GitHub Authentication

**Option A: GitHub CLI (Recommended for local development)**
```bash
# Install GitHub CLI
brew install gh  # macOS
# or
sudo apt install gh  # Linux

# Authenticate
gh auth login
```

**Option B: Personal Access Token (For CI/CD)**
```bash
# Create token at: https://github.com/settings/tokens
# Required scopes: repo, workflow

export GITHUB_TOKEN="ghp_your_token_here"

# Add to ~/.bashrc or ~/.zshrc for persistence
echo 'export GITHUB_TOKEN="ghp_your_token_here"' >> ~/.bashrc
```

### 4. Claude Code Integration (Optional but Recommended)

If you have Claude Code installed, devsolo integrates seamlessly.

**Automatic Setup (via devsolo init):**
```bash
devsolo init
# Automatically detects Claude Code and configures MCP server
```

**Manual MCP Configuration:**
```bash
# For project-level (team shares configuration)
devsolo init --scope project

# For user-level (just you)
devsolo init --scope user
```

**Enable Status Line:**
```bash
# After initialization, enable the status line in Claude Code
# This shows workflow status directly in Claude Code's interface
/devsolo:status-line enable
```

**Verify Integration:**
```bash
# In Claude Code, try:
/devsolo:status

# Or from terminal:
devsolo status
```

### 5. Create Configuration File (Optional)

```bash
# Copy example configuration
cp .devsolo/config.yaml .devsolo/config.custom.yaml
# Edit to customize
vim .devsolo/config.custom.yaml
```

## Verification

Verify your installation:

```bash
# Check version
devsolo --version

# Run demo
devsolo demo

# Check status
devsolo status
```

## Troubleshooting

### Permission Denied

If you get permission errors during global installation:

```bash
# Option 1: Use npx
npx @devsolo/cli

# Option 2: Change npm prefix
npm config set prefix ~/.npm
export PATH="$HOME/.npm/bin:$PATH"
npm install -g @devsolo/cli

# Option 3: Use sudo (not recommended)
sudo npm install -g @devsolo/cli
```

### Command Not Found

If `devsolo` command is not found:

1. Check npm global bin directory:
   ```bash
   npm config get prefix
   ```

2. Add to PATH:
   ```bash
   export PATH="$(npm config get prefix)/bin:$PATH"
   ```

3. Add to shell profile (~/.bashrc, ~/.zshrc, etc.)

### Node Version Issues

If you encounter Node.js version errors:

```bash
# Install Node Version Manager (nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install and use Node.js 20
nvm install 20
nvm use 20
```

## Uninstallation

### npm

```bash
npm uninstall -g @devsolo/cli
```

### Docker

```bash
docker rmi slamb2k/devsolo
```

### Manual Cleanup

```bash
# Remove configuration
rm -rf ~/.devsolo
rm -f .devsolo.yaml

# Remove Git hooks
rm -f .git/hooks/pre-commit
rm -f .git/hooks/pre-push
rm -f .git/hooks/commit-msg
```

## Getting Help

- Documentation: [GitHub Wiki](https://github.com/slamb2k/devsolo/wiki)
- Issues: [GitHub Issues](https://github.com/slamb2k/devsolo/issues)
- Discord: [Join our Discord](https://discord.gg/devsolo)
- Email: support@devsolo.dev