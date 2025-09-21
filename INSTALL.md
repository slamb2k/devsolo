# Installation Guide

This guide covers various installation methods for han-solo.

## Quick Install

### npm (Recommended)

```bash
npm install -g @hansolo/cli
```

### Yarn

```bash
yarn global add @hansolo/cli
```

### pnpm

```bash
pnpm add -g @hansolo/cli
```

## From Source

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- Git >= 2.30.0

### Build and Install

```bash
# Clone the repository
git clone https://github.com/slamb2k/hansolo.git
cd hansolo

# Install dependencies
npm install

# Build the project
npm run build

# Link globally
npm link

# Verify installation
hansolo --version
```

## Docker Installation

### Using Docker Hub

```bash
docker pull slamb2k/hansolo:latest
docker run -it --rm -v $(pwd):/workspace slamb2k/hansolo
```

### Building Locally

```bash
# Clone the repository
git clone https://github.com/slamb2k/hansolo.git
cd hansolo

# Build Docker image
docker build -t hansolo:latest .

# Run container
docker run -it --rm -v $(pwd):/workspace hansolo:latest
```

### Docker Compose

```bash
# Using docker-compose
docker-compose run hansolo

# Or with specific command
docker-compose run hansolo status
```

## Platform-Specific Instructions

### macOS

#### Homebrew (Coming Soon)

```bash
brew tap slamb2k/hansolo
brew install hansolo
```

#### Manual Installation

1. Install Node.js using Homebrew:
   ```bash
   brew install node
   ```

2. Install han-solo globally:
   ```bash
   npm install -g @hansolo/cli
   ```

### Linux

#### Ubuntu/Debian

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install han-solo
npm install -g @hansolo/cli
```

#### Fedora/RHEL/CentOS

```bash
# Install Node.js
sudo dnf module install nodejs:20

# Install han-solo
npm install -g @hansolo/cli
```

#### Arch Linux

```bash
# Install Node.js
sudo pacman -S nodejs npm

# Install han-solo
npm install -g @hansolo/cli
```

### Windows

#### Using Node.js

1. Download and install Node.js from [nodejs.org](https://nodejs.org/)
2. Open PowerShell or Command Prompt
3. Install han-solo:
   ```powershell
   npm install -g @hansolo/cli
   ```

#### Using WSL2

1. Install WSL2 following [Microsoft's guide](https://docs.microsoft.com/en-us/windows/wsl/install)
2. Follow Linux installation instructions above

## Shell Completions

### Bash

```bash
# Add to ~/.bashrc
source /path/to/hansolo/completions/hansolo.bash

# Or copy to system completions
sudo cp completions/hansolo.bash /etc/bash_completion.d/
```

### ZSH

```bash
# Add to ~/.zshrc
fpath=(/path/to/hansolo/completions $fpath)
autoload -U compinit && compinit

# Or copy to system completions
cp completions/hansolo.zsh /usr/local/share/zsh/site-functions/_hansolo
```

### Fish

```fish
# Copy completion file
cp completions/hansolo.fish ~/.config/fish/completions/
```

## Git Hooks Installation

After installing han-solo, set up Git hooks in your project:

```bash
# Navigate to your project
cd /path/to/your/project

# Install hooks
hansolo init

# Or manually install hooks
sh /path/to/hansolo/hooks/install.sh
```

## Man Page Installation

```bash
# Copy man page to system location
sudo cp man/hansolo.1 /usr/local/share/man/man1/

# Update man database
sudo mandb

# View man page
man hansolo
```

## Post-Installation Setup

### 1. Initialize in Your Project

```bash
cd /path/to/your/project
hansolo init
```

### 2. Configure Git User

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### 3. Set Up GitHub Token (Optional)

```bash
export GITHUB_TOKEN="your_personal_access_token"
# Add to ~/.bashrc or ~/.zshrc for persistence
```

### 4. Create Configuration File (Optional)

```bash
# Copy example configuration
cp .hansolo.example.yaml .hansolo.yaml
# Edit to customize
```

## Verification

Verify your installation:

```bash
# Check version
hansolo --version

# Run demo
hansolo demo

# Check status
hansolo status
```

## Troubleshooting

### Permission Denied

If you get permission errors during global installation:

```bash
# Option 1: Use npx
npx @hansolo/cli

# Option 2: Change npm prefix
npm config set prefix ~/.npm
export PATH="$HOME/.npm/bin:$PATH"
npm install -g @hansolo/cli

# Option 3: Use sudo (not recommended)
sudo npm install -g @hansolo/cli
```

### Command Not Found

If `hansolo` command is not found:

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
npm uninstall -g @hansolo/cli
```

### Docker

```bash
docker rmi slamb2k/hansolo
```

### Manual Cleanup

```bash
# Remove configuration
rm -rf ~/.hansolo
rm -f .hansolo.yaml

# Remove Git hooks
rm -f .git/hooks/pre-commit
rm -f .git/hooks/pre-push
rm -f .git/hooks/commit-msg
```

## Getting Help

- Documentation: [GitHub Wiki](https://github.com/slamb2k/hansolo/wiki)
- Issues: [GitHub Issues](https://github.com/slamb2k/hansolo/issues)
- Discord: [Join our Discord](https://discord.gg/hansolo)
- Email: support@hansolo.dev