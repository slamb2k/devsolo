# git-droid Output Style

Format all git-droid output using this consistent, structured style for clarity and scannability.

## General Principles

- **Structured Sections**: Use clear headings for different parts of output
- **Visual Indicators**: Use consistent icons for status (✓ success, ✗ error, ⚠ warning, 🔍 analysis, 📋 info, ✅ complete, 📊 summary)
- **Tables for Lists**: Present multiple items (sessions, branches, files) in table format
- **Actionable Guidance**: Always provide next steps or resolution guidance for errors
- **Progressive Disclosure**: Show summary first, details on request

## Output Format for Operations

### Analysis Phase
```
🔍 Analysis:
- Current branch: <branch-name> <status-icon>
- Working directory: <clean|changes-present> <status-icon>
- Active session: <yes|no> <status-icon>
- Generated <parameter>: <value>
```

### Pre-Flight Checks
```
Pre-flight checks:
✓ Check description 1
✓ Check description 2
✗ Check description 3 (failed)
⚠ Check description 4 (warning)
```

### Operation Steps
```
Operation: <action-description>...
Operation: <action-description>...
```

### Post-Flight Verifications
```
Post-flight verifications:
✓ Verification description 1
✓ Verification description 2
✗ Verification description 3 (failed)
```

### Result Summary
```
✅ Success! <summary-message>

Next steps:
- <actionable-step-1>
- <actionable-step-2>
```

Or for errors:
```
✗ Operation failed: <error-summary>

Issue: <description-of-what-went-wrong>

Resolution:
- <actionable-fix-1>
- <actionable-fix-2>
```

## Example: Launch Workflow Output

```
🔍 Analysis:
- Current branch: main ✓
- Working directory: clean ✓
- No active session ✓
- Generated branch name: feature/add-user-authentication

Calling mcp__devsolo__devsolo_launch...

Pre-flight checks:
✓ On main branch
✓ Working directory clean
✓ Branch name available

Operation: Creating branch feature/add-user-authentication...
Operation: Creating workflow session...
Operation: Checking out to new branch...

Post-flight verifications:
✓ Branch created
✓ Session created
✓ Checked out to new branch

✅ Success! Session started on feature/add-user-authentication

Next steps:
- Make your code changes
- Run /devsolo commit to commit changes
- Run /devsolo ship to create PR and merge
```

## Example: Commit Workflow Output

```
🔍 Analysis:
- Active session: feature/add-user-authentication ✓
- Changes detected: 3 files modified ✓
- Generated commit message: feat(auth): implement user authentication system

Calling mcp__devsolo__devsolo_commit...

Pre-flight checks:
✓ Active session exists
✓ Changes to commit (3 files)
✓ Not on main branch

Operation: Staging files...
Operation: Creating commit...
Operation: Updating session state...

Post-flight verifications:
✓ Commit created (abc1234)
✓ Session state updated to CHANGES_COMMITTED

✅ Success! Changes committed

Next steps:
- Run /devsolo ship to push and create PR
```

## Example: Ship Workflow Output

```
🔍 Analysis:
- Active session: feature/add-user-authentication ✓
- Uncommitted changes: none ✓
- Generated PR description: Created

Calling mcp__devsolo__devsolo_ship...

Pre-flight checks:
✓ All changes committed
✓ Session ready to ship
✓ GitHub authentication configured
✓ CI configured in repository

Operation: Pushing to remote...
Operation: Creating PR #123...
Operation: Waiting for CI checks (timeout: 20 minutes)...
  - Check: build (running...)
  - Check: test (running...)
  - Check: lint (passed ✓)
  - Check: build (passed ✓)
  - Check: test (passed ✓)
Operation: Merging PR with squash...
Operation: Syncing main branch...
Operation: Deleting feature branch (local)...
Operation: Deleting feature branch (remote)...
Operation: Completing session...

Post-flight verifications:
✓ Pushed to remote
✓ PR created (#123)
✓ CI checks passed
✓ PR merged
✓ Branches deleted
✓ On main branch
✓ Session completed

✅ Success! Feature shipped via PR #123

📊 Summary:
- PR: https://github.com/owner/repo/pull/123
- Commits: 3
- Files changed: 5
- CI checks: 3 passed
- Merge method: squash
```

## Example: Error Handling Output

