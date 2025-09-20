# han-solo Product Requirements Document

**Version**: 2.0.0  
**Date**: September 21, 2025  
**Status**: Active Development

## 1. Executive Summary

han-solo is an intelligent Git workflow automation tool that enforces linear history through a dual-layer architecture combining MCP server state machines with Claude Code intelligence. It prevents merge conflicts, automates repetitive tasks, and ensures consistent workflows across development teams while maintaining developer control over critical decisions.

## 2. Problem Statement

### Quantified Pain Points
- **15-20% of developer time** lost to Git workflow issues
- **$1M+ annual cost** for a 50-developer team in lost productivity
- **60% of production incidents** trace back to merge conflicts or unclear history
- **2-3 week onboarding time** for developers learning team Git conventions

### Root Causes
- Git's complexity and flexibility lead to inconsistent practices
- Merge conflicts discovered after the fact, not prevented
- Manual enforcement of conventions is error-prone
- Context switching between tools disrupts flow state

## 3. Solution Overview

### Architecture
han-solo uses a dual-layer architecture that separates control from intelligence:

- **MCP Server**: Deterministic state machine ensuring workflow integrity
- **Claude Code**: AI-powered content generation and user interaction
- **Result**: 100% predictable workflows with intelligent assistance

### Core Value Propositions
1. **Guaranteed Linear History**: No merge commits, ever
2. **Conflict Prevention**: Pre-merge rebasing catches issues early  
3. **Natural Multi-tasking**: Branch-based session management
4. **Zero Learning Curve**: Natural language commands
5. **Graceful Degradation**: Works without AI availability
6. **Solo/Team Flexibility**: Adapts to individual or collaborative workflows

## 4. User Personas

### Primary: Senior Developer / Tech Lead
**Demographics**: 5-15 years experience, manages 3-10 developers  
**Jobs-to-be-Done**:
- Enforce consistent Git practices without micromanagement
- Reduce time spent resolving conflicts and cleaning history
- Onboard new developers quickly and safely
- Maintain audit trail for compliance

**Pain Points**: Inconsistent practices, merge conflicts, onboarding time
**Success Metrics**: Linear history, reduced conflicts, faster onboarding

### Secondary: DevOps Engineer
**Demographics**: 3-10 years experience, manages CI/CD infrastructure  
**Jobs-to-be-Done**:
- Integrate Git workflow with deployment pipelines
- Ensure code quality before production deployment
- Automate release processes end-to-end
- Maintain compliance and audit requirements

**Pain Points**: Failed deployments, manual processes, compliance gaps
**Success Metrics**: Deployment success rate, automation coverage, audit compliance

### Tertiary: Junior Developer
**Demographics**: 0-3 years experience, learning team practices  
**Jobs-to-be-Done**:
- Ship code without breaking conventions
- Learn Git best practices through usage
- Get immediate feedback on mistakes
- Focus on coding, not Git mechanics

**Pain Points**: Git complexity, fear of mistakes, slow feedback
**Success Metrics**: Time to first PR, error rate, confidence level

## 5. Installation & Setup

### 5.1 Installation Architecture

han-solo uses a two-phase installation process:
1. **Package Installation**: Installs MCP server and optional components
2. **Project Initialization**: Configures Git repository for han-solo workflows

### 5.2 Installation Methods

#### Standard npm Installation
```bash
# Global installation
npm install -g @hansolo/cli

# Project installation  
npm install --save-dev @hansolo/cli
```

#### Direct Installation with npx
```bash
# One-time installer execution without package installation
npx @hansolo/cli install
```

After installation, initialize projects with:
```bash
/hansolo:init  # Required before using any other commands
```

### 5.3 Interactive Installer

When installing the npm package, an interactive installer automatically runs to set up:

#### Installation Profiles
- **Solo Developer**: Full suite for independent development
- **Team Workflow**: Collaborative development tools  
- **Minimal**: Essential commands only
- **Custom**: Choose specific components

#### Component Selection
- **MCP Server** (always installed): Core workflow engine
- **Status Lines**: Terminal awareness scripts (han-solo.sh, han-solo-minimal.sh)
- **Git Hooks**: Pre-commit/pre-push safety checks
- **Git Templates**: Commit message and PR templates
- **Utility Scripts**: Helper tools and automation

#### Installation Scope
- **User-level** (`~/.hansolo/`): Components available across all projects
- **Project-level** (`./.hansolo/`): Components specific to this project

### 5.4 Component Locations

| Component | User-Level | Project-Level | Purpose |
|-----------|------------|---------------|---------|
| MCP Server | npm global/local | npm node_modules | Core engine |
| Status Lines | `~/.hansolo/status_lines/` | `./.hansolo/status_lines/` | Terminal display |
| Git Hooks | `~/.hansolo/hooks/` | `./.hansolo/hooks/` | Safety checks |
| Git Templates | `~/.hansolo/templates/` | `./.hansolo/templates/` | Message templates |
| Claude Settings | `~/.claude/settings.local.json` | `./.claude/settings.local.json` | Claude configuration |
| hansolo.yaml | N/A | `./hansolo.yaml` | Project marker |

## 6. Feature Specifications

### 6.1 Commands

| Command | Description | Primary Tool | State Changes |
|---------|-------------|--------------|---------------|
| `/hansolo:init` | Initialize project with han-solo (MANDATORY FIRST) | `configure_workflow` | N/A - Setup only |
| `/hansolo:launch` | Create feature branch safely | `start_workflow("launch")` | INIT → BRANCH_READY |
| `/hansolo:ship` | Complete shipping workflow | `start_workflow("ship")` | BRANCH_READY → COMPLETE |
| `/hansolo:hotfix` | Emergency production fix | `start_workflow("hotfix")` | HOTFIX_INIT → HOTFIX_COMPLETE |
| `/hansolo:status` | Show all sessions and states | `get_sessions_status` | Read-only |
| `/hansolo:sessions` | List active workflow sessions | `get_sessions_status` | Read-only |
| `/hansolo:swap` | Switch between sessions | `swap_session` | Context switch |
| `/hansolo:cleanup` | Manual branch cleanup | `cleanup_operations` | N/A - Maintenance |
| `/hansolo:validate` | Pre-flight checks | `validate_environment` | Read-only |
| `/hansolo:abort` | Cancel active workflow | `abort_workflow` | * → INIT |
| `/hansolo:config` | Configure preferences | `configure_workflow` | N/A - Settings |
| `/hansolo:status-line` | Configure terminal status line | `manage_status_line` | N/A - Terminal UI |

### 6.2 MCP Server Tools

| Tool | Purpose | Dependencies | Idempotent |
|------|---------|--------------|------------|
| `create_branch` | ALL branch creation operations | None | Yes |
| `cleanup_operations` | ALL post-merge cleanup | None | Yes |
| `rebase_on_main` | Pre-merge rebase with conflicts | None | No |
| `get_sessions_status` | Query all session states | None | Yes |
| `start_workflow` | Initialize any workflow type | `create_branch` | No |
| `execute_workflow_step` | Process state transitions | Multiple | No |
| `swap_session` | Switch active session | `get_sessions_status` | Yes |
| `abort_workflow` | Cancel and rollback | `cleanup_operations` | No |
| `configure_workflow` | Initialize project and set preferences | None | Yes |
| `validate_environment` | Run pre-flight checks | `get_sessions_status` | Yes |
| `manage_status_line` | Configure terminal status line display | None | Yes |

#### Special Tools

**`configure_workflow`**
The `configure_workflow` tool has two modes:
1. **Init Mode**: Sets up new projects, creates remotes, installs hooks
2. **Config Mode**: Updates preferences for initialized projects

When in init mode, this tool:
- Detects if Git repository exists, creates if needed
- Checks for remote, offers to create GitHub/GitLab repo if missing
- Installs all hooks and templates
- Creates `hansolo.yaml` marking project as initialized
- Sets up branch protection at platform level
- Optionally configures status line

All other tools check for `hansolo.yaml` presence before executing.

**`manage_status_line`**
Controls the terminal status line display for ambient awareness:
- Detects available status line scripts (project or user level)
- Updates `settings.local.json` to enable/disable status line
- Supports switching between full and minimal modes
- Provides current status and help information
- Respects installation scope (project vs user)

### 6.3 Workflow States

#### Standard Workflow
| State | Description | Valid Transitions |
|-------|-------------|-------------------|
| INIT | Starting point | → BRANCH_READY |
| BRANCH_READY | On feature branch | → CHANGES_COMMITTED |
| CHANGES_COMMITTED | Changes committed | → PUSHED |
| PUSHED | Pushed to remote | → PR_CREATED |
| PR_CREATED | PR opened | → WAITING_APPROVAL, REBASING |
| WAITING_APPROVAL | Awaiting review | → REBASING, BRANCH_READY |
| REBASING | Updating with main | → MERGING, CONFLICT_RESOLUTION |
| MERGING | Executing merge | → CLEANUP |
| CLEANUP | Post-merge cleanup | → COMPLETE |
| COMPLETE | Terminal state | None |

