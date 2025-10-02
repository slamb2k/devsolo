# han-solo 🚀

> Git workflow automation tool that enforces linear history and prevents merge conflicts

han-solo is a powerful CLI tool designed to streamline Git workflows while maintaining clean, linear commit history. It integrates with Claude Code through MCP (Model Context Protocol) and GitHub API for seamless PR management.

## Features

- **Linear History Enforcement**: Ensures all merges result in clean, linear commit history
- **Session Management**: Track multiple concurrent workflows with isolated sessions
- **State Machine Control**: Deterministic workflow states prevent invalid operations
- **GitHub Integration**: Automatic PR creation, review tracking, and merging
- **MCP Server**: Native Claude Code integration for AI-assisted workflows
- **Visual Feedback**: Rich terminal UI with progress indicators and status displays
- **Safety First**: Built-in safeguards prevent accidental commits to main

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
hansolo launch --branch feature/my-awesome-feature
```

### 3. Make your changes
Work on your feature as normal. han-solo tracks your session automatically.

### 4. Ship your changes
```bash
# Commit changes
hansolo ship

# Push to remote
hansolo ship --push

# Create PR
hansolo ship --create-pr

# Merge after approval
hansolo ship --merge
```

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
Complete workflow stages from commit to merge.

**Options:**
- `--message <msg>` - Commit message
- `--push` - Push changes to remote
- `--create-pr` - Create GitHub pull request
- `--merge` - Merge PR to main (after approval)
- `--force` - Force operations
- `--yes` - Skip confirmations

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