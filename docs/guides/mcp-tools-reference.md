# devsolo MCP Tools Reference

Complete reference for all devsolo MCP tools in v2.0.0.

## Overview

devsolo exposes 11 MCP tools for Git workflow automation via Claude Code. Each tool provides:
- **Structured JSON results** for programmatic handling
- **Pre-flight checks** to validate prerequisites
- **Post-flight verifications** to confirm success
- **Detailed error messages** for troubleshooting

## Tool Categories

| Category | Tools | Purpose |
|----------|-------|---------|
| **Setup** | `devsolo_init` | Initialize devsolo in project (includes status line setup) |
| **Workflow** | `devsolo_launch`, `devsolo_commit`, `devsolo_ship` | Core development cycle |
| **Emergency** | `devsolo_hotfix` | Production hotfixes |
| **Management** | `devsolo_sessions`, `devsolo_swap`, `devsolo_abort` | Session management |
| **Info** | `devsolo_status` | Current state inspection |
| **Maintenance** | `devsolo_cleanup` | Clean up old sessions/branches |

## Common Result Types

### SessionToolResult
```typescript
{
  success: boolean;                    // Overall success
  branchName?: string;                 // Current/target branch
  state?: string;                      // Workflow state
  preFlightChecks?: CheckResult[];     // Pre-flight check results
  postFlightVerifications?: CheckResult[]; // Post-flight verification results
  errors?: string[];                   // Error messages
  warnings?: string[];                 // Warning messages
  nextSteps?: string[];                // Suggested next actions
}
```

### GitHubToolResult
```typescript
{
  success: boolean;
  prNumber?: number;                   // Pull request number
  prUrl?: string;                      // Pull request URL
  merged?: boolean;                    // Whether PR was merged
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
  data: Record<string, unknown>;       // Tool-specific data
  message?: string;                    // Summary message
  errors?: string[];
  warnings?: string[];
}
```

### CheckResult
```typescript
{
  name: string;                        // Check name
  passed: boolean;                     // Whether check passed
  message: string;                     // Result message
  severity: 'error' | 'warning' | 'info';
  details?: {
    expected?: any;
    actual?: any;
    suggestion?: string;
  };
}
```

---

## Tool Reference

### 1. devsolo_init

Initialize devsolo in your project.

**Purpose**: Creates `.devsolo` directory, configuration, and session storage.

#### Input Parameters
```typescript
{
  scope?: 'project' | 'user';        // Installation scope (default: 'project')
  force?: boolean;                   // Force reinitialization (default: false)
}
```

#### Returns
`BaseToolResult` with success status and any errors.

#### Pre-flight Checks
None (initialization is the first step)

#### Post-flight Verifications
- Configuration directory created
- Config file exists
- Session storage created

#### Usage Examples

**Natural language**:
```
Initialize devsolo in this project
Set up devsolo with user-level configuration
```

**Direct invocation**:
```
Use devsolo_init
Use devsolo_init with scope "user" and force true
```

#### Common Errors
- Directory already exists (use `force: true` to override)
- No write permissions in directory
- Invalid project structure

---

### 2. devsolo_launch

Start a new feature workflow.

**Purpose**: Creates feature branch, initializes workflow session, optionally stashes/restores work.

#### Input Parameters
```typescript
{
  branchName?: string;               // Branch name (auto-generated if omitted)
  description?: string;              // Feature description
  force?: boolean;                   // Force launch with uncommitted changes
  stashRef?: string;                 // Git stash reference to restore
  popStash?: boolean;                // Whether to pop stash (default: true if stashRef provided)
}
```

#### Returns
`SessionToolResult` with branch name, state, and validation results.

#### Pre-flight Checks
- On main/master branch
- Working directory clean (unless force/stash)
- Main branch up to date
- No existing session
- Branch name available

#### Post-flight Verifications
- Session created
- Feature branch created
- Branch checked out
- Session state correct (BRANCH_READY)
- No uncommitted changes (unless stash restored)

#### Usage Examples

**Natural language**:
```
Start a new feature for user authentication
Launch a feature branch called feature/oauth-integration
Create a new branch with description "Add payment processing"
```

**Direct invocation**:
```
Use devsolo_launch
Use devsolo_launch with branchName "feature/auth"
Use devsolo_launch with description "OAuth implementation"
Use devsolo_launch with branchName "feature/payments" and description "Stripe integration"
```