#### Hotfix Workflow
| State | Description | Valid Transitions |
|-------|-------------|-------------------|
| HOTFIX_INIT | Emergency started | → HOTFIX_READY |
| HOTFIX_READY | On hotfix branch | → HOTFIX_COMMITTED |
| HOTFIX_COMMITTED | Fix committed | → HOTFIX_PUSHED |
| HOTFIX_PUSHED | Pushed to remote | → HOTFIX_VALIDATED |
| HOTFIX_VALIDATED | CI passed | → HOTFIX_DEPLOYED |
| HOTFIX_DEPLOYED | In production | → HOTFIX_CLEANUP |
| HOTFIX_CLEANUP | Backporting | → HOTFIX_COMPLETE |
| HOTFIX_COMPLETE | Terminal state | None |

### 6.4 Intelligence Integration Points

| Operation | MCP Provides | Claude Generates | User Choice |
|-----------|--------------|------------------|-------------|
| Branch naming | Diff analysis | Name suggestions | Select or custom |
| Commit message | Diff context | Message options | Select or edit |
| PR description | Commit list | Comprehensive text | Review and edit |
| Conflict resolution | Conflict details | Resolution guide | Manual resolve |
| Error handling | Technical error | User explanation | Retry or abort |
| Review waiting | Requirements status | Clear instructions | Resume later |
| Merge method | Auto-merge capability | Status updates | Wait or manual |

## 7. Key Use Case Scenarios

### 7.1.1 CLAUDE.md Configuration

During init, han-solo adds or updates the CLAUDE.md file with instructions for Claude Code integration:

```markdown
# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Han-Solo Workflow System

<!-- DO NOT REMOVE OR MODIFY THIS SECTION - CRITICAL FOR WORKFLOW INTEGRITY -->
**⚠️ MANDATORY - THIS PROJECT USES HAN-SOLO MCP SERVER ⚠️**

This repository is configured with han-solo, an intelligent Git workflow automation system that enforces linear history and prevents merge conflicts. You MUST use han-solo commands for all Git operations.

### Available Commands

**Primary Workflows:**
- `/hansolo:init` - Initialize han-solo (already complete for this project)
- `/hansolo:launch` - Create a new feature branch safely
- `/hansolo:ship` - Complete workflow from commit to merge
- `/hansolo:hotfix` - Emergency production fix

**Status and Management:**
- `/hansolo:status` - Show all sessions and current state
- `/hansolo:sessions` - List active workflow sessions
- `/hansolo:swap` - Switch between active sessions
- `/hansolo:cleanup` - Clean up merged branches
- `/hansolo:abort` - Cancel current workflow

**CRITICAL**: Always use these commands instead of manual Git operations. The MCP server handles all Git interactions through deterministic state machines.

## Git Operation Rules

<!-- DO NOT REMOVE - ENFORCED BY MCP SERVER AND HOOKS -->
**⚠️ NEVER PERFORM MANUAL GIT OPERATIONS ⚠️**

**PROHIBITED** - These operations are blocked and must go through han-solo:
- Direct `git commit` - Use `/hansolo:ship` instead
- Direct `git push` - Use `/hansolo:ship` instead
- Direct `gh pr create` - Use `/hansolo:ship` instead
- Manual PR creation - Use `/hansolo:ship` instead
- Direct commits to main - Use `/hansolo:hotfix` for emergencies

**EXCEPTION**: The han-solo MCP server handles all Git operations automatically when you use the commands above. Trust the workflow system.

## Workflow State Machine

The MCP server maintains strict state machines for all workflows. When you execute a command:

1. **The MCP server controls the flow** - You cannot skip steps or change the sequence
2. **Claude provides intelligence** - You generate commit messages, PR descriptions, branch names
3. **Validation is automatic** - All your inputs are validated before execution
4. **Rollback on failure** - Failed operations automatically roll back to a safe state

### Ship Workflow States
When you run `/hansolo:ship`, the MCP server will:
1. Check current branch and session state
2. Request commit message (you generate options)
3. Commit changes automatically
4. Push to remote automatically
5. Create PR with your generated description
6. Enable auto-merge if allowed
7. Wait for CI/reviews
8. Merge and cleanup automatically

**DO NOT** try to perform these steps manually. The workflow handles everything.

## Session Management

Han-solo uses session-based workflows:
- Each workflow creates a unique session ID
- Sessions persist across Claude conversations
- Multiple concurrent sessions are supported
- Use `/hansolo:status` to see all active sessions
- Use `/hansolo:swap` to switch between sessions

## Command Execution Behavior

<!-- CRITICAL FOR CORRECT MCP SERVER INTERACTION -->
**⚠️ UNDERSTANDING MCP COMMAND EXECUTION ⚠️**

### When a user requests a han-solo command:

1. **Execute it immediately** through the MCP server
2. **Wait for the complete response** - The MCP server handles all operations
3. **Don't check for "already running"** - The MCP server manages concurrency
4. **Trust the output** - ASCII banners and status messages are normal

### The MCP server will show:
- ASCII art banners (colored) indicating command start
- Progress messages for each step
- Clear success or error states
- Next actions you can take

### DO NOT intervene when:
- The MCP server is executing a workflow
- You see progress messages
- Auto-merge is waiting for CI
- The system is rebasing

### Only take action when:
- The MCP server explicitly requests input (commit message, branch name, etc.)
- An error occurs and the server provides recovery options
- The user explicitly asks to abort

## Status Line Integration

If configured, the han-solo status line shows:
- Current branch and session
- Git statistics
- PR status
- Safety warnings

This provides ambient awareness without needing to run status commands constantly.

## Error Handling

When the MCP server returns an error:
1. **Read the error type** - PRE_FLIGHT_FAILED, ACTION_NOT_ALLOWED, etc.
2. **Follow the instruction** - The server provides specific guidance
3. **Don't try to bypass** - Errors indicate workflow violations
4. **Use suggested alternatives** - The server suggests valid actions

## Best Practices

1. **Always start with status**: Run `/hansolo:status` to understand current state
2. **Use launch for new features**: `/hansolo:launch` creates branches safely
3. **Ship completes everything**: `/hansolo:ship` handles the entire workflow
4. **Trust the automation**: Don't try to "help" by doing manual operations
5. **Check sessions when returning**: `/hansolo:sessions` shows work in progress

## Implementation Details

- **MCP Server**: Provides deterministic state machine control
- **Claude Code**: Provides intelligent content generation
- **Git Hooks**: Enforce safety at the Git level
- **Status Lines**: Provide real-time awareness
- **Session Files**: Track workflow state

**NOTE TO CLAUDE**: This project uses han-solo for ALL Git operations. Never bypass the MCP server or perform manual Git commands. The system is designed to prevent merge conflicts and maintain linear history. Trust the workflow automation.
```

This CLAUDE.md content is written to the project root during `/hansolo:init` and provides Claude Code with:
1. Clear command documentation
2. Workflow explanations
3. Prohibition of manual Git operations
4. Session management understanding
5. Error handling guidance
6. Best practices for using han-solo
```
Developer: /hansolo:init
System: Detects no .git directory
Claude: "No Git repository detected. Let's set everything up!
        
        Initialize Git and create remote repository?
        [g]ithub - Create on GitHub
        [l]gitlab - Create on GitLab
        [o]nly local - Just initialize locally
        [s]kip - I'll handle it manually"
        
User: g

Claude: "GitHub repository setup:
        Repository name: [current-directory-name]
        Visibility: [p]ublic or p[r]ivate?"
        
User: r

Claude: "Project type:
        [s]olo - Individual developer (no review requirements)
        [t]eam - Multiple developers (enforce reviews)
        [c]ustom - Configure requirements manually"
        
User: s

System: Creates GitHub repo with solo settings
Claude: "✔ Git repository initialized
        ✔ GitHub repository 'my-project' created (private)
        ✔ Remote origin added
        ✔ Branch protection enabled (solo mode - no reviews required)
        ✔ Linear history enforced at platform level
        
        Solo developer mode configured:
        - No PR reviews required
        - Auto-merge enabled by default
        - You maintain full control
        
        Configuring han-solo...
        [installs hooks, templates, creates hansolo.yaml]
        ✔ han-solo ready! You can now use all commands."
        
Result: Complete setup optimized for solo development
```

### 7.2 Launch: Safe Branch Creation
```
Developer: /hansolo:launch
System: Detects 5 uncommitted files on main
Claude: "You have uncommitted changes. How should I handle them?"
        [s]tash  [c]ommit  [m]ove  [d]iscard
User: m
System: Analyzes changes (auth/login.js, auth/jwt.js modified)
Claude: "Based on your auth changes, suggested names:
        1. feat/auth-improvements
        2. feat/jwt-authentication
        3. feat/login-updates"
User: 1
Result: Branch created with changes moved, session started
```

### 7.3 Ship: Complete Workflow with Auto-Merge Flexibility

