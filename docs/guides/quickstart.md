# han-solo Quick Start Guide

Get up and running with han-solo in under 5 minutes.

## Prerequisites

- Node.js 18+ and npm
- Git 2.30+
- A GitHub account
- (Optional) Claude Code installed

## Installation

### 1. Install han-solo Globally

```bash
npm install -g @hansolo/cli
```

### 2. Verify Installation

```bash
hansolo --version
```

## Setup Your Project

### 1. Navigate to Your Project

```bash
cd /path/to/your/project
```

### 2. Initialize han-solo

```bash
hansolo init
```

This creates a `.hansolo` directory and sets up everything you need.

### 3. Configure GitHub Authentication

**Option A: Use GitHub CLI** (Recommended for local development)
```bash
gh auth login
```

**Option B: Set Environment Variable** (For CI/CD)
```bash
export GITHUB_TOKEN=ghp_your_token_here
```

That's it! han-solo is ready to use.

## Your First Workflow

### Step 1: Launch a New Feature

```bash
hansolo launch
```

This creates a new feature branch and starts tracking your workflow.

### Step 2: Make Your Changes

Work on your code as you normally would:

```bash
# Edit files
vim src/my-feature.ts

# Check status anytime
hansolo status
```

### Step 3: Ship Your Feature

```bash
hansolo ship
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

If you have Claude Code installed, han-solo integrates seamlessly.

### 1. Initialize via Claude Code

In Claude Code, run:
```
/hansolo:init
```

### 2. Enable the Status Line

```
/hansolo:status-line enable
```

Now you'll see your workflow status at all times:
```
[han-solo] ✏️ 0c2a20a7 | feature/my-feature | BRANCH_READY
```

### 3. Use Slash Commands

All han-solo commands work directly in Claude Code:

```
/hansolo:launch          # Start new feature
/hansolo:status          # Check workflow status
/hansolo:ship            # Ship your feature
```

Claude can now help you manage your Git workflow!

## Common Workflows

### Quick Bug Fix

```bash
# Start hotfix
hansolo launch --branch hotfix/critical-bug

# Fix the bug
vim src/buggy-file.ts

# Ship it
hansolo ship
```

### Multiple Features in Parallel

```bash
# Start feature A
hansolo launch --branch feature/user-auth

# Work on it...

# Switch to feature B
hansolo launch --branch feature/dashboard

# Work on it...

# Switch back to feature A
hansolo swap feature/user-auth

# Ship feature A
hansolo ship

# Switch to feature B
hansolo swap feature/dashboard

# Ship feature B
hansolo ship
```

### Cancel a Feature

```bash
# Abort current feature
hansolo abort

# Optionally delete the branch
hansolo abort --delete-branch
```

## Key Commands Reference

| Command | What It Does |
|---------|--------------|
| `hansolo init` | Set up han-solo in your project |
| `hansolo launch` | Start a new feature workflow |
| `hansolo ship` | Complete and merge your feature |
| `hansolo status` | See current workflow status |
| `hansolo sessions` | List all active workflows |
| `hansolo swap <branch>` | Switch between workflows |
| `hansolo abort` | Cancel current workflow |
| `hansolo cleanup` | Clean up merged branches and old sessions |

## Tips for Success

1. **Always run `hansolo launch`** before starting new work
2. **Use `hansolo status`** to check where you are
3. **Run `hansolo cleanup`** periodically to keep things tidy
4. **Enable the status line** if using Claude Code
5. **Let `hansolo ship` do the work** - it handles everything

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
npm install -g @hansolo/cli
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
hansolo sessions --verbose

# Abort and restart
hansolo abort
hansolo launch
```

## Next Steps

- Read the [full documentation](README.md) for advanced features
- Check out the [troubleshooting guide](docs/troubleshooting.md)
- Learn about [configuration options](docs/configuration.md)
- Explore [usage examples](USAGE.md)

## Getting Help

- **Documentation**: [GitHub Repository](https://github.com/slamb2k/hansolo)
- **Issues**: [Report a bug](https://github.com/slamb2k/hansolo/issues)
- **Discussions**: [Ask questions](https://github.com/slamb2k/hansolo/discussions)

---

**You're all set!** Start shipping features with `hansolo launch` → *make changes* → `hansolo ship` 🚀
