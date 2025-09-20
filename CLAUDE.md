# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

han-solo is a Git workflow automation tool that enforces linear history through a dual-layer architecture:
- **MCP Server Layer**: Deterministic state machine workflow control (source of truth for state)
- **Claude Code Layer**: Intelligent content generation and user interaction (enhances but never controls workflow)

## Key Commands

### Installation and Setup
```bash
# Install globally
npm install -g @hansolo/cli

# One-time project initialization (required before any other commands)
/hansolo:init
```

### Core Workflow Commands
- `/hansolo:init` - Mandatory first-time setup (creates GitHub repo if needed)
- `/hansolo:launch` - Creates feature branch with safety checks
- `/hansolo:ship` - Complete workflow from commit to deployment
- `/hansolo:hotfix` - Emergency production fixes with automatic backporting
- `/hansolo:status` - Comprehensive workflow visibility
- `/hansolo:sessions` - List all active workflows
- `/hansolo:swap` - Switch between concurrent sessions
- `/hansolo:abort` - Safe workflow cancellation

## Architecture & State Management

### Hybrid Orchestration
- MCP Server controls all state transitions and Git operations
- Claude Code provides content generation (commit messages, PR descriptions)
- Workflows remain completable even without AI assistance
- State machines are immutable and defined in the Constitution

### Standard Workflow States
```
INIT → BRANCH_READY → CHANGES_COMMITTED → PUSHED →
PR_CREATED → WAITING_APPROVAL → REBASING → MERGING →
CLEANUP → COMPLETE
```

### Session Management
- Each workflow has a cryptographically unique session ID
- Sessions are associated with Git branches for intuitive resumption
- Multiple concurrent sessions are supported
- Session state persists across tool invocations

## Critical Principles

### Linear History (NON-NEGOTIABLE)
- All new work begins from fresh, up-to-date main branch
- Feature branches kept current via rebasing, never merging
- All PRs are squash-merged to create atomic commits
- No merge commits in main history

### User Sovereignty
- Never commit, push, or create PRs without explicit permission
- Present clear options and wait for explicit responses
- Provide manual fallback for all AI-generated content
- Enable abort mechanisms at all non-irreversible stages

### Installation Structure
- Components install to `.hansolo/` directory (NOT `.claude/`)
- Clear separation between han-solo and Claude configurations
- User-level (`~/.hansolo/`) or project-level (`./.hansolo/`)

### Visual Feedback Standards
- ASCII art banners announce command execution
- Color-coded output for instant status recognition
- Progress bars and step indicators show workflow state
- Structured tables and boxes organize information

## Development Workflow

When implementing han-solo features:

1. **Initialization First**: All workflow commands require prior execution of `/hansolo:init`
2. **State Machine Compliance**: All state transitions must be validated by MCP server
3. **Validation Contracts**: Every workflow step enforces strict pre/post validation
4. **Git Hooks**: Pre-commit and pre-push hooks prevent direct main commits
5. **Audit Trail**: All state transitions logged with timestamps and context

## Important Files

- `hansolo-constitution.md`: Immutable principles and governance framework
- `hansolo-prd.md`: Detailed product requirements and specifications
- `hansolo-product-brief.md`: High-level product overview and business case