#### Scenario A: Auto-Merge Enabled
```
Developer: /hansolo:ship
[... commits, pushes ...]
System: Creates PR, attempts to enable auto-merge
Claude: "PR #456 created with auto-merge enabled.
        
        Waiting for requirements:
        ⏳ CI/CD checks (0/5 passed)
        ⏳ Required reviews (0/2)
        ⏳ Branch up-to-date check
        
        ⚠️ Manual review required. Please ask reviewers to approve.
        Run /hansolo:ship again after approval to complete workflow."

[Developer gets reviews, returns later]

Developer: /hansolo:ship
System: Detects PR already merged via auto-merge
Claude: "Great! PR #456 was auto-merged after all requirements passed.
        
        Completing remaining steps:
        ✔ Syncing local main with origin
        ✔ Deleting local branch feat/payment-api
        ✔ Deleting remote branch origin/feat/payment-api
        
        Ship complete! You're on clean main."
```

### 7.4 Status: Comprehensive Environment Check
```
Developer: /hansolo:status

[MCP Server: get_sessions_status()]
Claude: "📊 Comprehensive Workflow Status
        
        Current Branch: feat/payment-api
        Active Session: #a3f2 (WAITING_APPROVAL)
        
        === YOUR SESSIONS (3 active) ===
        
        feat/payment-api (#a3f2) ← YOU ARE HERE
        • State: WAITING_APPROVAL
        • PR #456: Needs 2 reviews
        • CI: All checks passed ✔
        • Blockers: Awaiting review from @john, @sarah
        • Next: Get reviews, then run /hansolo:ship
        
        fix/memory-leak (#b7d9)
        • State: CI_RUNNING
        • PR #457: Tests in progress (4/5 complete)
        • Estimated: 5 minutes remaining
        • Next: Will auto-merge when CI passes
        
        feat/user-profile (#c8e0)
        • State: BRANCH_READY
        • Changes: 5 uncommitted files
        • No PR created yet
        • Next: Run /hansolo:ship when ready
        
        === REPOSITORY HEALTH ===
        • Main branch: Up to date ✔
        • Your open PRs: 2 of 4 total
        • CI Pipeline: Healthy (98% pass rate)
        • Last deployment: 2 hours ago (v2.3.1)
        • Protected branches: main (enforced)
        
        === SUGGESTED ACTIONS ===
        1. Request reviews for PR #456
        2. Check CI status for PR #457
        3. Consider shipping feat/user-profile"

Result: Complete situational awareness
```

## 8. Technical Architecture

### 8.1 System Architecture
```
┌─────────────────┐     ┌──────────────────┐
│  Claude Code    │────▶│   MCP Server     │
│  (Intelligence) │     │ (State Machine)   │
└─────────────────┘     └──────────────────┘
         │                        │
         ▼                        ▼
┌─────────────────┐     ┌──────────────────┐
│ User Interface  │     │ Git Operations    │
│   (Natural      │     │  (Deterministic   │
│    Language)    │     │    Execution)     │
└─────────────────┘     └──────────────────┘
```

#### Design Philosophy: Guard Rails with Intelligence
The architecture enforces a "guard rails" approach:
- **MCP Server**: Provides immutable rails that prevent workflow violations
- **Claude Code**: Operates within the rails, providing intelligence at decision points
- **Result**: Workflows cannot be broken, but remain flexible and intelligent

### 8.2 Package Structure

```
@hansolo/cli/
├── package.json          # Defines bin commands and postinstall
├── bin/
│   ├── hansolo.js       # CLI entry point for MCP server
│   └── install.js       # Interactive installer
├── lib/
│   ├── mcp-server.js    # Core MCP server implementation
│   └── state-machine.js # Workflow state management
├── files/               # Bundled installation files
│   ├── status_lines/    # Status line scripts
│   │   ├── han-solo.sh
│   │   └── han-solo-minimal.sh
│   ├── hooks/           # Git safety hooks
│   │   ├── pre-commit.sh
│   │   └── pre-push.sh
│   └── templates/       # Git templates
│       ├── commit-message.txt
│       └── pull-request.md
└── README.md

package.json:
{
  "name": "@hansolo/cli",
  "bin": {
    "hansolo": "./bin/hansolo.js",
    "hansolo-install": "./bin/install.js"
  },
  "scripts": {
    "postinstall": "node ./bin/install.js --auto"
  }
}
```

### 8.3 Installation Flow

#### npm install -g @hansolo/cli
1. npm installs package globally
2. **postinstall** script runs automatically
3. Interactive installer launches:
   - Detects global installation
   - Prompts for profile and components
   - Installs to `~/.hansolo/` (user-level)
   - Updates `~/.claude/settings.local.json` with paths
4. `hansolo` command becomes available globally
5. User runs `hansolo init` in any project

#### npm install --save-dev @hansolo/cli
1. npm installs package in project
2. **postinstall** script runs automatically
3. Interactive installer launches:
   - Detects project installation
   - Prompts for profile and components
   - Installs to `./.hansolo/` (project-level)
   - Updates `./.claude/settings.local.json` with paths
4. User runs `npx hansolo init` in this project

#### npx @hansolo/cli init
1. npm downloads package to temporary cache
2. **postinstall** script runs with detection:
   - Checks for existing installation
   - If missing, runs installer (defaults to user-level)
   - If present, skips installation
3. Executes `hansolo init` command directly

### 8.4 Directory Structure After Installation

**User-level installation** (`npm install -g`):
```
~/
├── .hansolo/                    # han-solo components
│   ├── status_lines/
│   │   ├── han-solo.sh
│   │   └── han-solo-minimal.sh
│   ├── hooks/
│   │   ├── pre-commit.sh
│   │   └── pre-push.sh
│   └── templates/
│       ├── commit-message.txt
│       └── pull-request.md
└── .claude/                     # Claude configuration
    └── settings.local.json      # Points to ~/.hansolo/ components
```

**Project-level installation** (`npm install --save-dev`):
```
project-root/
├── .hansolo/                    # han-solo components
│   ├── status_lines/
│   ├── hooks/
│   └── templates/
├── .claude/                     # Claude configuration
│   └── settings.local.json      # Points to ./.hansolo/ components
├── hansolo.yaml                 # Project configuration (after init)
└── package.json                 # Contains @hansolo/cli dependency
```

### 8.5 Communication Protocol
- **Format**: JSON over stdio
- **Encoding**: UTF-8
- **Timeout**: 30 seconds per operation
- **Retry**: Exponential backoff with 3 attempts
- **Error Format**: `{"error": "message", "code": "ERROR_CODE"}`

### 8.6 Initialization Enforcement

When any han-solo command runs (except init), the MCP server:

```javascript
// MCP Server initialization check
async function verifyInitialization() {
  // Check for project initialization
  if (!fs.existsSync('./hansolo.yaml')) {
    return {
      error: 'NOT_INITIALIZED',
      message: 'Project not initialized. Run /hansolo:init first'
    };
  }
  
  // Check for installed components (either location)
  const userComponents = fs.existsSync(os.homedir() + '/.hansolo/');
  const projectComponents = fs.existsSync('./.hansolo/');
  
  if (!userComponents && !projectComponents) {
    return {
      error: 'COMPONENTS_MISSING',
      message: 'han-solo components not found. Run: npm install -g @hansolo/cli'
    };
  }
  
  return { status: 'OK' };
}
```

## 9. Status Line Feature

### 9.1 Overview

The han-solo status line provides "ambient awareness" - constant, non-intrusive visibility of repository state in your terminal. This implements the Constitutional principle of Ambient Awareness (Section V).

### 9.2 Installation Scope

Status lines are installed by the npm installer to han-solo directories:

**User-level** (`~/.hansolo/status_lines/`):
- Installed when running `npm install -g @hansolo/cli`
- Available across all projects
- Referenced from `~/.claude/settings.local.json`

**Project-level** (`./.hansolo/status_lines/`):
- Installed when running `npm install --save-dev @hansolo/cli`
- Only active in that specific project
- Referenced from `./.claude/settings.local.json`

### 9.3 Status Line Types

**Full Status Line** (`han-solo.sh`):
- Current working directory (basename)
- Branch name with visual indicators for state
- Git statistics: staged/modified/untracked files, lines added/removed
- Sync status: ahead/behind/diverged from origin
- PR status: if PR exists for current branch
- Active session: han-solo workflow session ID and state
- Safety warnings: visual alerts when on main branch
- Performance: < 100ms execution time

**Minimal Status Line** (`han-solo-minimal.sh`):
- Branch name only
- Session indicator: shows if han-solo session is active
- Main branch warning: simple indicator when on protected branch
- Purpose: For integration with existing custom prompts
- Usage: Can be embedded in PS1 as `$(~/.hansolo/status_lines/han-solo-minimal.sh)`

### 9.4 Manual Control via MCP Server

The `/hansolo:status-line` command (provided by `manage_status_line` tool) allows runtime control:

```bash
# Enable full status line
/hansolo:status-line enable

# Use minimal version
/hansolo:status-line minimal

# Disable status line
/hansolo:status-line disable

# Show current configuration
/hansolo:status-line current

# Show help
/hansolo:status-line help
```

## 10. Configuration