#### Common Errors
- Not on main branch
- Uncommitted changes (use `force: true` or commit first)
- Branch name already exists
- Active session exists (abort it first)

---

### 3. devsolo_commit

Commit changes to the current feature branch.

**Purpose**: Stage and commit changes with a message.

#### Input Parameters
```typescript
{
  message: string;                   // Commit message (required)
  stagedOnly?: boolean;              // Only commit staged files (default: false)
}
```

#### Returns
`SessionToolResult` with commit details and state.

#### Pre-flight Checks
- Active session exists
- On feature branch
- Has uncommitted changes

#### Post-flight Verifications
- Changes committed
- Working directory clean (if not stagedOnly)
- Session state updated (CHANGES_COMMITTED)

#### Usage Examples

**Natural language**:
```
Commit these changes with message "feat: add user authentication"
Commit only staged files with message "fix: resolve login bug"
```

**Direct invocation**:
```
Use devsolo_commit with message "feat: add feature"
Use devsolo_commit with message "fix: bug fix" and stagedOnly true
```

#### Common Errors
- No active session
- Not on feature branch
- No changes to commit
- Invalid commit message format

---

### 4. devsolo_ship

Complete workflow: push, create PR, wait for CI, merge, cleanup.

**Purpose**: Full automation from commit to merged PR.

#### Input Parameters
```typescript
{
  message?: string;                  // Commit message if uncommitted changes exist
  push?: boolean;                    // Push to remote (default: true)
  createPR?: boolean;                // Create pull request (default: true)
  merge?: boolean;                   // Auto-merge after CI (default: true)
  prDescription?: string;            // PR description (required for new PRs)
  force?: boolean;                   // Override pre-flight failures
  yes?: boolean;                     // Skip confirmations
  stagedOnly?: boolean;              // Only commit staged files (default: false)
}
```

#### Returns
`GitHubToolResult` with PR number, URL, and merge status.

#### Pre-flight Checks
- Session exists
- On feature branch (not main)
- Has commits to ship (ahead of main)
- No merge conflicts with main

#### Post-flight Verifications
- Branch merged to main
- Feature branch deleted
- Session closed (COMPLETE state)

#### Usage Examples

**Natural language**:
```
Ship this feature
Ship my changes with PR description "Add authentication system"
Push and create PR but don't merge yet
```

**Direct invocation**:
```
Use devsolo_ship with prDescription "Add new feature"
Use devsolo_ship with prDescription "Bug fix" and merge false
Use devsolo_ship with force true (override checks)
```

#### What It Does
1. Pushes branch to remote
2. Creates or updates pull request
3. Waits for CI checks (20 minute timeout, 30s poll interval)
4. Merges PR with squash
5. Syncs local main branch
6. Deletes local and remote feature branches
7. Marks session as complete

#### Common Errors
- No active session
- No commits to ship (branch up to date with main)
- Merge conflicts exist
- PR description missing for new PR
- CI checks failed
- CI checks timeout (20 minutes)

---

### 5. devsolo_hotfix

Create emergency production hotfix workflow.

**Purpose**: Fast-track critical fixes with optional review/test skipping.

#### Input Parameters
```typescript
{
  issue: string;                     // Issue number or description (required)
  severity?: 'critical' | 'high' | 'medium'; // Severity level
  skipTests?: boolean;               // Skip running tests
  skipReview?: boolean;              // Skip code review
  autoMerge?: boolean;               // Auto-merge when checks pass
  force?: boolean;                   // Force operations
  yes?: boolean;                     // Skip confirmations
}
```

#### Returns
`SessionToolResult` with hotfix branch and session details.

#### Pre-flight Checks
- On main/master branch
- Working directory clean
- No active session

#### Post-flight Verifications
- Hotfix branch created (hotfix/issue-name)
- Session created with hotfix type
- Branch checked out

#### Usage Examples

**Natural language**:
```
Create a hotfix for critical security vulnerability CVE-2024-1234
Start an emergency hotfix for production bug #456
Create high-severity hotfix for payment processing failure
```

**Direct invocation**:
```
Use devsolo_hotfix with issue "CVE-2024-1234" and severity "critical"
Use devsolo_hotfix with issue "Bug #456" and skipTests true
```

