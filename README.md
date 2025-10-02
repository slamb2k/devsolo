# han-solo 🚀

> Git workflow automation tool that enforces linear history and prevents merge conflicts

han-solo is a powerful CLI tool designed to streamline Git workflows while maintaining clean, linear commit history. It integrates with Claude Code through MCP (Model Context Protocol) and GitHub API for seamless PR management.

## Features

- **🚀 One-Command Workflow**: Ship entire feature in a single command (v2)
- **🛡️ Pre/Post-Flight Checks**: Comprehensive validation before and after every operation
- **🚫 Branch Reuse Prevention**: Blocks reusing branch names after merge
- **✓ PR Conflict Detection**: Ensures single PR per branch lifecycle
- **📊 ASCII Art Banners**: Professional visual feedback for all commands
- **📈 Linear History Enforcement**: Ensures all merges result in clean, linear commit history
- **🔄 Session Management**: Track multiple concurrent workflows with isolated sessions
- **⚙️ State Machine Control**: Deterministic workflow states prevent invalid operations
- **🔗 GitHub Integration**: Automatic PR creation, CI monitoring, and merging
- **🤖 MCP Server**: Native Claude Code integration for AI-assisted workflows
- **🎨 Rich Terminal UI**: Progress indicators, status displays, and clear reporting
- **🔒 Safety First**: Built-in safeguards prevent accidental commits to main

## Installation

### Global Installation (Recommended)
```bash
npm install -g @hansolo/cli
```

### Project-level Installation
```bash
npm install --save-dev @hansolo/cli
```

## Quick Start

### 1. Initialize han-solo in your project
```bash
hansolo init
```

This creates a `.hansolo` directory with configuration and session storage.

### 2. Start a new feature workflow
```bash
hansolo launch "my-awesome-feature"
```

### 3. Make your changes
Work on your feature as normal. han-solo tracks your session automatically.

### 4. Ship your changes (One Command! 🚀)
```bash
hansolo ship
```

That's it! This single command:
- ✅ Commits your changes
- ✅ Pushes to remote
- ✅ Creates or updates PR
- ✅ Waits for CI checks
- ✅ Auto-merges when ready
- ✅ Syncs main branch
- ✅ Deletes feature branches
- ✅ Completes session

Ready for your next feature!

## Core Commands

### `hansolo init`
Initialize han-solo in your project. Creates configuration and installs Git hooks.

**Options:**
- `--scope [project|user]` - Installation scope (default: project)
- `--force` - Force reinitialization

### `hansolo launch`
Start a new feature workflow with automatic branch creation.

**Options:**
- `--branch <name>` - Specify branch name (auto-generated if omitted)
- `--description <desc>` - Add description for the feature
- `--force` - Launch even with uncommitted changes

### `hansolo ship`
**NEW IN V2:** Complete the entire workflow automatically in a single command!

Ship now handles everything: commit → push → PR → CI wait → merge → cleanup

**What it does:**
1. Commits any uncommitted changes (runs pre-commit hooks)
2. Pushes to remote (runs pre-push hooks)
3. Creates or updates GitHub PR
4. Waits for CI checks to pass
5. Auto-merges PR with squash
6. Syncs local main branch
7. Deletes feature branches (local & remote)
8. Marks session as complete

**Options:**
- `--message <msg>` - Custom commit message
- `--force` - Override safety checks
- `--yes` - Skip confirmations (for automation)

**Example:**
```bash
# Ship everything at once
hansolo ship

# With custom commit message
hansolo ship --message "feat: add user authentication"

# Skip confirmations for CI/CD
hansolo ship --yes
```

### `hansolo sessions`
List and manage active workflow sessions.

**Options:**
- `--all` - Show all sessions including completed
- `--verbose` - Detailed session information
- `--cleanup` - Remove expired sessions

### `hansolo swap`
Switch between active workflow sessions.

**Usage:**
```bash
hansolo swap [branch-name]
```

**Options:**
- `--force` - Force swap with uncommitted changes
- `--stash` - Stash changes before swapping

### `hansolo abort`
Cancel an active workflow session.

**Options:**
- `--branch <name>` - Specify branch to abort (current if omitted)
- `--delete-branch` - Delete the branch after aborting
- `--force` - Force abort
- `--yes` - Skip confirmation
- `--all` - Abort all active workflows

### `hansolo status`
Show current workflow status and session information.

### `hansolo cleanup`
Clean up completed sessions, merged branches, and sync main with remote.