### 10.1 Project Configuration (hansolo.yaml)
```yaml
version: 1.0.0

project:
  type: solo              # solo|team|custom
  name: my-project
  default_branch: main
  
workflow:
  enforce_linear_history: true
  auto_rebase: true
  squash_merge_only: true
  
automation:
  commit_messages: suggest  # auto|suggest|manual
  branch_names: auto        # auto|suggest|manual
  pr_descriptions: suggest  # auto|suggest|manual
  auto_merge:
    attempt: true          # Try to enable auto-merge
    fallback: manual       # What to do if blocked
    wait_mode: prompt      # prompt|continuous|exit
  
ci_requirements:
  require_all_checks: true  # Block merge until all CI passes
  required_checks:          # Specific checks that must pass
    - continuous-integration/github-actions
    - security/snyk
    - coverage/codecov
  min_coverage: 80          # Minimum code coverage percentage
  
reviews:
  # Solo projects: 0, Team projects: 1-5, Custom: any value
  required_approvals: 0     # Solo dev = 0, Team = 2+ 
  dismiss_stale: true       # Dismiss reviews on new commits
  require_codeowners: false # Solo = false, Team = true
  notify_on_required: true  # Alert when reviews needed
  
sessions:
  max_concurrent: 10
  timeout_days: 7
  auto_resume: true
  resume_on_merge: true    # Auto-resume when PR merges
```

### 10.2 Git Configuration (.gitconfig)
```ini
[pull]
    ff = only
[merge]
    ff = only
[rebase]
    autoStash = true
[fetch]
    prune = true
[branch]
    autoSetupRebase = always
    sort = -committerdate
```

### 10.3 Hook Configuration
| Hook | Purpose | Enforcement |
|------|---------|------------|
| pre-commit | Block main commits | Mandatory |
| pre-push | Prevent main push | Mandatory |
| commit-msg | Format validation | Configurable |
| post-merge | Trigger cleanup | Automatic |

## 11. Non-Functional Requirements

### 11.1 Performance
- State transition: < 100ms
- Git operation: < 1 second
- AI generation: < 3 seconds
- Memory usage: < 50MB (MCP server)
- Startup time: < 500ms

### 11.2 Security
- No credential storage in MCP server
- Session IDs: 128-bit cryptographic randomness
- API tokens via environment variables only
- Audit logs: tamper-evident with checksums
- Git operations: respect SSH/HTTPS configs

### 11.3 Reliability
- Availability: 99.9% (excluding AI service)
- Session recovery: Automatic on restart
- Data loss: Zero tolerance
- Graceful degradation: Full functionality without AI
- Error recovery: Automatic retry with backoff

### 11.4 Scalability
- Concurrent sessions: 10+ per developer
- Repository size: Up to 10GB
- File count: Up to 100,000 files
- History depth: Unlimited
- Team size: 1-500 developers

### 11.5 Compatibility
- Git: 2.28+ required
- OS: macOS, Linux, WSL2
- Node.js: 18+ for Claude Code
- Python: 3.9+ for MCP server
- GitHub/GitLab/Bitbucket API support

## 12. Success Metrics

### 12.1 Technical Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| Linear history compliance | 100% | Git log analysis |
| Merge conflict reduction | 75% | Incident tracking |
| Setup time | < 5 min | User timing |
| Workflow success rate | > 95% | Session completion |
| CI pass rate | > 90% | Pipeline metrics |

### 12.2 Business Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| Developer time saved | 4 hrs/week | Time tracking |
| Onboarding time | 50% reduction | HR metrics |
| Production incidents | 40% reduction | Incident reports |
| Developer satisfaction | > 4.5/5 | Survey |
| Team adoption | > 90% | Usage analytics |

### 12.3 Adoption Milestones
- Week 1: 25% of team using daily
- Month 1: 75% of team adopted
- Month 3: Expanded to 3 teams
- Month 6: Organization standard
- Year 1: 500+ teams using

## 15. Validation & Determinism Contracts

### 15.1 Contract Architecture

Every workflow step has strict pre-flight and post-flight contracts that constrain Claude's reasoning to valid options:

```typescript
interface WorkflowContract {
  preFlight: PreFlightValidation;
  allowedActions: ActionDefinition[];
  postFlight: PostFlightValidation;
  rollback: RollbackStrategy;
}

interface PreFlightValidation {
  requiredState: WorkflowState;
  requiredConditions: Condition[];
  environmentChecks: Check[];
}

interface PostFlightValidation {
  expectedState: WorkflowState;
  assertions: Assertion[];
  sideEffects: SideEffect[];
}
```

### 15.2 Workflow Step Contracts

#### Ship Workflow Contracts

```javascript
const SHIP_CONTRACTS = {
  // Step 1: Initialize Ship
  INIT: {
    preFlight: {
      requiredState: null, // Can start from any state
      requiredConditions: [
        { type: 'NO_ACTIVE_SESSION', branch: getCurrentBranch() },
        { type: 'GIT_REPO_EXISTS' },
        { type: 'HANSOLO_INITIALIZED' }
      ],
      environmentChecks: [
        { check: 'hasUncommittedChanges', capture: 'diff' },
        { check: 'currentBranch', capture: 'branch' },
        { check: 'remoteBranchExists', capture: 'hasRemote' }
      ]
    },
    allowedActions: [
      {
        action: 'CREATE_BRANCH',
        when: { branch: 'main' },
        requiredParams: ['branchName'],
        claudeGenerates: ['branchName'],
        validation: {
          branchName: /^(feat|fix|chore|docs)\/[a-z0-9-]+$/
        }
      },
      {
        action: 'USE_EXISTING_BRANCH',
        when: { branch: '!main', hasRemote: false },
        requiredParams: [],
        claudeGenerates: []
      }
    ],
    postFlight: {
      expectedState: 'BRANCH_READY',
      assertions: [
        { type: 'BRANCH_NOT_MAIN' },
        { type: 'SESSION_CREATED' },
        { type: 'CHANGES_PRESERVED' }
      ],
      sideEffects: ['sessionFile', 'branchCreated']
    }
  },

  // Step 2: Commit Changes
  BRANCH_READY: {
    preFlight: {
      requiredState: 'BRANCH_READY',
      requiredConditions: [
        { type: 'HAS_CHANGES', errorMsg: 'No changes to commit' }
      ],
      environmentChecks: [
        { check: 'getDiff', capture: 'diff', required: true }
      ]
    },
    allowedActions: [
      {
        action: 'COMMIT_CHANGES',
        requiredParams: ['commitMessage'],
        claudeGenerates: ['commitMessage'],
        validation: {
          commitMessage: {
            minLength: 10,
            maxLength: 100,
            pattern: /^(feat|fix|docs|style|refactor|test|chore|perf)(\(.+\))?: .+$/
          }
        },
        userChoice: {
          type: 'SELECT_OR_EDIT',
          options: 'CLAUDE_GENERATES_3',
          allowCustom: true
        }
      }
    ],
    postFlight: {
      expectedState: 'CHANGES_COMMITTED',
      assertions: [
        { type: 'COMMIT_EXISTS' },
        { type: 'NO_UNCOMMITTED_CHANGES' },
        { type: 'COMMIT_MESSAGE_VALID' }
      ],
      sideEffects: ['commitCreated']
    }
  },

  // Step 3: Push Branch
  CHANGES_COMMITTED: {
    preFlight: {
      requiredState: 'CHANGES_COMMITTED',
      requiredConditions: [
        { type: 'NETWORK_AVAILABLE' },
        { type: 'REMOTE_ACCESSIBLE' }
      ],
      environmentChecks: []
    },
    allowedActions: [
      {
        action: 'PUSH_BRANCH',
        requiredParams: [],
        claudeGenerates: [],
        validation: {}
      }
    ],
    postFlight: {
      expectedState: 'PUSHED',
      assertions: [
        { type: 'REMOTE_BRANCH_EXISTS' },
        { type: 'LOCAL_REMOTE_SYNC' }
      ],
      sideEffects: ['remoteBranchCreated']
    }
  },

  // Step 4: Create PR
  PUSHED: {
    preFlight: {
      requiredState: 'PUSHED',
      requiredConditions: [
        { type: 'NO_EXISTING_PR', branch: getCurrentBranch() },
        { type: 'API_CREDENTIALS' }
      ],
      environmentChecks: [
        { check: 'getCommits', capture: 'commits' },
        { check: 'getDiffSummary', capture: 'summary' }
      ]
    },
    allowedActions: [
      {
        action: 'CREATE_PR',
        requiredParams: ['title', 'description'],
        claudeGenerates: ['title', 'description'],
        validation: {
          title: {
            minLength: 10,
            maxLength: 100,
            required: true
          },
          description: {
            minLength: 50,
            maxLength: 5000,
            mustInclude: ['## Changes', '## Testing'],
            required: true
          }
        },
        userChoice: {
          type: 'REVIEW_AND_EDIT',
          allowRegenerate: true
        }
      }
    ],
    postFlight: {
      expectedState: 'PR_CREATED',
      assertions: [
        { type: 'PR_EXISTS' },
        { type: 'PR_NUMBER_CAPTURED' },
        { type: 'AUTO_MERGE_ATTEMPTED' }
      ],
      sideEffects: ['prCreated', 'autoMergeStatus']
    }
  },

  // Step 5: Wait for Requirements
  PR_CREATED: {
    preFlight: {
      requiredState: 'PR_CREATED',
      requiredConditions: [],
      environmentChecks: [
        { check: 'getPRStatus', capture: 'prStatus', required: true }
      ]
    },
    allowedActions: [
      {
        action: 'WAIT_FOR_REQUIREMENTS',
        when: { prStatus: { merged: false, requirementsMet: false } },
        requiredParams: [],
        claudeGenerates: ['userMessage'],
        validation: {
          userMessage: { type: 'informational' }
        }
      },
      {
        action: 'PROCEED_TO_MERGE',
        when: { prStatus: { merged: false, requirementsMet: true } },
        requiredParams: [],
        claudeGenerates: []
      },
      {
        action: 'CLEANUP',
        when: { prStatus: { merged: true } },
        requiredParams: [],
        claudeGenerates: []
      }
    ],
    postFlight: {
      expectedState: 'WAITING_APPROVAL|MERGING|CLEANUP',
      assertions: [
        { type: 'STATE_MATCHES_PR_STATUS' }
      ],
      sideEffects: []
    }
  }
};
```

