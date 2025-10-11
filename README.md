# han-solo 🚀

> AI-native Git workflow automation via Model Context Protocol (MCP) and native slash commands for Claude Code

han-solo is a powerful Claude Code plugin that streamlines Git workflows while maintaining clean, linear commit history. It provides structured validation, automated PR management, and seamless integration with GitHub through native slash commands and specialized sub-agents.

## Features

- **🤖 AI-Native Design**: Built exclusively for Claude Code with native plugin architecture
- **⚡ Slash Commands**: Quick access via `/hansolo` commands in Claude Code
- **🚀 One-Command Workflow**: Ship entire features in a single MCP tool call
- **🛡️ Structured Validation**: Pre/post-flight checks with JSON results (no UI dependencies)
- **🚫 Branch Reuse Prevention**: Blocks reusing branch names after merge
- **✓ PR Conflict Detection**: Ensures single PR per branch lifecycle
- **📈 Linear History Enforcement**: Ensures all merges result in clean, linear commit history
- **🔄 Session Management**: Track multiple concurrent workflows with isolated sessions
- **⚙️ State Machine Control**: Deterministic workflow states prevent invalid operations
- **🔗 GitHub Integration**: Automatic PR creation, CI monitoring, and merging
- **🔒 Safety First**: Built-in safeguards prevent accidental commits to main
- **📍 Smart Status Line**: Always-visible workflow status in Claude Code

## Installation

### MCP Server Setup

1. **Clone and build** the han-solo repository:
   ```bash
   git clone https://github.com/slamb2k/hansolo.git
   cd hansolo
   npm install
   npm run build
   ```

2. **Configure Claude Code** to load the MCP server:
   Add to your Claude Code MCP configuration file:
   ```json
   {
     "mcpServers": {
       "hansolo": {
         "command": "node",
         "args": ["/path/to/hansolo/build/index.js"]
       }
     }
   }
   ```

3. **Restart Claude Code** to load the MCP tools

4. **Initialize in your project** using natural language:
   ```
   "Initialize han-solo in this project"
   ```
   Claude will invoke the `hansolo_init` tool automatically.

## Quick Start

> **New to han-solo?** Follow these steps to get started with Claude Code.

### Two Ways to Use han-solo

han-solo provides both **native slash commands** and **direct MCP tool calls** for maximum flexibility:

**Option 1: Slash Commands (Recommended)** 🎯
```
/hansolo:init       - Initialize han-solo
/hansolo:launch     - Start a new feature
/hansolo:commit     - Commit changes
/hansolo:ship       - Ship your changes (full workflow)
/hansolo:status     - Check current status
```

**Option 2: Natural Language (Direct MCP Tool Calls)**
```
"Use hansolo_init to initialize han-solo in this project"
"Use hansolo_launch to start a new feature for authentication"
"Use hansolo_ship to commit, push, create PR, and merge"
```

Slash commands provide better integration, auto-completion, and coordinated workflows via specialized sub-agents (git-droid, docs-droid)!

---

### 1. Initialize han-solo in your project

**Using slash command:**
```
/hansolo:init
```

**Or using natural language:**
```
Use hansolo_init to initialize han-solo in this project
```

This creates a `.hansolo` directory with configuration and session storage.

### 2. (Optional) Set up GitHub authentication

```bash
# Option A: GitHub CLI (easiest)
gh auth login

# Option B: Personal access token
export GITHUB_TOKEN=ghp_your_token_here
```

### 3. Start a new feature workflow

**Using slash command:**
```
/hansolo:launch
```

**Or using natural language:**
```
Use hansolo_launch to start a new feature for [your feature description]
```

This creates a new feature branch and starts tracking your workflow.

### 4. Make your changes

Work on your feature as normal. han-solo tracks your session automatically.

**Check status:**
```
/hansolo:status
```

### 5. Ship your changes (One Command! 🚀)

**Using slash command:**
```
/hansolo:ship
```

**Or using natural language:**
```
Use hansolo_ship to commit, push, create PR, and merge this feature
```

That's it! This single MCP tool call:
- ✅ Commits your changes
- ✅ Pushes to remote
- ✅ Creates or updates PR
- ✅ Waits for CI checks
- ✅ Auto-merges when ready
- ✅ Syncs main branch
- ✅ Deletes feature branches
- ✅ Completes session