#### Common Errors
- Not on main branch
- Active session exists
- Issue description missing

---

### 6. devsolo_sessions

List and manage workflow sessions.

**Purpose**: View active/completed sessions, optionally clean up expired ones.

#### Input Parameters
```typescript
{
  all?: boolean;                     // Show all sessions including completed
  cleanup?: boolean;                 // Remove expired sessions
  verbose?: boolean;                 // Detailed session information
}
```

#### Returns
`QueryToolResult` with session list and count.

#### Data Format
```typescript
{
  count: number;
  sessions: [
    {
      id: string;
      branchName: string;
      state: string;
      workflowType: string;
      createdAt: string;
      isActive: boolean;
      metadata?: object;           // if verbose
      stateHistory?: object[];     // if verbose
    }
  ]
}
```

#### Usage Examples

**Natural language**:
```
Show me all active sessions
List all sessions including completed ones
Show detailed session information
Clean up old expired sessions
```

**Direct invocation**:
```
Use devsolo_sessions
Use devsolo_sessions with all true
Use devsolo_sessions with verbose true
Use devsolo_sessions with cleanup true
```

#### Common Errors
- No sessions found
- Cleanup failed (permission issues)

---

### 7. devsolo_swap

Switch between workflow sessions/branches.

**Purpose**: Context switch between multiple concurrent features.

#### Input Parameters
```typescript
{
  branchName: string;                // Branch to swap to (required)
  stash?: boolean;                   // Stash changes before swapping
  force?: boolean;                   // Force swap with uncommitted changes
}
```

#### Returns
`SessionToolResult` with new branch details and swap status.

#### Pre-flight Checks
- Target branch exists
- No uncommitted changes (unless stash/force)
- Valid session for target branch (if applicable)

#### Post-flight Verifications
- Branch checked out
- Session activated (if exists)
- Stash applied (if applicable)

#### Usage Examples

**Natural language**:
```
Switch to the feature/auth branch
Switch to main branch and stash my changes
Go back to the feature/dashboard branch
```

**Direct invocation**:
```
Use devsolo_swap with branchName "feature/auth"
Use devsolo_swap with branchName "main" and stash true
Use devsolo_swap with branchName "feature/test" and force true
```

#### Common Errors
- Branch doesn't exist
- Uncommitted changes (use stash or force)
- Invalid target branch

---

### 8. devsolo_abort

Cancel an active workflow session.

**Purpose**: Abort feature development, optionally delete branch.

#### Input Parameters
```typescript
{
  branchName?: string;               // Branch to abort (current if omitted)
  deleteBranch?: boolean;            // Delete branch after abort
  force?: boolean;                   // Force abort
  yes?: boolean;                     // Skip confirmations
}
```

#### Returns
`SessionToolResult` with abort status.

#### Pre-flight Checks
- Session exists
- On feature branch (if branchName omitted)

#### Post-flight Verifications
- Session marked ABORTED
- Branch deleted (if deleteBranch true)
- Switched to main (if deleteBranch true)

#### Usage Examples

**Natural language**:
```
Abort the current workflow
Abort feature/test branch and delete it
Cancel my current work and clean up
```

**Direct invocation**:
```
Use devsolo_abort
Use devsolo_abort with deleteBranch true
Use devsolo_abort with branchName "feature/test" and deleteBranch true
```

#### Common Errors
- No active session
- Branch doesn't exist
- Can't delete current branch without deleteBranch flag

---

### 9. devsolo_status

Show current workflow status.

**Purpose**: Inspect current branch, session, and git status.

#### Input Parameters
None required.

#### Returns
`QueryToolResult` with comprehensive status information.

#### Data Format
```typescript
{
  currentBranch: string;
  hasSession: boolean;
  gitStatus: {
    staged: number;
    unstaged: number;
    untracked: number;
  };
  session?: {
    id: string;
    branchName: string;
    state: string;
    workflowType: string;
    createdAt: string;
    pr?: {
      number: number;
      url: string;
    };
  };
}
```

#### Usage Examples

**Natural language**:
```
Show me the current status
What's the current workflow state?
Check if I have an active session
```

**Direct invocation**:
```
Use devsolo_status
```

#### Common Errors
- Not initialized (no .devsolo directory)

---

### 10. devsolo_cleanup

Clean up expired sessions and stale branches.

**Purpose**: Maintenance - remove old sessions and merged branches.