### 15.3 Validation Implementation

```javascript
// lib/validation/contract-validator.js
class ContractValidator {
  async validatePreFlight(step, context) {
    const contract = CONTRACTS[context.workflow][step];
    if (!contract) {
      throw new Error(`No contract defined for ${context.workflow}.${step}`);
    }

    const { preFlight } = contract;
    
    // Validate state
    if (preFlight.requiredState && context.state !== preFlight.requiredState) {
      return {
        valid: false,
        error: `Invalid state. Expected ${preFlight.requiredState}, got ${context.state}`
      };
    }

    // Check required conditions
    for (const condition of preFlight.requiredConditions) {
      const result = await this.checkCondition(condition, context);
      if (!result.met) {
        return {
          valid: false,
          error: condition.errorMsg || `Condition not met: ${condition.type}`,
          details: result.details
        };
      }
    }

    // Run environment checks and capture data
    const captured = {};
    for (const check of preFlight.environmentChecks) {
      const result = await this.runCheck(check, context);
      if (check.required && !result.success) {
        return {
          valid: false,
          error: `Environment check failed: ${check.check}`
        };
      }
      if (check.capture) {
        captured[check.capture] = result.data;
      }
    }

    return {
      valid: true,
      captured,
      allowedActions: this.filterAllowedActions(contract.allowedActions, captured)
    };
  }

  async validatePostFlight(step, context, result) {
    const contract = CONTRACTS[context.workflow][step];
    const { postFlight } = contract;

    // Validate expected state
    if (result.state !== postFlight.expectedState && 
        !postFlight.expectedState.includes(result.state)) {
      return {
        valid: false,
        error: `Unexpected state. Expected ${postFlight.expectedState}, got ${result.state}`,
        rollback: true
      };
    }

    // Run assertions
    for (const assertion of postFlight.assertions) {
      const result = await this.runAssertion(assertion, context);
      if (!result.passed) {
        return {
          valid: false,
          error: `Assertion failed: ${assertion.type}`,
          details: result.details,
          rollback: true
        };
      }
    }

    // Verify side effects
    for (const effect of postFlight.sideEffects) {
      const exists = await this.verifySideEffect(effect, context);
      if (!exists) {
        return {
          valid: false,
          error: `Expected side effect not found: ${effect}`,
          rollback: true
        };
      }
    }

    return { valid: true };
  }

  filterAllowedActions(actions, capturedData) {
    return actions.filter(action => {
      if (!action.when) return true;
      
      for (const [key, value] of Object.entries(action.when)) {
        const actual = capturedData[key];
        
        if (typeof value === 'string' && value.startsWith('!')) {
          // Negation
          if (actual === value.slice(1)) return false;
        } else if (typeof value === 'object') {
          // Nested conditions
          for (const [subKey, subValue] of Object.entries(value)) {
            if (actual?.[subKey] !== subValue) return false;
          }
        } else {
          // Direct comparison
          if (actual !== value) return false;
        }
      }
      
      return true;
    });
  }
}
```

### 15.4 Claude Constraint System

```javascript
// lib/claude/constraint-enforcer.js
class ClaudeConstraintEnforcer {
  constructor(mcp) {
    this.mcp = mcp;
    this.validator = new ContractValidator();
  }

  async executeStep(sessionId, stepRequest) {
    const context = await this.mcp.getContext(sessionId);
    
    // 1. Pre-flight validation
    const preFlightResult = await this.validator.validatePreFlight(
      context.state,
      context
    );
    
    if (!preFlightResult.valid) {
      return {
        error: 'PRE_FLIGHT_FAILED',
        message: preFlightResult.error,
        instruction: 'Cannot proceed with this action'
      };
    }

    // 2. Constrain Claude's action to allowed options
    const allowedAction = preFlightResult.allowedActions.find(
      a => a.action === stepRequest.action
    );
    
    if (!allowedAction) {
      return {
        error: 'ACTION_NOT_ALLOWED',
        message: `Action ${stepRequest.action} is not allowed in current state`,
        allowedActions: preFlightResult.allowedActions.map(a => a.action),
        instruction: 'Choose from allowed actions only'
      };
    }

    // 3. Validate Claude's generated parameters
    if (allowedAction.claudeGenerates?.length > 0) {
      for (const param of allowedAction.claudeGenerates) {
        const value = stepRequest.params[param];
        const validation = allowedAction.validation[param];
        
        if (!this.validateParameter(value, validation)) {
          return {
            error: 'INVALID_PARAMETER',
            message: `Parameter ${param} does not meet requirements`,
            requirements: validation,
            instruction: 'Generate valid parameter value'
          };
        }
      }
    }

    // 4. Execute the action
    const result = await this.mcp.executeAction(
      sessionId,
      allowedAction.action,
      stepRequest.params
    );

    // 5. Post-flight validation
    const postFlightResult = await this.validator.validatePostFlight(
      context.state,
      { ...context, ...result },
      result
    );

    if (!postFlightResult.valid) {
      // Rollback if needed
      if (postFlightResult.rollback) {
        await this.mcp.rollback(sessionId, context.state);
      }
      
      return {
        error: 'POST_FLIGHT_FAILED',
        message: postFlightResult.error,
        instruction: 'Action failed validation, rolled back'
      };
    }

    return {
      success: true,
      state: result.state,
      nextActions: await this.getNextActions(sessionId, result.state),
      captured: result.data
    };
  }

  validateParameter(value, validation) {
    if (!validation) return true;
    
    if (validation.required && !value) return false;
    if (validation.minLength && value.length < validation.minLength) return false;
    if (validation.maxLength && value.length > validation.maxLength) return false;
    if (validation.pattern && !validation.pattern.test(value)) return false;
    if (validation.mustInclude) {
      for (const required of validation.mustInclude) {
        if (!value.includes(required)) return false;
      }
    }
    
    return true;
  }
}
```

### 15.5 Determinism Guarantees

#### State Machine Guarantees
1. **Single Valid Path**: Each state has exactly one valid transition path
2. **No Ambiguity**: Conditions uniquely determine the next action
3. **Rollback Safety**: Failed validations trigger automatic rollback
4. **Idempotency**: Repeated calls with same input produce same result

#### Claude Constraint Guarantees
1. **Limited Choices**: Claude can only choose from pre-validated actions
2. **Parameter Validation**: All Claude-generated content is validated
3. **No State Bypass**: Claude cannot skip or alter state transitions
4. **Deterministic Fallback**: If Claude fails, MCP provides default action

#### Example: Ship Command Consistency
```javascript
// Every time /hansolo:ship runs:
1. MCP checks current state → determines valid actions
2. Claude receives ONLY valid options
3. Claude's choice is validated before execution
4. Post-flight ensures expected outcome
5. Any failure rolls back to known state

// Result: Identical behavior regardless of Claude's reasoning
```

## 16. Implementation Plan

Since han-solo requires both MCP server and Claude Code integration, the development environment uses a multi-layered approach:

```
┌─────────────────────────────────────┐
│    Claude Code (Production)         │
│    - Real AI reasoning              │
│    - Actual user interactions       │
└─────────────────────────────────────┘
                 ↕
┌─────────────────────────────────────┐
│    Mock Claude Layer                │
│    - Simulated AI responses         │
│    - Scripted test scenarios        │
└─────────────────────────────────────┘
                 ↕
┌─────────────────────────────────────┐
│    MCP Server                       │
│    - State machine logic            │
│    - Git operations                 │
│    - Testable in isolation          │
└─────────────────────────────────────┘
```

### 14.2 Development Tools