```
🔍 Analysis:
- Current branch: feature/old-work ✗
- Active session: none ✗

Calling mcp__devsolo__devsolo_commit...

Pre-flight checks:
✗ No active session on current branch

✗ Operation failed: Cannot commit without active session

Issue: You are on branch 'feature/old-work' but there is no active devsolo session for this branch.

Resolution:
- Option 1: Switch to a branch with an active session
  Run /devsolo sessions to see active sessions
  Run /devsolo swap <branch-name> to switch
- Option 2: Start a new session on this branch
  Run /devsolo launch to start a new session
- Option 3: Adopt this branch into a new session
  Run /devsolo launch --adopt to create session for current branch
```

## Tables for Lists

### Sessions List
```
📋 Active Sessions:

| ID       | Branch                      | Type    | State         | Created    |
|----------|----------------------------|---------|---------------|------------|
| 0c2a20a7 | feature/user-auth          | feature | BRANCH_READY  | 2025-10-12 |
| 8f3d91bc | fix/login-bug              | fix     | PUSHED        | 2025-10-11 |

Total: 2 active session(s)
```

### Branches List
```
📋 Orphaned Branches (no session):

| Branch                         | Last Commit   | Age       |
|-------------------------------|---------------|-----------|
| feature/abandoned-work        | 3 days ago    | 15 days   |
| fix/old-bug                   | 1 week ago    | 22 days   |

Total: 2 orphaned branch(es)
```

### Files Changed
```
📋 Files Changed:

| File                          | Status    | Additions | Deletions |
|------------------------------|-----------|-----------|-----------|
| src/auth/login.ts            | modified  | +45       | -12       |
| src/auth/auth.test.ts        | created   | +89       | -0        |
| README.md                    | modified  | +5        | -2        |

Total: 3 file(s) changed, +139 additions, -14 deletions
```

## Status Information

### Current Status Format
```
📊 Current Status:

Branch: feature/user-authentication
Session: 0c2a20a7 (active)
State: CHANGES_COMMITTED
Type: feature
Created: 2025-10-12 01:15:30

Git Status:
- Staged: 0 files
- Modified: 2 files
- Untracked: 1 file

Last Commit: feat(auth): implement user authentication system (abc1234)
```

## Progress Indicators

For long-running operations (CI wait, large pushes):
```
Operation: Waiting for CI checks (timeout: 20 minutes)...
  [00:30] build: running...
  [00:45] test: running...
  [01:02] lint: passed ✓
  [01:15] build: passed ✓
  [01:45] test: passed ✓
```

## Warnings and Info Messages

### Warning Format
```
⚠ Warning: <warning-summary>

Details: <explanation-of-warning>

This may cause: <potential-issues>

Recommendation: <suggested-action>
```

### Info Format
```
📋 Info: <info-summary>

Details: <additional-information>
```

## Consistency Rules

1. **Always show analysis first** - Let user know what git-droid is thinking
2. **Always show pre-flight checks** - Transparency about validation
3. **Always show operations as they execute** - Progress visibility
4. **Always show post-flight verifications** - Confirm success
5. **Always provide next steps** - Guide user forward
6. **Use consistent icons** - Same meaning across all output
7. **Use tables for lists** - Better scannability
8. **Keep summaries concise** - Details available on request
9. **Make errors actionable** - Always suggest resolution
10. **Show context for decisions** - Explain why parameters were generated

## Verbose Mode

When verbose output is requested, include:
- Full diff of changes
- Complete state history
- Detailed metadata
- All check details (not just pass/fail)
- Full CI check logs
- Timing information for operations

Example:
```
📊 Detailed Status (verbose):

Session Details:
- ID: 0c2a20a7-8f3d-91bc-4e5a-6f7g8h9i0j1k
- Branch: feature/user-authentication
- State: CHANGES_COMMITTED
- Workflow Type: feature
- Created: 2025-10-12T01:15:30.123Z
- Updated: 2025-10-12T01:45:22.456Z

State History:
1. INIT → BRANCH_READY (2025-10-12T01:15:30.123Z)
2. BRANCH_READY → CHANGES_COMMITTED (2025-10-12T01:45:22.456Z)

Metadata:
- Description: "Add user authentication"
- Author: "john@example.com"
- Stash: null
- PR: null

Git Diff:
[show full diff output]
```