**Ready for your next feature!** 🎉

---

### Enable Status Line (Optional)

For always-visible workflow status in Claude Code:
```
/hansolo:status-line
```

---

## Slash Commands

han-solo provides native Claude Code slash commands for all functionality. Type `/hansolo` in Claude Code to see the full list.

### Available Commands

| Command | Description | Example |
|--------|-------------|---------|
| `/hansolo:init` | Initialize han-solo in your project | `/hansolo:init` |
| `/hansolo:launch` | Start a new feature workflow | `/hansolo:launch` |
| `/hansolo:commit` | Commit changes with a message | `/hansolo:commit` |
| `/hansolo:ship` | Complete workflow (commit, push, PR, merge) | `/hansolo:ship` |
| `/hansolo:swap` | Switch between workflow sessions | `/hansolo:swap feature/other-branch` |
| `/hansolo:abort` | Abort current workflow session | `/hansolo:abort` |
| `/hansolo:sessions` | List all workflow sessions | `/hansolo:sessions` |
| `/hansolo:status` | Show current workflow status | `/hansolo:status` |
| `/hansolo:cleanup` | Clean up expired sessions | `/hansolo:cleanup` |
| `/hansolo:hotfix` | Create emergency hotfix workflow | `/hansolo:hotfix` |
| `/hansolo:status-line` | Manage Claude Code status line | `/hansolo:status-line` |
| `/hansolo:prime` | Prime understanding of codebase | `/hansolo:prime` |
| `/hansolo:doc` | Manage documentation | `/hansolo:doc` |

### How Slash Commands Work

When you use a slash command like `/hansolo:launch`, Claude Code:
1. Displays the unique ASCII art banner for immediate visual feedback
2. Orchestrates the workflow using specialized sub-agents (git-droid, docs-droid)
3. Invokes the appropriate MCP tools for execution
4. Returns structured results with pre/post-flight checks

**Benefits of slash commands:**
- 🎯 **Discoverable** - Shows up in `/` menu with auto-completion
- ⚡ **Fast** - Quick access to commands with visual feedback
- 📝 **Guided** - Parameter hints and descriptions built-in
- 🤖 **Smart** - Coordinated by specialized sub-agents for intelligent workflows
- 🔄 **Flexible** - Can still use natural language for direct MCP tool calls

---

## Architecture

han-solo uses a plugin architecture with clear separation of concerns:

```
User → Slash Command → Sub-Agent → MCP Tools → Git/GitHub
         ↓              ↓            ↓
    Orchestration   Coordination   Execution
```

### Sub-Agents

han-solo includes specialized sub-agents for intelligent coordination:

- **git-droid** 🤖 - Git workflow coordination and automation
  - Manages branch creation and cleanup
  - Coordinates multi-step git operations
  - Provides intelligent defaults for git workflows
  - Handles state transitions and safety checks

- **docs-droid** 📚 - Documentation management and validation
  - Enforces documentation structure and naming conventions
  - Automatically places docs in correct locations
  - Maintains README.md indexes
  - Archives outdated documentation

### How It Works

1. **Slash commands** provide the user interface and high-level orchestration
2. **Sub-agents** coordinate operations with git-aware intelligence
3. **MCP tools** execute focused, single-purpose operations
4. **Services** provide core functionality (git operations, GitHub API, etc.)

This architecture ensures maintainability, testability, and a great user experience.

---

## Core MCP Tools

All han-solo functionality is exposed through MCP tools that Claude Code can invoke.

### `hansolo_init`
Initialize han-solo in your project. Creates configuration and session storage.

**Input:**
- `scope` (optional): Installation scope - "project" or "user" (default: "project")
- `force` (optional): Force reinitialization (default: false)

**Returns:** Structured result with success status and initialization details

### `hansolo_launch`
Start a new feature workflow with automatic branch creation.

**Input:**
- `branchName` (optional): Specify branch name (auto-generated if omitted)
- `description` (optional): Add description for the feature
- `force` (optional): Launch even with uncommitted changes
- `stashRef` (optional): Git stash reference to restore after branch creation
- `popStash` (optional): Whether to pop the stash (default: true if stashRef provided)