#### MCP Inspector Setup
```javascript
// mcp-inspector-config.js
module.exports = {
  server: {
    command: 'node',
    args: ['./lib/mcp-server.js'],
    env: {
      HANSOLO_DEBUG: 'true',
      HANSOLO_TEST_MODE: 'true'
    }
  },
  testScenarios: [
    'init-new-project',
    'launch-feature',
    'ship-complete',
    'ship-with-reviews',
    'hotfix-emergency',
    'concurrent-sessions'
  ]
};
```

#### Mock Claude Interface
```javascript
// test/mock-claude.js
class MockClaude {
  constructor(scenario) {
    this.scenario = scenario;
    this.responses = loadScenarioResponses(scenario);
  }

  async processToolCall(tool, params) {
    // Simulate Claude's decision-making
    const response = this.responses[tool]?.[JSON.stringify(params)];
    if (!response) {
      throw new Error(`No mock response for ${tool} with params ${JSON.stringify(params)}`);
    }
    return response;
  }

  async generateUserPrompt(context) {
    // Simulate Claude's natural language generation
    return this.responses.prompts[context.state];
  }
}
```

### 14.3 Testing Strategy

#### Unit Tests (MCP Server)
```javascript
// test/unit/state-machine.test.js
describe('State Machine', () => {
  test('should enforce valid transitions', () => {
    const sm = new StateMachine();
    sm.setState('INIT');
    
    expect(() => sm.transition('BRANCH_READY')).not.toThrow();
    expect(() => sm.transition('COMPLETE')).toThrow('Invalid transition');
  });

  test('should maintain session persistence', async () => {
    const session = await createSession('ship');
    expect(session.id).toMatch(/^[a-f0-9]{8}$/);
    
    const restored = await getSession(session.id);
    expect(restored.state).toBe(session.state);
  });
});

// test/unit/git-operations.test.js
describe('Git Operations', () => {
  beforeEach(() => {
    setupTestRepo();
  });

  test('should create branch with uncommitted changes', async () => {
    await fs.writeFile('test.js', 'changes');
    const result = await createBranch('feat/test', { 
      handleUncommitted: 'move' 
    });
    
    expect(result.branch).toBe('feat/test');
    expect(await getCurrentBranch()).toBe('feat/test');
    expect(await getStatus()).toContain('test.js');
  });
});
```

#### Integration Tests (MCP + Mock Claude)
```javascript
// test/integration/workflows.test.js
describe('Ship Workflow', () => {
  let mcp, claude;
  
  beforeEach(async () => {
    mcp = await startMCPServer({ testMode: true });
    claude = new MockClaude('ship-standard');
  });

  test('complete ship workflow with auto-merge', async () => {
    // Initialize
    const init = await mcp.call('configure_workflow', { 
      mode: 'init',
      projectType: 'solo' 
    });
    expect(init.status).toBe('initialized');

    // Start ship workflow
    const start = await mcp.call('start_workflow', { type: 'ship' });
    expect(start.state).toBe('INIT');
    
    // Simulate Claude processing
    const branchDecision = await claude.processToolCall('execute_workflow_step', {
      sessionId: start.sessionId,
      action: 'CREATE_BRANCH',
      branchName: await claude.generateBranchName(start.diff)
    });
    
    expect(branchDecision.state).toBe('BRANCH_READY');
    
    // Continue through states
    const steps = [
      'COMMIT_CHANGES',
      'PUSH_BRANCH',
      'CREATE_PR',
      'ENABLE_AUTO_MERGE',
      'WAIT_FOR_CHECKS',
      'CLEANUP'
    ];
    
    for (const step of steps) {
      const result = await executeStep(mcp, claude, start.sessionId, step);
      expect(result.error).toBeUndefined();
    }
    
    expect(await getCurrentBranch()).toBe('main');
    expect(await mcp.call('get_sessions_status')).toMatchObject({
      sessions: expect.arrayContaining([
        expect.objectContaining({
          id: start.sessionId,
          state: 'COMPLETE'
        })
      ])
    });
  });
});
```

#### End-to-End Tests (Real Claude Sandbox)
```javascript
// test/e2e/claude-integration.test.js
describe('Claude Integration E2E', () => {
  test('init command flow', async () => {
    // Use Claude Code test harness
    const claude = await ClaudeTestHarness.create({
      commands: ['@hansolo/cli'],
      testRepo: './test-repos/empty'
    });
    
    // Simulate user command
    const response = await claude.sendCommand('/hansolo:init');
    
    // Verify Claude's response
    expect(response).toContain('No Git repository detected');
    expect(response).toContain('[g]ithub');
    
    // Simulate user choice
    const github = await claude.sendResponse('g');
    expect(github).toContain('Repository name');
    
    // Continue flow...
    const visibility = await claude.sendResponse('r');
    expect(visibility).toContain('[s]olo');
    
    // Verify final state
    expect(await fs.exists('./hansolo.yaml')).toBe(true);
    expect(await fs.exists('./.git')).toBe(true);
  });
});
```

### 14.4 Test Scenarios

#### Core Workflow Scenarios
1. **Init Scenarios**
   - New project without Git
   - Existing Git without remote
   - Existing project with remote
   - Failed GitHub API calls
   - Network interruptions

2. **Ship Scenarios**
   - Clean ship with auto-merge
   - Ship requiring reviews
   - Ship with CI failures
   - Ship with merge conflicts
   - Concurrent ship sessions

3. **Error Scenarios**
   - Network failures
   - Git operation failures
   - API rate limits
   - Malformed responses
   - State corruption recovery

#### Test Data Generator
```javascript
// test/fixtures/scenario-generator.js
class ScenarioGenerator {
  static generateDiff(type = 'feature') {
    const diffs = {
      feature: `
+function authenticate(user, password) {
+  return jwt.sign({ user }, secret);
+}`,
      bugfix: `
