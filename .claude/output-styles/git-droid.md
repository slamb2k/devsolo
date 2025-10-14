# git-droid Output Style

Format all git-droid output using this consistent, structured style for clarity and scannability.

## General Principles

- **Structured Sections**: Use clear headings for different parts of output
- **Visual Indicators**: Use consistent icons for status (✓ success, ✗ error, ⚠ warning, 🔍 analysis, 📋 info, ✅ complete, 📊 summary)
- **Tables for Lists**: Present multiple items (sessions, branches, files) in table format
- **Actionable Guidance**: Always provide next steps or resolution guidance for errors
- **Progressive Disclosure**: Show summary first, details on request

## Output Format for Operations

**IMPORTANT:** Always use double newlines (`\n\n`) between major sections and single newlines (`\n`) between list items to ensure proper rendering.

### Analysis Phase
Format as:
```
**🔍 git-droid analysis:**

- Current branch: <branch-name> <status-icon>
- Working directory: <clean|changes-present> <status-icon>
- Active session: <yes|no> <status-icon>
- Generated <parameter>: <value>
```

### Pre-Flight Checks
Format as markdown list with proper spacing:
```
**Pre-flight checks:**

- ✓ Check description 1
- ✓ Check description 2
- ✗ Check description 3 (failed)
- ⚠ Check description 4 (warning)
```

### Operation Steps
Format as markdown list:
```
**Operations:**

- ✓ Operation description 1
- ✓ Operation description 2
- ✓ Operation description 3
```

### Post-Flight Verifications
Format as markdown list:
```
**Post-flight verifications:**

- ✓ Verification description 1
- ✓ Verification description 2
- ✓ Verification description 3
```

### Result Summary
Format with clear sections using markdown headers:
```
## ✅ <Operation> Successful

**<Primary metric>:** <value>

### Operations Completed

- ✓ Operation 1
- ✓ Operation 2
- ✓ Operation 3

### Next Steps

<Guidance text>
```

Or for errors:
```
## ✗ Operation Failed

**Error:** <error-summary>

**Issue:** <description-of-what-went-wrong>

### Resolution

- <actionable-fix-1>
- <actionable-fix-2>
```

## Example: Launch Workflow Output

```
## ✅ Workflow Launched Successfully

**Session Created:** `2d967326-881b-4167-9e52-fef1e07366f0`

**Branch:** `feature/add-user-authentication`

**State:** `BRANCH_READY`

---

### 🔍 Pre-flight Checks

- ✓ On main branch
- ✓ Working directory clean
- ✓ Main branch up to date
- ✓ No existing session
- ✓ Branch name available

### ✅ Operations Completed

- ✓ Created branch: `feature/add-user-authentication`
- ✓ Checked out to new branch
- ✓ Session initialized

### 📝 Current State

- **Working directory:** Clean
- **Ready for:** Feature development

---

### 🎯 Next Steps

When ready to ship your changes:

- Run `/devsolo:commit` to commit your changes
- Run `/devsolo:ship` to push, create PR, and merge
```

## Example: Commit Workflow Output

```
## ✅ Commit Successful

**Operation:** Changes committed to feature/add-user-authentication

### Pre-flight Checks

- ✓ Active session exists (2d967326...)
- ✓ Changes to commit (3 files modified)

### Commit Details

```
Commit: abc1234567890abcdef1234567890abcdef1234
Author: Your Name <your.email@example.com>
Date:   Tue Oct 14 17:11:46 2025 +1100

feat(auth): implement user authentication system
```

### Files Changed

```
src/auth/login.ts     | 45 ++++++++++++++++++++++++++
src/auth/index.ts     | 12 +++++--
src/auth/auth.test.ts | 89 ++++++++++++++++++++++++++++++++++++++++++
3 files changed, 144 insertions(+), 0 deletions(-)
```

### Session State Update

- **Previous State:** BRANCH_READY
- **Current State:** CHANGES_COMMITTED

### Next Steps

Ready to ship! Use `/devsolo:ship` to:

- Push changes to remote
- Create pull request
- Merge to main
- Clean up branches
```

## Example: Ship Workflow Output

```
## ✅ Ship Successful

**Operation:** Feature shipped via PR #123

---

### Pre-flight Checks

- ✓ All changes committed
- ✓ Session ready to ship
- ✓ GitHub authentication configured
- ✓ CI configured in repository

### Operations Executed

- ✓ Pushed to remote
- ✓ Created PR #123
- ✓ Waited for CI checks (all passed)
- ✓ Merged PR to main
- ✓ Cleaned up branches
- ✓ Switched to main branch

### Post-flight Verifications

- ✓ Pushed to remote
- ✓ PR created (#123)
- ✓ CI checks passed (build, test, lint)
- ✓ PR merged successfully
- ✓ Feature branch deleted (local & remote)
- ✓ On main branch
- ✓ Session completed

---

### 📊 Summary

- **PR:** https://github.com/owner/repo/pull/123
- **Commits:** 3
- **Files changed:** 5
- **CI checks:** 3 passed
- **Merge method:** squash

### Next Steps

You're back on the main branch. Ready to start a new feature with `/devsolo:launch`
```

## Example: Error Handling Output

```
## ✗ Operation Failed

**Error:** Cannot commit without active session

---

### Pre-flight Checks

- ✗ No active session on current branch
- ⚠ On branch 'feature/old-work'
- ✓ Changes detected (ready to commit)

---

### Issue

You are on branch `feature/old-work` but there is no active devsolo session for this branch.

### Resolution

Choose one of the following options:

**Option 1: Switch to a branch with an active session**

- Run `/devsolo:sessions` to see active sessions
- Run `/devsolo:swap <branch-name>` to switch to that session

**Option 2: Start a new session on this branch**

- Run `/devsolo:launch` to start a fresh session (will create new branch)

**Option 3: Continue with standard git**

- Use standard `git commit` commands without devsolo workflow
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

1. **Always use markdown formatting** - Use `##` and `###` for headers, `**bold**` for emphasis, proper list syntax with `-`
2. **Always include blank lines** - Use double newlines (`\n\n`) between sections for proper rendering
3. **Always show pre-flight checks** - Display validation checks with ✓/✗/⚠ before operations
4. **Always show operations executed** - List what was done during the workflow
5. **Always show post-flight verifications** - Confirm success after operations complete
6. **Always provide next steps** - Guide user forward with actionable commands
7. **Use consistent section headers** - "Pre-flight Checks", "Operations Executed", "Post-flight Verifications", "Next Steps"
8. **Use consistent icons** - ✓ success, ✗ error, ⚠ warning, 🔍 analysis, 📋 info, ✅ complete, 📊 summary
9. **Use horizontal rules** - Add `---` between major sections for visual separation
10. **Make errors actionable** - Always suggest resolution steps clearly formatted

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