**Returns:** SessionToolResult with pre/post-flight check results

### `hansolo_commit`
Commit changes to the current feature branch.

**Input:**
- `message` (optional): Commit message (generated if omitted)
- `stagedOnly` (optional): If true, only commit staged files (default: false)

**Returns:** SessionToolResult with commit details

### `hansolo_ship`
**COMPLETE WORKFLOW:** Complete the entire workflow automatically in a single command!

Ship handles everything: push → PR → CI wait → merge → cleanup

**What it does:**
1. Pushes to remote
2. Creates or updates GitHub PR
3. Waits for CI checks to pass (20 minute timeout)
4. Auto-merges PR with squash
5. Syncs local main branch
6. Deletes feature branches (local & remote)
7. Marks session as complete

**Input:**
- `prDescription` (optional): PR description (required for new PRs)
- `push` (optional): Push to remote (default: true)
- `createPR` (optional): Create pull request (default: true)
- `merge` (optional): Merge PR after CI passes (default: true)
- `force` (optional): Override safety checks
- `yes` (optional): Skip confirmations
- `stagedOnly` (optional): Only commit staged files when committing changes

**Returns:** GitHubToolResult with PR number, URL, and merge status

### `hansolo_sessions`
List and manage active workflow sessions.

**Input:**
- `all` (optional): Show all sessions including completed
- `verbose` (optional): Detailed session information
- `cleanup` (optional): Remove expired sessions

**Returns:** QueryToolResult with session list

### `hansolo_swap`
Switch between active workflow sessions.

**Input:**
- `branchName`: Branch to swap to (required)
- `force` (optional): Force swap with uncommitted changes
- `stash` (optional): Stash changes before swapping

**Returns:** SessionToolResult with swap details

### `hansolo_abort`
Cancel an active workflow session.

**Input:**
- `branchName` (optional): Specify branch to abort (current if omitted)
- `deleteBranch` (optional): Delete the branch after aborting
- `force` (optional): Force abort
- `yes` (optional): Skip confirmation

**Returns:** SessionToolResult with abort details

### `hansolo_status`
Show current workflow status and session information.

**Input:** None required

**Returns:** QueryToolResult with current status

### `hansolo_status_line`
Manage Claude Code status line display.

**Input:**
- `action`: Action to perform - "enable", "disable", "update", or "show" (required)
- `format` (optional): Custom format string (e.g., "{icon} {branch} {state}")
- `showBranchInfo` (optional): Show branch name in status line
- `showSessionInfo` (optional): Show session ID in status line
- `showStateInfo` (optional): Show workflow state in status line

**Returns:** QueryToolResult with status line configuration

### `hansolo_hotfix`
Create emergency hotfix workflow.

**Input:**
- `issue` (optional): Issue number or description
- `severity` (optional): Severity level - "critical", "high", or "medium"
- `force` (optional): Force operations
- `skipTests` (optional): Skip running tests
- `skipReview` (optional): Skip code review
- `autoMerge` (optional): Automatically merge when checks pass
- `yes` (optional): Skip confirmations

**Returns:** SessionToolResult with hotfix details

## Structured Results

All MCP tools return structured JSON results for programmatic handling by Claude Code:

### SessionToolResult
```typescript
{
  success: boolean;
  branchName?: string;
  state?: string;
  preFlightChecks?: CheckResult[];
  postFlightVerifications?: CheckResult[];
  errors?: string[];
  warnings?: string[];
  nextSteps?: string[];
}
```

### GitHubToolResult
```typescript
{
  success: boolean;
  prNumber?: number;
  prUrl?: string;
  merged?: boolean;
  preFlightChecks?: CheckResult[];
  postFlightVerifications?: CheckResult[];
  errors?: string[];
  warnings?: string[];
}
```

### QueryToolResult
```typescript
{
  success: boolean;
  data: Record<string, unknown>;
  message?: string;
  errors?: string[];
  warnings?: string[];
}
```

## Pre-Flight and Post-Flight Checks

Every MCP tool includes comprehensive validation with structured results:

**Pre-Flight Checks** (before execution):
- Validates prerequisites are met
- Returns structured check results
- Provides actionable error messages
- Can be overridden with `force` flag