-if (user = null) {
+if (user === null) {`,
      refactor: `
-function oldName() {
+function newName() {`
    };
    return diffs[type];
  }
  
  static generatePRResponse(options = {}) {
    return {
      number: options.number || 123,
      state: options.state || 'open',
      mergeable: options.mergeable ?? true,
      auto_merge: options.autoMerge || null,
      reviews: {
        approved: options.approved || 0,
        required: options.required || 0
      }
    };
  }
}
```

### 14.5 Debugging Strategy

#### Debug Mode Configuration
```javascript
// lib/debug-config.js
module.exports = {
  levels: {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
    TRACE: 4
  },
  
  categories: {
    STATE_MACHINE: true,
    GIT_OPS: true,
    API_CALLS: true,
    SESSION: true,
    CLAUDE_COMM: true
  },
  
  output: {
    console: true,
    file: './debug.log',
    structured: true // JSON format for parsing
  }
};

// Usage in MCP server
debug('STATE_MACHINE', 'Transition', { 
  from: currentState, 
  to: nextState, 
  session: sessionId 
});
```

#### Development Commands
```bash
# Run MCP server in debug mode
npm run dev:mcp -- --debug=all

# Run with specific debug categories
npm run dev:mcp -- --debug=STATE_MACHINE,GIT_OPS

# Run with MCP Inspector
npm run dev:inspector

# Run specific test scenario
npm test -- --scenario=ship-with-conflicts

# Generate test fixtures
npm run test:fixtures -- --type=pr-responses

# Validate state machine
npm run validate:states
```

### 14.6 Continuous Integration Pipeline

```yaml
# .github/workflows/test.yml
name: han-solo CI

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:unit
      
  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:integration
      
  state-machine-validation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm run validate:states
      - run: npm run validate:transitions
      
  mock-claude-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        scenario: [init, launch, ship, hotfix]
    steps:
      - uses: actions/checkout@v3
      - run: npm run test:mock -- --scenario=${{ matrix.scenario }}
```

### 14.7 Performance Testing

```javascript
// test/performance/load-test.js
describe('Performance Tests', () => {
  test('handle 100 concurrent sessions', async () => {
    const sessions = [];
    const startTime = Date.now();
    
    // Create 100 sessions
    for (let i = 0; i < 100; i++) {
      sessions.push(mcp.call('start_workflow', { type: 'ship' }));
    }
    
    await Promise.all(sessions);
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(5000); // Under 5 seconds
    
    const status = await mcp.call('get_sessions_status');
    expect(status.sessions).toHaveLength(100);
  });
  
  test('state transitions under 100ms', async () => {
    const session = await mcp.call('start_workflow', { type: 'ship' });
    
    const start = Date.now();
    await mcp.call('execute_workflow_step', {
      sessionId: session.sessionId,
      action: 'CREATE_BRANCH'
    });
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(100);
  });
});
```

## 15. Implementation Plan

### 13.1 Development Phases

#### Phase 1: Core (Weeks 1-6)
- MCP server state machine
- Basic commands (launch, ship)
- Session management
- Git operations
- Claude Code integration

#### Phase 2: Enhancement (Weeks 7-10)
- Hotfix workflow
- Conflict resolution
- Pre-merge rebasing
- Concurrent sessions
- Abort mechanism

#### Phase 3: Polish (Weeks 11-14)
- Configuration system
- Hook installation
- Error recovery
- Performance optimization
- Documentation

#### Phase 4: Launch (Weeks 15-16)
- Beta testing
- Bug fixes
- Documentation completion
- Training materials
- Launch preparation

### 13.2 Resource Requirements
| Role | Allocation | Duration |
|------|------------|----------|
| Senior Engineers | 2 FTE | 16 weeks |
| DevOps Engineer | 0.5 FTE | 16 weeks |
| Technical Writer | 0.25 FTE | 8 weeks |
| QA Engineer | 0.5 FTE | 8 weeks |

### 13.3 Budget
| Category | Cost | Notes |
|----------|------|-------|
| Development | $120,000 | Salaries |
| Infrastructure | $6,000 | Cloud resources |
| Claude API | $24,000 | Annual subscription |
| Documentation | $15,000 | Tools and contract work |
| **Total Year 1** | **$165,000** | |

### 13.4 ROI Calculation
- **Time saved**: 4 hours/week/developer
- **Hourly rate**: $100/hour
- **Team size**: 50 developers
- **Annual savings**: $1,040,000
- **ROI**: 530% Year 1
- **Payback period**: 2 months

## Appendix A: Git Hook Implementations

### pre-commit.sh
```bash
#!/bin/bash
# han-solo pre-commit hook
# Prevents accidental commits to main branch and enforces workflow

set -e

# Get current branch
BRANCH=$(git symbolic-ref HEAD 2>/dev/null | sed -e 's|^refs/heads/||')

# Check if we're on main/master
if [[ "$BRANCH" == "main" ]] || [[ "$BRANCH" == "master" ]]; then
  # Check if we're in a han-solo workflow
  if [[ -f ".hansolo/sessions/active" ]]; then
    # Check if the active session allows main commits (hotfix workflow)
    SESSION_TYPE=$(cat .hansolo/sessions/active | grep "type" | cut -d: -f2)
    if [[ "$SESSION_TYPE" == "hotfix" ]]; then
      echo "✅ han-solo hotfix workflow - allowing main branch commit"
      exit 0
    fi
  fi
  
  # Check for override environment variable
  if [[ "$HANSOLO_ALLOW_COMMIT" == "true" ]]; then
    echo "✅ HANSOLO_ALLOW_COMMIT=true - allowing commit"
    exit 0
  fi
  
  # Block the commit
  echo "❌ Direct commits to main branch are not allowed!"
  echo ""
  echo "Please use han-solo workflows:"
  echo "  /hansolo:launch - Start a new feature"
  echo "  /hansolo:ship - Ship your changes"
  echo "  /hansolo:hotfix - Emergency fix"
  echo ""
  echo "To override (not recommended):"
  echo "  HANSOLO_ALLOW_COMMIT=true git commit ..."
  exit 1
fi

# Check commit message format
COMMIT_MSG_FILE=$1
COMMIT_MSG=$(cat "$COMMIT_MSG_FILE")

# Validate commit message format (conventional commits)
PATTERN="^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?: .{1,100}"
if ! echo "$COMMIT_MSG" | grep -qE "$PATTERN"; then
  echo "⚠️  Commit message doesn't follow conventional format:"
  echo "  <type>(<scope>): <subject>"
  echo ""
  echo "Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert"
  echo ""
  echo "Example: feat(auth): add JWT authentication"
  # Warning only, don't block
fi

exit 0
```

### pre-push.sh
```bash
#!/bin/bash
# han-solo pre-push hook
# Prevents accidental pushes to main branch and enforces workflow

set -e

# Get the remote and branch being pushed
while read local_ref local_sha remote_ref remote_sha; do
  # Extract branch name from ref
  BRANCH=$(echo "$remote_ref" | sed 's|refs/heads/||')
  
  # Check if pushing to main/master
  if [[ "$BRANCH" == "main" ]] || [[ "$BRANCH" == "master" ]]; then
    # Check if we're in a han-solo workflow
    if [[ -f ".hansolo/sessions/active" ]]; then
      SESSION_TYPE=$(cat .hansolo/sessions/active | grep "type" | cut -d: -f2)
      if [[ "$SESSION_TYPE" == "hotfix" ]]; then
        echo "✅ han-solo hotfix workflow - allowing push to main"
        continue
      fi
    fi
    
    # Check for override environment variable
    if [[ "$HANSOLO_ALLOW_PUSH" == "true" ]]; then
      echo "✅ HANSOLO_ALLOW_PUSH=true - allowing push"
      continue
    fi
    
    # Block the push
    echo "❌ Direct pushes to main branch are not allowed!"
    echo ""
    echo "Please use han-solo workflows:"
    echo "  /hansolo:ship - Complete shipping workflow"
    echo "  /hansolo:hotfix - Emergency production fix"
    echo ""
    echo "To override (not recommended):"
    echo "  HANSOLO_ALLOW_PUSH=true git push ..."
    exit 1
  fi
  
  # Check if branch exists on remote (prevent force push)
  REMOTE=$(git config branch."$(git symbolic-ref --short HEAD)".remote || echo origin)
  if git ls-remote --heads "$REMOTE" | grep -q "$remote_ref"; then
    # Branch exists remotely, check for force push
    MERGE_BASE=$(git merge-base "$remote_sha" "$local_sha" 2>/dev/null || true)
    if [[ "$MERGE_BASE" != "$remote_sha" ]] && [[ -n "$remote_sha" ]] && [[ "$remote_sha" != "0000000000000000000000000000000000000000" ]]; then
      echo "⚠️  Force push detected!"
      echo "This will rewrite history on the remote branch."
      echo ""
      read -p "Are you sure you want to force push? (y/N) " -n 1 -r
      echo
      if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Push cancelled."
        exit 1
      fi
    fi
  fi
done

# Additional safety checks
CURRENT_BRANCH=$(git symbolic-ref --short HEAD)

# Warn if pushing a branch that's behind remote
REMOTE=$(git config branch."$CURRENT_BRANCH".remote || echo origin)
if git fetch "$REMOTE" "$CURRENT_BRANCH" 2>/dev/null; then
  BEHIND=$(git rev-list --count HEAD.."$REMOTE/$CURRENT_BRANCH" 2>/dev/null || echo 0)
  if [[ "$BEHIND" -gt 0 ]]; then
    echo "⚠️  Your branch is $BEHIND commits behind $REMOTE/$CURRENT_BRANCH"
    echo "Consider pulling first: git pull --rebase"
    read -p "Continue with push anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "Push cancelled."
      exit 1
    fi
  fi
fi

exit 0
```

### Hook Installation

These hooks are installed in two ways:

1. **Via npm installer**: Copied to `.hansolo/hooks/` and referenced in Claude settings
2. **Via /hansolo:init**: Installed directly to `.git/hooks/` in the project

The hooks provide multiple safety mechanisms:
- **Branch protection**: Prevent direct commits/pushes to main
- **Workflow integration**: Allow operations when part of han-solo workflows
- **Override capability**: Environment variables for emergency bypass
- **Force push protection**: Warn before rewriting remote history
- **Commit message validation**: Encourage conventional commit format
- **Sync warnings**: Alert when branch is behind remote

## Appendix B: install-cli.js Implementation

```javascript
#!/usr/bin/env node

/**
 * Han-Solo CLI Installer
 * Installs han-solo components to .hansolo directory
 * Configures Claude settings to reference components
 */

const inquirer = require('inquirer');
const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const ora = require('ora');
const boxen = require('boxen');
const { execSync } = require('child_process');
const os = require('os');

const REPO_URL = 'https://github.com/hansolo/cli';

const COMPONENTS = {
  status_lines: {
    name: 'Status Lines',
    description: 'Terminal awareness displays (full and minimal)',
    files: ['han-solo.sh', 'han-solo-minimal.sh'],
    path: 'files/status_lines',
    selected: true
  },
  hooks: {
    name: 'Git Safety Hooks',
    description: 'Pre-commit and pre-push protection',
    files: ['pre-commit.sh', 'pre-push.sh'],
    path: 'files/hooks',
    selected: true
  },
  templates: {
    name: 'Git Templates',
    description: 'Commit message and PR templates',
    files: ['commit-message.txt', 'pull-request.md'],
    path: 'files/templates',
    selected: false
  }
};

const PROFILES = {
  solo: {
    name: 'Solo Developer',
    description: 'Full suite for independent development',
    components: ['status_lines', 'hooks']
  },
  team: {
    name: 'Team Workflow',
    description: 'Collaborative development tools',
    components: ['status_lines', 'hooks', 'templates']
  },
  minimal: {
    name: 'Minimal',
    description: 'Essential features only',
    components: ['hooks']
  },
  custom: {
    name: 'Custom',
    description: 'Choose your own components',
    components: []
  }
};

class HanSoloInstaller {
  constructor() {
    this.state = {
      scope: 'project',
      profile: 'solo',
      selectedComponents: [],
      installPath: '',
      sourceDir: ''
    };
  }

  async run() {
    try {
      // Check if already installed (for npx case)
      if (await this.checkExistingInstallation()) {
        console.log(chalk.green('✓ Han-Solo components already installed'));
        process.exit(0);
      }

      await this.showWelcome();
      await this.findSourceDirectory();
      await this.promptInstallation();
      await this.performInstallation();
      await this.configureClaudeSettings();
      this.showSuccess();
    } catch (error) {
      console.error(chalk.red('\n✗ Installation failed:'), error.message);
      process.exit(1);
    }
  }

  async checkExistingInstallation() {
    // For npx, check if components already exist
    const isNpx = process.env.npm_config_user_agent?.includes('npx');
    const isTempDir = __dirname.includes('_npx') || __dirname.includes('_cacache');
    
    if (isNpx || isTempDir) {
      const userInstall = path.join(os.homedir(), '.hansolo');
      const projectInstall = path.join(process.cwd(), '.hansolo');
      
      if (await fs.pathExists(userInstall)) {
        console.log(chalk.cyan('Found existing user-level installation'));
        return true;
      }
      if (await fs.pathExists(projectInstall)) {
        console.log(chalk.cyan('Found existing project-level installation'));
        return true;
      }
    }
    return false;
  }

  async findSourceDirectory() {
    const spinner = ora('Locating installation files...').start();
    
    // Check for bundled files (npm package)
    const bundledPath = path.join(__dirname, '..', 'files');
    if (await fs.pathExists(bundledPath)) {
      this.state.sourceDir = path.join(__dirname, '..');
      spinner.succeed('Found installation files');
      return;
    }

    // Fallback: download from GitHub
    spinner.text = 'Downloading from GitHub...';
    const tempDir = path.join(os.tmpdir(), 'hansolo-install-' + Date.now());
    
    try {
      await fs.ensureDir(tempDir);
      execSync(`git clone --depth 1 ${REPO_URL} ${tempDir}`, { 
        stdio: 'ignore' 
      });
      this.state.sourceDir = tempDir;
      spinner.succeed('Downloaded installation files');
    } catch (error) {
      spinner.fail('Failed to download files');
      throw new Error('Could not download han-solo files');
    }
  }

  async promptInstallation() {
    // Detect installation context
    const isGlobalInstall = process.argv.includes('-g') || 
                           __dirname.includes('npm/node_modules');
    const isNpx = process.env.npm_config_user_agent?.includes('npx');
    
    // Set default scope based on context
    const defaultScope = (isGlobalInstall || isNpx) ? 'global' : 'project';
    
    // Scope selection
    const { scope } = await inquirer.prompt([
      {
        type: 'list',
        name: 'scope',
        message: 'Where would you like to install han-solo components?',
        choices: [
          {
            name: 'User (~/.hansolo - available in all projects)',
            value: 'global',
            short: 'User'
          },
          {
            name: 'Project (./.hansolo - this project only)',
            value: 'project',
            short: 'Project'
          }
        ],
        default: defaultScope
      }
    ]);
    this.state.scope = scope;

    // Profile selection
    const { profile } = await inquirer.prompt([
      {
        type: 'list',
        name: 'profile',
        message: 'Select installation profile:',
        choices: Object.entries(PROFILES).map(([key, prof]) => ({
          name: `${chalk.yellow(prof.name)} - ${chalk.gray(prof.description)}`,
          value: key,
          short: prof.name
        })),
        default: 'solo'
      }
    ]);
    this.state.profile = profile;

    // Component selection for custom profile
    if (profile === 'custom') {
      const { components } = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'components',
          message: 'Select components to install:',
          choices: Object.entries(COMPONENTS).map(([key, comp]) => ({
            name: `${comp.name} - ${chalk.gray(comp.description)}`,
            value: key,
            checked: comp.selected
          }))
        }
      ]);
      this.state.selectedComponents = components;
    } else {
      this.state.selectedComponents = PROFILES[profile].components;
    }

    // Set install path
    this.state.installPath = this.state.scope === 'global'
      ? path.join(os.homedir(), '.hansolo')
      : path.join(process.cwd(), '.hansolo');
  }

  async performInstallation() {
    const spinner = ora('Installing han-solo components...').start();

    try {
      // Create han-solo directory
      await fs.ensureDir(this.state.installPath);

      // Copy each component
      for (const componentKey of this.state.selectedComponents) {
        const component = COMPONENTS[componentKey];
        spinner.text = `Installing ${component.name}...`;
        
        const srcPath = path.join(this.state.sourceDir, component.path);
        const destPath = path.join(this.state.installPath, componentKey);
        
        if (await fs.pathExists(srcPath)) {
          await fs.copy(srcPath, destPath, { overwrite: true });
          
          // Make scripts executable
          for (const file of component.files) {
            if (file.endsWith('.sh')) {
              const filePath = path.join(destPath, file);
              if (await fs.pathExists(filePath)) {
                await fs.chmod(filePath, 0o755);
              }
            }
          }
        }
      }

      spinner.succeed('Components installed');
    } catch (error) {
      spinner.fail('Installation failed');
      throw error;
    }
  }

  async configureClaudeSettings() {
    const spinner = ora('Configuring Claude settings...').start();

    try {
      // Determine Claude settings path (always in .claude directory)
      const settingsDir = this.state.scope === 'global'
        ? path.join(os.homedir(), '.claude')
        : path.join(process.cwd(), '.claude');
      
      await fs.ensureDir(settingsDir);
      const settingsPath = path.join(settingsDir, 'settings.local.json');

      // Load or create settings
      let settings = {};
      if (await fs.pathExists(settingsPath)) {
        const content = await fs.readFile(settingsPath, 'utf8');
        try {
          settings = JSON.parse(content);
        } catch (e) {
          settings = {};
        }
      }

      // Configure status line
      if (this.state.selectedComponents.includes('status_lines')) {
        const statusLinePath = path.join(
          this.state.installPath,
          'status_lines',
          'han-solo.sh'
        );
        
        settings.statusLine = {
          type: 'command',
          command: statusLinePath.replace(/\\/g, '/'),
          padding: 0
        };
      }

      // Configure hooks
      if (this.state.selectedComponents.includes('hooks')) {
        if (!settings.hooks) settings.hooks = {};
        if (!settings.hooks.PreToolUse) settings.hooks.PreToolUse = [];

        const hookConfigs = [
          {
            matcher: 'Bash',
            description: 'han-solo pre-commit validation',
            hooks: [{
              type: 'command',
              command: path.join(this.state.installPath, 'hooks', 'pre-commit.sh')
                .replace(/\\/g, '/'),
              timeout: 60
            }]
          },
          {
            matcher: 'Bash',
            description: 'han-solo pre-push validation',
            hooks: [{
              type: 'command',
              command: path.join(this.state.installPath, 'hooks', 'pre-push.sh')
                .replace(/\\/g, '/'),
              timeout: 60
            }]
          }
        ];

        // Update or add hook configurations
        for (const config of hookConfigs) {
          const existingIndex = settings.hooks.PreToolUse.findIndex(
            h => h.description === config.description
          );
          
          if (existingIndex >= 0) {
            settings.hooks.PreToolUse[existingIndex] = config;
          } else {
            settings.hooks.PreToolUse.push(config);
          }
        }
      }

      // Write settings
      await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
      spinner.succeed('Claude settings configured');
    } catch (error) {
      spinner.fail('Settings configuration failed');
      throw error;
    }
  }

  showSuccess() {
    const successBox = boxen(
      chalk.green.bold('✓ Installation Complete!\n\n') +
      'han-solo components installed to:\n' +
      chalk.cyan(this.state.installPath) + '\n\n' +
      'Claude settings configured at:\n' +
      chalk.cyan(this.state.scope === 'global' 
        ? '~/.claude/settings.local.json'
        : './.claude/settings.local.json') + '\n\n' +
      chalk.yellow.bold('Next Steps:\n') +
      '1. Restart Claude Code or reload window\n' +
      '2. Run ' + chalk.cyan('/hansolo:init') + ' in your project\n' +
      '3. Run ' + chalk.cyan('/hansolo:status-line help') + ' for status options\n\n' +
      chalk.green('Happy shipping! 🚀'),
      {
        padding: 1,
        borderStyle: 'double',
        borderColor: 'green'
      }
    );
    
    console.log(successBox);
  }
}

// Run installer
if (require.main === module) {
  const installer = new HanSoloInstaller();
  installer.run();
}

module.exports = HanSoloInstaller;
```

## Appendix B: Glossary
- **MCP**: Model Context Protocol
- **Session**: Active workflow instance
- **Linear History**: No merge commits
- **State Machine**: Deterministic workflow control
- **Rebase**: Update branch with main changes

## Appendix C: References
- [han-solo Constitution](./constitution.md)
- [Git Documentation](https://git-scm.com/doc)
- [Claude Code Docs](https://claude.ai/docs)
- [GitHub API](https://docs.github.com/api)

## Appendix D: Change Log
| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | 2025-09-21 | Complete reorganization |
| 1.0.0 | 2025-09-20 | Initial draft |

---

**Status**: Ready for Technical Review  
**Owner**: [Engineering Team]  
**Next Review**: September 28, 2025