**Critical:** Run this after PRs are merged on GitHub to ensure local main is synced and feature branches are removed.

**Usage:**
```bash
hansolo cleanup
```

**Options:**
- `--dry-run` - Show what would be cleaned up without making changes
- `--force` / `-f` - Skip confirmation prompts
- `--all` - Clean up everything including old audit logs
- `--sessions-only` - Only clean up sessions, keep branches
- `--branches-only` - Only clean up branches, keep sessions
- `--days <N>` - Clean up sessions completed N+ days ago (default: 30)
- `--no-sync` - Skip syncing main branch with remote

**What it does:**
1. **Syncs main branch**: Pulls latest from remote (includes squashed PR commits)
2. **Removes merged branches**: Deletes local branches that have been merged
3. **Archives sessions**: Cleans up completed/expired workflow sessions
4. **Removes stale locks**: Clears lock files older than 24 hours
5. **Cleans audit logs**: (with `--all`) Removes old audit entries

**When to run:**
- After merging a PR on GitHub
- Periodically to keep repository tidy
- Before starting new work to ensure clean state

## V2 Features (NEW! 🎉)

### Pre-Flight and Post-Flight Checks

Every command now includes comprehensive validation:

**Pre-Flight Checks** (before execution):
```
🔍 Pre-Flight Checks (5/5 passed)
  ✓ On main/master branch: main
  ✓ Working directory clean
  ✓ Main up to date with origin
  ✓ No existing session
  ✓ Branch name available: feature/my-feature

✓ All checks passed (5/5)
```

**Post-Flight Verifications** (after execution):
```
✅ Post-Flight Verification (5/5 passed)
  ✓ Session created: ID: abc12345...
  ✓ Feature branch created: feature/my-feature
  ✓ Branch checked out: feature/my-feature
  ✓ Session state: BRANCH_READY
  ✓ No uncommitted changes
```

**Benefits:**
- Catch issues before making changes
- Confirm expected state after operations
- Clear visual feedback (✓/⚠/✗)
- Actionable suggestions for failures

See [PRE-FLIGHT-CHECKS.md](./docs/PRE-FLIGHT-CHECKS.md) for complete documentation.

### Branch Reuse Prevention

Han-solo now prevents branch name reuse after merge:

| Scenario | Action |
|----------|--------|
| Branch merged & deleted | **BLOCKED** - Name retired |
| Branch merged, deleted, recreated | **BLOCKED** - Critical error |
| Branch aborted (never merged) | **ALLOWED** - Safe to reuse |
| Adding commits after merge | **ALLOWED** - Creates new PR |

**Example:**
```bash
hansolo launch "add-auth"
# ... work, ship, merge ...

hansolo launch "add-auth"
# ✗ Branch name available: Previously used for PR #15
#   Branch names cannot be reused after merge
#   Suggestion: feature/add-auth-v2
```

### PR Conflict Detection

Enforces single PR per branch lifecycle:

| Scenario | Action |
|----------|--------|
| Multiple open PRs | **BLOCKED** - Manual fix needed |
| Single open PR | **UPDATES** existing PR |
| Previous PR merged | **CREATES** new PR |
| No PR exists | **CREATES** new PR |

### ASCII Art Banners

All commands now display professional banners:

```
  ╔═══════════════════════════════════════════╗
  ║        🚀  LAUNCHING WORKFLOW  🚀         ║
  ╚═══════════════════════════════════════════╝
```

Consistent branding across:
- 🚀 Launch
- 🚢 Ship
- 🧹 Cleanup
- ⛔ Abort
- 🔄 Swap
- 📊 Status
- 📋 Sessions

### Migration from V1

See [MIGRATION-V2.md](./docs/MIGRATION-V2.md) for complete migration guide.

**Key Changes:**
- `hansolo ship` now does everything automatically (no more flags)
- Pre/post-flight checks on all commands
- Better error messages with suggestions
- Consistent visual output

## Workflow States

han-solo uses a deterministic state machine to manage workflows:

```
INIT → BRANCH_READY → CHANGES_COMMITTED → PUSHED →
PR_CREATED → WAITING_APPROVAL → MERGED → COMPLETE
```

Each state has specific allowed transitions and validations to ensure workflow integrity.

## GitHub Integration

han-solo integrates with GitHub API for automated PR management.

### Setup

**Option 1: Use GitHub CLI (Recommended for local development)**
```bash
gh auth login
```

**Option 2: Set environment variable (For CI/CD)**
```bash
export GITHUB_TOKEN=your_github_token
# or
export GH_TOKEN=your_github_token
```

