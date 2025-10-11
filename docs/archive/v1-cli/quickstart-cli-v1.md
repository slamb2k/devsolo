# devsolo Quick Start Guide

Get up and running with devsolo in under 5 minutes.

## Prerequisites

- Node.js 18+ and npm
- Git 2.30+
- A GitHub account
- (Optional) Claude Code installed

## Installation

### 1. Install devsolo Globally

```bash
npm install -g @devsolo/cli
```

### 2. Verify Installation

```bash
devsolo --version
```

## Setup Your Project

### 1. Navigate to Your Project

```bash
cd /path/to/your/project
```

### 2. Initialize devsolo

```bash
devsolo init
```

This creates a `.devsolo` directory and sets up everything you need.

### 3. Configure GitHub Authentication

**Option A: Use GitHub CLI** (Recommended for local development)
```bash
gh auth login
```

**Option B: Set Environment Variable** (For CI/CD)
```bash
export GITHUB_TOKEN=ghp_your_token_here
```

That's it! devsolo is ready to use.

## Your First Workflow

### Step 1: Launch a New Feature

```bash
devsolo launch
```

This creates a new feature branch and starts tracking your workflow.

### Step 2: Make Your Changes

Work on your code as you normally would:

```bash
# Edit files
vim src/my-feature.ts

# Check status anytime
devsolo status
```

### Step 3: Ship Your Feature

```bash
devsolo ship
```

This single command:
- ✅ Commits your changes
- ✅ Pushes to GitHub
- ✅ Creates a pull request
- ✅ Waits for CI checks to pass
- ✅ Auto-merges the PR
- ✅ Cleans up branches
- ✅ Returns you to main

**Done!** Your feature is live and you're ready for the next one.

## Using with Claude Code

If you have Claude Code installed, devsolo integrates seamlessly.

### 1. Initialize via Claude Code

In Claude Code, run:
```
/devsolo:init
```

### 2. Enable the Status Line

```
/devsolo:status-line enable
```

Now you'll see your workflow status at all times:
```
[devsolo] 📝 0c2a20a7 | feature/my-feature | BRANCH_READY
```

### 3. Use Slash Commands

All devsolo commands work directly in Claude Code:

```
/devsolo:launch          # Start new feature
/devsolo:status          # Check workflow status
/devsolo:ship            # Ship your feature
```

Claude can now help you manage your Git workflow!

## Common Workflows

### Quick Bug Fix

```bash
# Start hotfix
devsolo launch --branch hotfix/critical-bug

# Fix the bug
vim src/buggy-file.ts

# Ship it
devsolo ship
```

### Multiple Features in Parallel

```bash
# Start feature A
devsolo launch --branch feature/user-auth

# Work on it...

# Switch to feature B
devsolo launch --branch feature/dashboard

# Work on it...

# Switch back to feature A
devsolo swap feature/user-auth

# Ship feature A
devsolo ship

# Switch to feature B
devsolo swap feature/dashboard

# Ship feature B
devsolo ship
```

### Cancel a Feature

```bash
# Abort current feature
devsolo abort

# Optionally delete the branch
devsolo abort --delete-branch
```

## Key Commands Reference

| Command | What It Does |
|---------|--------------|
| `devsolo init` | Set up devsolo in your project |
| `devsolo launch` | Start a new feature workflow |
| `devsolo ship` | Complete and merge your feature |
| `devsolo status` | See current workflow status |
| `devsolo sessions` | List all active workflows |
| `devsolo swap <branch>` | Switch between workflows |
| `devsolo abort` | Cancel current workflow |
| `devsolo cleanup` | Clean up merged branches and old sessions |

## Tips for Success

1. **Always run `devsolo launch`** before starting new work
2. **Use `devsolo status`** to check where you are
3. **Run `devsolo cleanup`** periodically to keep things tidy
4. **Enable the status line** if using Claude Code
5. **Let `devsolo ship` do the work** - it handles everything

## Troubleshooting

### Command not found

```bash
# Add npm global bin to PATH
export PATH="$(npm bin -g):$PATH"

# Add to ~/.bashrc or ~/.zshrc for persistence
```

### Permission errors during npm install

```bash
# Use npm's directory instead of system-wide
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
npm install -g @devsolo/cli
```

### GitHub authentication fails

```bash
# Use GitHub CLI (easiest)
gh auth login

# Or set token explicitly
export GITHUB_TOKEN=ghp_your_token
```

### Session seems stuck

```bash
# Check session details
devsolo sessions --verbose

# Abort and restart
devsolo abort
devsolo launch
```

## Next Steps

- Read the [full documentation](README.md) for advanced features
- Check out the [troubleshooting guide](docs/troubleshooting.md)
- Learn about [configuration options](docs/configuration.md)
- Explore [usage examples](USAGE.md)

## Getting Help

- **Documentation**: [GitHub Repository](https://github.com/slamb2k/devsolo)
- **Issues**: [Report a bug](https://github.com/slamb2k/devsolo/issues)
- **Discussions**: [Ask questions](https://github.com/slamb2k/devsolo/discussions)

---

**You're all set!** Start shipping features with `devsolo launch` → *make changes* → `devsolo ship` 🚀