**Post-Flight Verifications** (after execution):
- Confirms expected state was achieved
- Verifies all operations completed
- Identifies any issues that occurred
- Returns detailed verification results

**Check Result Structure:**
```typescript
{
  name: string;
  passed: boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
  details?: {
    expected?: any;
    actual?: any;
    suggestion?: string;
  };
}
```

See docs/guides/validation.md for complete documentation.

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

han-solo automatically detects and uses `gh` CLI authentication if available.

### Features
- Automatic PR creation with generated descriptions
- CI check monitoring with configurable timeout
- Review status tracking
- Squash merge support
- Automatic branch cleanup

## Status Line Integration

The status line provides at-a-glance workflow information directly in Claude Code:

```
[han-solo] 💻 0c2a20a7 | feature/my-feature | BRANCH_READY
```

**Status Line Components:**
- **Session ID**: Short identifier for current session
- **Branch Name**: Current feature branch
- **State**: Workflow state (BRANCH_READY, PUSHED, etc.)

**Managing the Status Line:**
```
Use hansolo_status_line with action "enable"
Use hansolo_status_line with action "disable"
Use hansolo_status_line with action "show"
Use hansolo_status_line with action "update" and showBranchInfo true
```

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
preferences:
  defaultBranchPrefix: feature/
  autoCleanup: true
  prTemplate:
    footer: "🤖 Generated with han-solo"
```

## Architecture

han-solo follows a pure MCP architecture:

```
┌─────────────────────────────────┐
│         Claude Code             │
│    (MCP Client - AI Agent)      │
└─────────────────────────────────┘
                ↓ JSON-RPC
┌─────────────────────────────────┐
│       MCP Server                │
│    (HanSoloMCPServer)           │
└─────────────────────────────────┘
                ↓
┌─────────────────────────────────┐
│       MCP Tools Layer           │
│  (LaunchTool, ShipTool, etc.)   │
└─────────────────────────────────┘
                ↓
┌─────────────────────────────────┐
│  Validation Services Layer      │
│  (Pre/Post-Flight Checks)       │
└─────────────────────────────────┘
                ↓
┌─────────────────────────────────┐
│     Core Services Layer         │
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

### Testing the MCP Server
```bash
# Build MCP server
npm run build:mcp

# Start MCP server for testing
npm run mcp:start

# Run MCP tests
npm run test:mcp
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

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# MCP server tests only
npm run test:mcp
```

## Documentation

### Getting Started
- **docs/guides/quickstart.md** - Get up and running in 5 minutes
- **docs/guides/installation.md** - Detailed installation instructions
- **docs/guides/usage.md** - Practical examples and real-world scenarios

### Reference
- **docs/guides/mcp-tools-reference.md** - Complete MCP tool reference
- **docs/dev/system/configuration.md** - Configuration options
- **docs/dev/system/pre-flight-checks.md** - Pre/post-flight checks documentation

### Advanced
- **docs/dev/system/mcp-architecture.md** - MCP architecture overview
- **docs/dev/system/mcp-tools.md** - MCP tools implementation details
- **docs/dev/plans/phase3-pure-mcp-architecture.md** - MCP-only design philosophy

### Migration
- **docs/guides/migration-from-cli.md** - Migrating from CLI-based versions (v1.x)

## Contributing

Contributions are welcome! Please see our Contributing Guide for details.

1. Fork the repository
2. Start a new workflow (Use hansolo_launch via Claude Code)
3. Make your changes
4. Add tests for new functionality
5. Run tests and linting
6. Ship your changes (Use hansolo_ship via Claude Code)
7. Create a pull request

## License

MIT License - see LICENSE file for details

## Support

- **Issues**: [GitHub Issues](https://github.com/slamb2k/hansolo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/slamb2k/hansolo/discussions)

## Acknowledgments

- Built with [TypeScript](https://www.typescriptlang.org/)
- MCP integration via [@modelcontextprotocol/sdk](https://github.com/anthropics/model-context-protocol)
- GitHub API via [@octokit/rest](https://github.com/octokit/rest.js)
- Git operations via [simple-git](https://github.com/steveukx/git-js)

---

**han-solo v2.0** - *AI-native Git workflow automation for Claude Code* 🤖