#### Input Parameters
```typescript
{
  deleteBranches?: boolean;          // Also delete stale branches
  force?: boolean;                   // Force branch deletion
}
```

#### Returns
`QueryToolResult` with cleanup statistics.

#### Data Format
```typescript
{
  sessionsRemoved: number;
  branchesRemoved?: number;       // if deleteBranches true
  sessions: string[];              // removed session IDs
  branches?: string[];             // removed branch names
}
```

#### Usage Examples

**Natural language**:
```
Clean up old sessions
Clean up old sessions and delete merged branches
Remove expired sessions forcefully
```

**Direct invocation**:
```
Use devsolo_cleanup
Use devsolo_cleanup with deleteBranches true
Use devsolo_cleanup with deleteBranches true and force true
```

#### Common Errors
- No sessions to clean
- Branch deletion failed (unmerged changes without force)
- Permission issues

---

## Validation

### Pre-flight Checks

All workflow tools run pre-flight checks before execution:

| Check | Description | Tools |
|-------|-------------|-------|
| `onMainBranch` | Verify on main/master | launch, hotfix |
| `workingDirectoryClean` | No uncommitted changes | launch, hotfix |
| `mainUpToDate` | Main synced with remote | launch |
| `noExistingSession` | No active session | launch, hotfix |
| `branchNameAvailable` | Branch name not in use | launch |
| `sessionExists` | Active session present | ship, commit, abort |
| `onFeatureBranch` | Not on main branch | ship |
| `hasCommitsToShip` | Commits ahead of main | ship |
| `noMergeConflicts` | No conflicts with main | ship |

### Post-flight Verifications

All workflow tools verify success after execution:

| Verification | Description | Tools |
|--------------|-------------|-------|
| `sessionCreated` | Session initialized | launch |
| `featureBranchCreated` | Branch exists | launch |
| `branchCheckedOut` | On correct branch | launch, swap |
| `sessionStateCorrect` | State as expected | launch, commit |
| `noUncommittedChanges` | Working dir clean | launch, commit |
| `branchMerged` | PR merged to main | ship |
| `featureBranchDeleted` | Branch removed | ship, abort |
| `sessionClosed` | Session completed | ship, abort |

## Error Handling

All tools return structured errors:

```typescript
{
  success: false,
  errors: [
    "Primary error message",
    "Secondary error details"
  ],
  warnings: [
    "Warning message 1",
    "Suggested action"
  ]
}
```

### Common Error Patterns

**Initialization errors**:
```
devsolo is not initialized. Run devsolo_init first.
```

**Session errors**:
```
No workflow session found for branch 'main'. Use devsolo_launch to start a workflow.
Active session exists. Use devsolo_abort to cancel it first.
```

**Validation errors**:
```
Pre-flight check failed: Working directory not clean
Post-flight verification failed: Branch not checked out
```

**GitHub errors**:
```
CI checks failed: Integration Tests
Timed out waiting for CI checks (20 minutes)
Failed to merge PR via GitHub API
```

## Best Practices

### 1. Always Check Status First
```
Use devsolo_status
```
Understand current state before operations.

### 2. Let Pre-flight Checks Guide You
Don't override checks with `force` unless necessary. They prevent issues.

### 3. Use Natural Language
Let Claude interpret intent:
```
"Start a new feature for OAuth"
```
vs explicit:
```
Use devsolo_launch with branchName "feature/oauth-2.0-integration" and description "Implement OAuth 2.0 authentication flow with Google and GitHub providers"
```

### 4. Review Structured Results
Post-flight verifications show exactly what succeeded/failed.

### 5. Handle Errors Gracefully
Errors include suggestions:
```json
{
  "success": false,
  "errors": ["Uncommitted changes detected"],
  "warnings": [
    "Run git status to see changes",
    "Use devsolo_commit to commit",
    "Then run devsolo_ship again"
  ]
}
```

## See Also

- [Quickstart Guide](quickstart.md) - Get started
- [Usage Guide](usage.md) - Practical patterns
- [Migration Guide](migration-from-cli.md) - v1.x → v2.0.0
- [MCP Integration](mcp-integration.md) - Claude Code setup
- [Troubleshooting](troubleshooting.md) - Common issues

---

**devsolo v2.0.0** - AI-native Git workflow automation 🤖