han-solo automatically detects and uses `gh` CLI authentication if available, so explicit token setup is often unnecessary for local development.

### Features
- Automatic PR creation with generated descriptions
- Review status tracking
- Check suite monitoring
- Squash merge support
- Automatic branch cleanup

## MCP Server (Claude Code Integration)

han-solo includes an MCP server for seamless Claude Code integration.

### Running the MCP Server
```bash
hansolo-mcp
```

### Available MCP Tools
- `hansolo_init` - Initialize han-solo
- `hansolo_launch` - Start new workflow
- `hansolo_sessions` - List sessions
- `hansolo_swap` - Switch sessions
- `hansolo_abort` - Cancel workflow
- `hansolo_ship` - Complete workflow
- `hansolo_status` - Show status

## Session Management

Sessions are stored in `.hansolo/sessions/` with automatic persistence:

- Each workflow creates a unique session ID
- Sessions track state history and transitions
- Automatic lock management prevents conflicts
- Sessions expire after 30 days of inactivity

## Configuration

Configuration is stored in `.hansolo/config.yaml`:

```yaml
initialized: true
scope: project
gitPlatform:
  type: github
  owner: your-org
  repo: your-repo
components:
  mpcServer: true
  statusLines: true
  gitHooks: true
preferences:
  defaultBranchPrefix: feature/
  autoCleanup: true
  confirmBeforePush: true
  colorOutput: true
  verboseLogging: false
```

## Architecture

han-solo follows a layered architecture:

```
┌─────────────────────────────────┐
│         Claude Code             │
│         (via MCP)               │
└─────────────────────────────────┘
                ↓
┌─────────────────────────────────┐
│       CLI Interface             │
│    (Commands & Options)         │
└─────────────────────────────────┘
                ↓
┌─────────────────────────────────┐
│     State Machine Layer         │
│  (Workflow Control & Rules)     │
└─────────────────────────────────┘
                ↓
┌─────────────────────────────────┐
│     Services Layer              │
│ (Git, GitHub, Sessions, Config) │
└─────────────────────────────────┘
                ↓
┌─────────────────────────────────┐
│    Persistence Layer            │
│  (File System & Git Repo)       │
└─────────────────────────────────┘
```

## Development

### Building from Source
```bash
# Clone the repository
git clone https://github.com/slamb2k/hansolo.git
cd hansolo

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test

# Run with coverage
npm run test:coverage
```

### Running Locally
```bash
# Link for local development
npm link

# Now use globally
hansolo init
```

## Testing

han-solo includes comprehensive tests for all components:

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## Documentation

- **[Installation Guide](INSTALL.md)** - Detailed installation instructions
- **[API Documentation](docs/API.md)** - Complete API reference
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute to han-solo
- **[Changelog](CHANGELOG.md)** - Version history and changes
- **[Examples](examples/)** - Usage examples and workflows
- **[Man Page](man/hansolo.1)** - Unix manual page

## Shell Completions

han-solo provides shell completions for enhanced CLI experience:

- **Bash**: `source completions/hansolo.bash`
- **ZSH**: `source completions/hansolo.zsh`
- **Fish**: Copy to `~/.config/fish/completions/`

## Git Hooks

Install Git hooks to enforce han-solo workflows:

```bash
sh hooks/install.sh
```

Available hooks:
- **pre-commit**: Prevents direct commits to protected branches
- **pre-push**: Validates workflow state before pushing
- **commit-msg**: Enforces conventional commit messages

## Docker Support

Run han-solo in a container:

```bash
# Build image
docker build -t hansolo .

# Run container
docker run -it --rm -v $(pwd):/workspace hansolo

# Using docker-compose
docker-compose run hansolo
```

## Contributing

Contributions are welcome! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`hansolo launch --branch feature/your-feature`)
3. Make your changes
4. Add tests for new functionality
5. Run tests and linting
6. Ship your changes (`hansolo ship`)
7. Create a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details

## Support

- **Issues**: [GitHub Issues](https://github.com/slamb2k/hansolo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/slamb2k/hansolo/discussions)

## Acknowledgments

- Built with [TypeScript](https://www.typescriptlang.org/)
- MCP integration via [@modelcontextprotocol/sdk](https://github.com/anthropics/model-context-protocol)
- GitHub API via [@octokit/rest](https://github.com/octokit/rest.js)
- Git operations via [simple-git](https://github.com/steveukx/git-js)

---

**han-solo** - *May your commits be linear and your conflicts be few* 🚀