# devsolo Command Output Consistency Review

**Purpose**: Comprehensive reference showing example outputs for all devsolo commands to ensure consistency across the entire system.

**Created**: 2025-10-14
**Status**: Living document - update when output formats change

---

## Table of Contents

1. [Output Style Standards](#output-style-standards)
2. [Command Banners](#command-banners)
3. [Individual Command Outputs](#individual-command-outputs)
4. [Complete Workflow Examples](#complete-workflow-examples)
5. [Error Handling Examples](#error-handling-examples)
6. [Consistency Checklist](#consistency-checklist)

---

## Output Style Standards

### git-droid Output Format

All git workflow commands (launch, commit, ship, swap, abort, cleanup, hotfix) follow git-droid output style:

**Standard Section Labels (EXACT - note capitalization and colons):**
1. **"Pre-flight Checks:"** - Validation before operations (NOT "Pre-flight checks" or "PreFlight")
2. **"Operations Executed:"** - What actions were performed (NOT "Operations" or "Operations executed")
3. **"Post-flight Verifications:"** - Validation after operations (NOT "Post-flight verifications")
4. **"Result Summary:"** - High-level outcome
5. **"Next Steps:"** - Actionable guidance (NOT "Next steps")

**User Options Format (when presenting choices):**
- Use **numbered options** (1, 2, 3) for 3+ choices
- Mark one option as **[RECOMMENDED]**
- Show **Risk level** and **Action** for each option
- Example:
  ```
  1. Bring them to the new branch (stash and restore) [RECOMMENDED]
     Risk: Low | Action: Stash changes, create branch, restore changes

  2. Discard them (start fresh)
     Risk: High | Action: Discard all uncommitted changes

  3. Cancel launch
     Risk: Low | Action: Abort operation, stay on current branch
  ```

**Icons:**
- ✓ Success/Passed checks
- ✗ Error/Failed checks
- ⚠ Warning/Caution
- 🔍 Analysis
- 📋 Info
- ✅ Complete/Successful result
- 📊 Summary/Statistics

**Formatting:**
- Use `## ` for major section headers
- Use `### ` for subsections
- Use `---` horizontal rules between major sections
- Double newlines between sections
- Single newlines between list items

### docs-droid Output Format

All documentation commands (doc) follow docs-droid output style:

**Structure:**
1. Analysis phase (📋 scanning/analyzing)
2. Issue summary (tables for multiple items)
3. **User options** (numbered 1, 2, 3 for 3+ choices with [RECOMMENDED])
4. Actions completed (✓ with details)
5. Summary (📊 with counts)

**User Options Format:**
- **Numbered options (1, 2, 3)** when presenting 3+ choices
- **Yes/no confirmation** for simple binary choices
- Mark one option as **[RECOMMENDED]**
- Show **Risk level** and **Action** for each option

**Icons:**
- 📋 Info/scanning
- ✓ Success
- ✗ Error
- ⚠ Warning
- 📁 Folder
- 📄 File
- 🗄️ Archive

### Query Command Format

Query commands (status, sessions, init, status-line) use simpler formatting:

**Structure:**
1. Main content (status info, session list, configuration)
2. **Next Steps:** - Actionable guidance

**Key Differences from Workflow Commands:**
- No pre-flight/post-flight checks (read-only operations)
- Cleaner, more concise output
- Focus on presenting information clearly
- Still provide actionable next steps

---

## Command Banners

Each command displays a unique ASCII art banner before execution:

### /devsolo:init
```
░▀█▀░█▀█░▀█▀░▀█▀░▀█▀░█▀█░█░░░▀█▀░█▀▀░▀█▀░█▀█░█▀▀░
░░█░░█░█░░█░░░█░░░█░░█▀█░█░░░░█░░▀▀█░░█░░█░█░█░█░
░▀▀▀░▀░▀░▀▀▀░░▀░░▀▀▀░▀░▀░▀▀▀░▀▀▀░▀▀▀░▀▀▀░▀░▀░▀▀▀░
```

### /devsolo:launch
```
░█░░░█▀█░█░█░█▀█░█▀▀░█░█░▀█▀░█▀█░█▀▀░
░█░░░█▀█░█░█░█░█░█░░░█▀█░░█░░█░█░█░█░
░▀▀▀░▀░▀░▀▀▀░▀░▀░▀▀▀░▀░▀░▀▀▀░▀░▀░▀▀▀░
```

### /devsolo:commit
```
░█▀▀░█▀█░█▀▄▀█░█▀▄▀█░▀█▀░▀█▀░
░█░░░█░█░█░▀░█░█░▀░█░░█░░░█░░
░▀▀▀░▀▀▀░▀░░░▀░▀░░░▀░▀▀▀░░▀░░
```

### /devsolo:ship
```
░█▀▀░█░█░▀█▀░█▀█░█▀█░▀█▀░█▀█░█▀▀░
░▀▀█░█▀█░░█░░█▀▀░█▀▀░░█░░█░█░█░█░
░▀▀▀░▀░▀░▀▀▀░▀░░░▀░░░▀▀▀░▀░▀░▀▀▀░
```

### /devsolo:info
```
░▀█▀░█▀█░█▀▀░█▀█░
░░█░░█░█░█▀▀░█░█░
░▀▀▀░▀░▀░▀░░░▀▀▀░
```

### /devsolo:sessions
```
░█▀▀░█▀▀░█▀▀░█▀▀░▀█▀░█▀█░█▀█░█▀▀░
░▀▀█░█▀▀░▀▀█░▀▀█░░█░░█░█░█░█░▀▀█░
░▀▀▀░▀▀▀░▀▀▀░▀▀▀░▀▀▀░▀▀▀░▀░▀░▀▀▀░
```

### /devsolo:swap
```
░█▀▀░█░█░█▀█░█▀█░█▀█░▀█▀░█▀█░█▀▀░
░▀▀█░█▄█░█▀█░█▀▀░█▀▀░░█░░█░█░█░█░
░▀▀▀░▀░▀░▀░▀░▀░░░▀░░░▀▀▀░▀░▀░▀▀▀░
```

### /devsolo:abort
```
░█▀█░█▀▄░█▀█░█▀▄░▀█▀░▀█▀░█▀█░█▀▀░
░█▀█░█▀▄░█░█░█▀▄░░█░░░█░░█░█░█░█░
░▀░▀░▀▀░░▀▀▀░▀░▀░░▀░░▀▀▀░▀░▀░▀▀▀░
```

### /devsolo:cleanup
```
░█▀▀░█░░░█▀▀░█▀█░█▀█░█░█░█▀█░
░█░░░█░░░█▀▀░█▀█░█░█░█░█░█▀▀░
░▀▀▀░▀▀▀░▀▀▀░▀░▀░▀░▀░▀▀▀░▀░░░
```

### /devsolo:hotfix
```
░█░█░█▀█░▀█▀░█▀▀░▀█▀░█░█░
░█▀█░█░█░░█░░█▀▀░░█░░▄▀▄░
░▀░▀░▀▀▀░░▀░░▀░░░▀▀▀░▀░▀░
```

### /devsolo:prime
```
░█▀█░█▀▄░▀█▀░█▀▄▀█░▀█▀░█▀█░█▀▀░
░█▀▀░█▀▄░░█░░█░▀░█░░█░░█░█░█░█░
░▀░░░▀░▀░▀▀▀░▀░░░▀░▀▀▀░▀░▀░▀▀▀░
```

---

## Individual Command Outputs

### 1. /devsolo:init

**Success Output:**

```
░▀█▀░█▀█░▀█▀░▀█▀░▀█▀░█▀█░█░░░▀█▀░█▀▀░▀█▀░█▀█░█▀▀░
░░█░░█░█░░█░░░█░░░█░░█▀█░█░░░░█░░▀▀█░░█░░█░█░█░█░
░▀▀▀░▀░▀░▀▀▀░░▀░░▀▀▀░▀░▀░▀▀▀░▀▀▀░▀▀▀░▀▀▀░▀░▀░▀▀▀░

## ✅ devsolo Initialized Successfully

**Scope:** project

**Configuration:**
- Location: `.devsolo/config.yaml`
- Session storage: `.devsolo/sessions/`
- Git platform: GitHub (detected)

### Created Structure

```
.devsolo/
├── config.yaml
└── sessions/
```

### Next Steps

Start your first feature workflow:
```
/devsolo:launch --description="Your feature description"
```
```

**Already Initialized Output:**

```
░▀█▀░█▀█░▀█▀░▀█▀░▀█▀░█▀█░█░░░▀█▀░█▀▀░▀█▀░█▀█░█▀▀░
░░█░░█░█░░█░░░█░░░█░░█▀█░█░░░░█░░▀▀█░░█░░█░█░█░█░
░▀▀▀░▀░▀░▀▀▀░░▀░░▀▀▀░▀░▀░▀▀▀░▀▀▀░▀▀▀░▀▀▀░▀░▀░▀▀▀░

## ✓ devsolo Already Initialized

**Scope:** project
**Configuration:** `.devsolo/config.yaml`

Use `--force` to reinitialize if needed.

### Next Steps

Start a feature workflow:
```
/devsolo:launch
```
```

---

### 2. /devsolo:launch

**Success Output:**

```
░█░░░█▀█░█░█░█▀█░█▀▀░█░█░▀█▀░█▀█░█▀▀░
░█░░░█▀█░█░█░█░█░█░░░█▀█░░█░░█░█░█░█░
░▀▀▀░▀░▀░▀▀▀░▀░▀░▀▀▀░▀░▀░▀▀▀░▀░▀░▀▀▀░

## ✅ Workflow Launched Successfully

**Session Created:** `2d967326-881b-4167-9e52-fef1e07366f0`

**Branch:** `feature/add-user-authentication`

**State:** `BRANCH_READY`

**Description:** Add user authentication

---

### Pre-flight Checks:

- ✓ On main branch
- ✓ Working directory clean
- ✓ Main branch up to date
- ✓ No existing session
- ✓ Branch name available

### Operations Executed:

- ✓ Created branch: `feature/add-user-authentication`
- ✓ Checked out to new branch
- ✓ Session initialized

### Post-flight Verifications:

- ✓ On feature branch
- ✓ Working directory clean
- ✓ Session active

### 📝 Current State

- **Working directory:** Clean
- **Ready for:** Feature development

---

### Next Steps:

When ready to ship your changes:

- Run `/devsolo:commit` to commit your changes
- Run `/devsolo:ship` to push, create PR, and merge
```

**With Uncommitted Changes:**

```
░█░░░█▀█░█░█░█▀█░█▀▀░█░█░▀█▀░█▀█░█▀▀░
░█░░░█▀█░█░█░█░█░█░░░█▀█░░█░░█░█░█░█░
░▀▀▀░▀░▀░▀▀▀░▀░▀░▀▀▀░▀░▀░▀▀▀░▀░▀░▀▀▀░

## 🔍 git-droid analysis:

- Current branch: main ✓
- Working directory: changes present ⚠
- Active session: no ✓
- Generated branch name: feature/fix-navigation-bug

---

### ⚠ Uncommitted Changes Detected

You have uncommitted changes. Please choose an option:

1. Bring them to the new branch (stash and restore) [RECOMMENDED]
   Risk: Low | Action: Stash changes, create branch, restore stashed changes

2. Discard them (start fresh)
   Risk: High | Action: Discard all uncommitted changes permanently

3. Cancel launch
   Risk: Low | Action: Abort launch operation, stay on current branch
```

**User selects option 1, then:**

```
### Operations Executed:

- ✓ Stashed changes (stash@{0})
- ✓ Created branch: `feature/fix-navigation-bug`
- ✓ Checked out to new branch
- ✓ Restored stashed changes
- ✓ Session initialized

## ✅ Workflow Launched Successfully

**Session Created:** `8f3d91bc-4e5a-6f7g-8h9i-0j1k2l3m4n5o`

**Branch:** `feature/fix-navigation-bug`

**State:** `BRANCH_READY`

---

### Post-flight Verifications:

- ✓ On feature branch
- ✓ Stashed changes restored
- ✓ Session active

### 📝 Current State

- **Working directory:** Uncommitted changes restored
- **Ready for:** Continue your work

### Next Steps:

Complete your changes, then:

- Run `/devsolo:commit` to commit your work
- Run `/devsolo:ship` to ship the feature
```

---

### 3. /devsolo:commit

**Success Output (Auto-generated Message):**

```
░█▀▀░█▀█░█▀▄▀█░█▀▄▀█░▀█▀░▀█▀░
░█░░░█░█░█░▀░█░█░▀░█░░█░░░█░░
░▀▀▀░▀▀▀░▀░░░▀░▀░░░▀░▀▀▀░░▀░░

## ✅ Commit Successful

**Operation:** Changes committed to feature/add-user-authentication

---

### Pre-flight Checks:

- ✓ Active session exists (2d967326...)
- ✓ Changes to commit (3 files modified)

### Operations Executed:

- ✓ Staged all changes (3 files)
- ✓ Created commit (abc1234)
- ✓ Updated session state

### Post-flight Verifications:

- ✓ Commit created successfully
- ✓ Session state updated
- ✓ Working directory clean

### Commit Details

```
Commit: abc1234567890abcdef1234567890abcdef1234
Author: John Developer <john@example.com>
Date:   Tue Oct 14 17:11:46 2025 +1100

feat(auth): implement user authentication system

🤖 Generated with devsolo
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

---

### Next Steps:

Ready to ship! Use `/devsolo:ship` to:

- Push changes to remote
- Create pull request
- Merge to main
- Clean up branches
```

**Success Output (Custom Message):**

```
░█▀▀░█▀█░█▀▄▀█░█▀▄▀█░▀█▀░▀█▀░
░█░░░█░█░█░▀░█░█░▀░█░░█░░░█░░
░▀▀▀░▀▀▀░▀░░░▀░▀░░░▀░▀▀▀░░▀░░

## ✅ Commit Successful

**Operation:** Changes committed to feature/oauth2-support

---

### Pre-flight Checks

- ✓ Active session exists (0c2a20a7...)
- ✓ Changes to commit (5 files modified)

### Commit Details

```
Commit: def4567890abcdef1234567890abcdef12345678
Author: Jane Developer <jane@example.com>
Date:   Tue Oct 14 18:22:15 2025 +1100

feat(auth): add OAuth2 provider support

🤖 Generated with devsolo
```

### Files Changed

```
src/auth/oauth2.ts           | 67 ++++++++++++++++++++++++
src/auth/providers/google.ts | 34 +++++++++++++
src/auth/providers/github.ts | 31 +++++++++++
src/config/oauth.ts          | 23 ++++++++
tests/auth/oauth2.test.ts    | 98 +++++++++++++++++++++++++++++++
5 files changed, 253 insertions(+), 0 deletions(-)
```

### Session State Update

- **Previous State:** BRANCH_READY
- **Current State:** CHANGES_COMMITTED

---

### 🎯 Next Steps

Ready to ship! Use `/devsolo:ship`
```

**Success Output (Staged Only):**

```
░█▀▀░█▀█░█▀▄▀█░█▀▄▀█░▀█▀░▀█▀░
░█░░░█░█░█░▀░█░█░▀░█░░█░░░█░░
░▀▀▀░▀▀▀░▀░░░▀░▀░░░▀░▀▀▀░░▀░░

## ✅ Commit Successful

**Operation:** Staged changes committed to feature/refactor-auth

---

### Pre-flight Checks

- ✓ Active session exists (7a8b9c0d...)
- ✓ Staged files to commit (2 files)

### Commit Details

```
Commit: 9ab8cd7ef6543210abcdef9876543210fedcba98
Author: Developer <dev@example.com>
Date:   Tue Oct 14 19:05:33 2025 +1100

refactor(auth): simplify authentication flow

🤖 Generated with devsolo
```

### Files Changed

```
src/auth/flow.ts      | 34 +++++---------
src/auth/helpers.ts   | 18 ++------
2 files changed, 15 insertions(+), 37 deletions(-)
```

### Remaining Unstaged Changes

⚠ You still have 3 unstaged files. These were NOT committed.

To commit them later:
```
git add <files>
/devsolo:commit --stagedOnly
```

### Session State Update

- **Previous State:** BRANCH_READY
- **Current State:** CHANGES_COMMITTED

---

### 🎯 Next Steps

- Commit remaining changes, or
- Ship current changes with `/devsolo:ship`
```

---

### 4. /devsolo:ship

**Success Output (Complete Workflow):**

```
░█▀▀░█░█░▀█▀░█▀█░█▀█░▀█▀░█▀█░█▀▀░
░▀▀█░█▀█░░█░░█▀▀░█▀▀░░█░░█░█░█░█░
░▀▀▀░▀░▀░▀▀▀░▀░░░▀░░░▀▀▀░▀░▀░▀▀▀░

## ✅ Ship Successful

**Operation:** Feature shipped via PR #123

---

### Pre-flight Checks:

- ✓ All changes committed
- ✓ Session ready to ship (CHANGES_COMMITTED)
- ✓ GitHub authentication configured
- ✓ CI configured in repository

### Operations Executed:

- ✓ Pushed to remote (feature/add-user-authentication)
- ✓ Created PR #123
- ✓ Waited for CI checks
  - ✓ build: passed (1m 23s)
  - ✓ test: passed (2m 45s)
  - ✓ lint: passed (0m 34s)
- ✓ Merged PR to main (squash merge)
- ✓ Synced local main branch
- ✓ Deleted feature branch (local)
- ✓ Deleted feature branch (remote)
- ✓ Session marked complete

### Post-flight Verifications:

- ✓ Pushed to remote
- ✓ PR created (#123)
- ✓ CI checks passed (3/3)
- ✓ PR merged successfully
- ✓ Feature branch deleted (local & remote)
- ✓ On main branch
- ✓ Working directory clean
- ✓ Session completed

---

### 📊 Summary

- **PR:** https://github.com/owner/repo/pull/123
- **Commits:** 3 commits squashed
- **Files changed:** 5 files
- **CI checks:** 3 passed
- **Merge method:** squash
- **Duration:** 4m 42s

---

### Next Steps:

You're back on the main branch with a clean working directory.

Ready to start your next feature:
```
/devsolo:launch
```
```

**Success Output (Push Only, No Merge):**

```
░█▀▀░█░█░▀█▀░█▀█░█▀█░▀█▀░█▀█░█▀▀░
░▀▀█░█▀█░░█░░█▀▀░█▀▀░░█░░█░█░█░█░
░▀▀▀░▀░▀░▀▀▀░▀░░░▀░░░▀▀▀░▀░▀░▀▀▀░

## ✅ Ship Successful

**Operation:** Changes pushed and PR created (#124)

---

### Pre-flight Checks

- ✓ All changes committed
- ✓ Session ready to ship
- ✓ GitHub authentication configured

### Operations Executed

- ✓ Pushed to remote (feature/oauth2-support)
- ✓ Created PR #124
- ⚠ Merge skipped (--merge=false)

### Post-flight Verifications

- ✓ Pushed to remote
- ✓ PR created (#124)
- ⚠ PR not merged (manual merge required)
- ✓ Still on feature branch for review

---

### 📊 Summary

- **PR:** https://github.com/owner/repo/pull/124
- **Status:** Awaiting review
- **Branch:** feature/oauth2-support (still active)

---

### 🎯 Next Steps

After PR is approved, merge manually:

```
/devsolo:ship --merge --push=false --createPR=false
```

Or merge via GitHub web interface and clean up:
```
/devsolo:cleanup
```
```

**With Uncommitted Changes (Auto-commits):**

```
░█▀▀░█░█░▀█▀░█▀█░█▀█░▀█▀░█▀█░█▀▀░
░▀▀█░█▀█░░█░░█▀▀░█▀▀░░█░░█░█░█░█░
░▀▀▀░▀░▀░▀▀▀░▀░░░▀░░░▀▀▀░▀░▀░▀▀▀░

## 🔍 git-droid analysis:

- Active session: 5d6e7f8g... ✓
- Changes to commit: 2 files ⚠
- Will auto-commit before shipping

---

### Auto-Commit Phase

Committing uncommitted changes...

```
Commit: 1a2b3c4d5e6f7890abcdef1234567890abcdef12
Author: Dev <dev@example.com>
Date:   Tue Oct 14 20:15:42 2025 +1100

feat(api): add rate limiting middleware

🤖 Generated with devsolo
```

---

## ✅ Ship Successful

**Operation:** Feature shipped via PR #125

[... rest of ship output as shown above ...]
```

---

### 5. /devsolo:info

**Active Session Output:**

```
░▀█▀░█▀█░█▀▀░█▀█░
░░█░░█░█░█▀▀░█░█░
░▀▀▀░▀░▀░▀░░░▀▀▀░

## 📊 Current Status

**Branch:** feature/user-authentication
**Session:** 0c2a20a7 (active)
**State:** CHANGES_COMMITTED
**Type:** feature
**Created:** 2025-10-12 01:15:30

---

### Session Details

- **Description:** Add user authentication
- **Commits:** 3 commits on this branch
- **PR:** Not created yet

### Git Status

- **Staged:** 0 files
- **Modified:** 2 files
  - src/auth/login.ts
  - README.md
- **Untracked:** 1 file
  - src/auth/session.ts

### Last Commit

```
feat(auth): implement user authentication system (abc1234)
Author: John Developer <john@example.com>
Date: 2 hours ago
```

---

### 🎯 Next Steps

You have uncommitted changes. To ship:

1. Commit changes: `/devsolo:commit`
2. Ship feature: `/devsolo:ship`
```

**No Active Session Output:**

```
░▀█▀░█▀█░█▀▀░█▀█░
░░█░░█░█░█▀▀░█░█░
░▀▀▀░▀░▀░▀░░░▀▀▀░

## 📊 Current Status

**Branch:** main
**Session:** None
**State:** Ready to start new work

---

### Git Status

- **Working directory:** Clean
- **Branch:** Up to date with origin/main

---

### 🎯 Next Steps

Start a new feature workflow:

```
/devsolo:launch --description="Your feature description"
```
```

---

### 6. /devsolo:sessions

**Active Sessions Output:**

```
░█▀▀░█▀▀░█▀▀░█▀▀░▀█▀░█▀█░█▀█░█▀▀░
░▀▀█░█▀▀░▀▀█░▀▀█░░█░░█░█░█░█░▀▀█░
░▀▀▀░▀▀▀░▀▀▀░▀▀▀░▀▀▀░▀▀▀░▀░▀░▀▀▀░

## 📋 Active Sessions

| ID       | Branch                      | Type    | State            | Created    |
|----------|-----------------------------|---------|------------------|------------|
| 0c2a20a7 | feature/user-auth           | feature | CHANGES_COMMITTED| 2025-10-12 |
| 8f3d91bc | feature/api-refactor        | feature | BRANCH_READY     | 2025-10-11 |
| 5d6e7f8g | fix/login-bug               | fix     | PUSHED           | 2025-10-10 |

**Total:** 3 active session(s)

---

### 🎯 Actions

- View details: `/devsolo:info`
- Switch session: `/devsolo:swap --branchName="<branch>"`
- Continue work: Checkout the branch
```

**All Sessions Output (including completed):**

```
░█▀▀░█▀▀░█▀▀░█▀▀░▀█▀░█▀█░█▀█░█▀▀░
░▀▀█░█▀▀░▀▀█░▀▀█░░█░░█░█░█░█░▀▀█░
░▀▀▀░▀▀▀░▀▀▀░▀▀▀░▀▀▀░▀▀▀░▀░▀░▀▀▀░

## 📋 All Sessions

### Active Sessions

| ID       | Branch                      | Type    | State            | Created    |
|----------|-----------------------------|---------|------------------|------------|
| 0c2a20a7 | feature/user-auth           | feature | CHANGES_COMMITTED| 2025-10-12 |
| 8f3d91bc | feature/api-refactor        | feature | BRANCH_READY     | 2025-10-11 |

### Completed Sessions

| ID       | Branch                      | Type    | State    | Completed  | PR  |
|----------|-----------------------------|---------|----------|------------|-----|
| 2d967326 | feature/oauth2              | feature | COMPLETE | 2025-10-11 | #123|
| 7a8b9c0d | fix/navigation              | fix     | COMPLETE | 2025-10-09 | #120|

### Aborted Sessions

| ID       | Branch                      | Type    | State   | Aborted    |
|----------|-----------------------------|---------|---------|------------|
| 9e8d7c6b | feature/experiment          | feature | ABORTED | 2025-10-08 |

---

**Totals:**
- Active: 2
- Completed: 2
- Aborted: 1
- Total: 5
```

**Verbose Output:**

```
░█▀▀░█▀▀░█▀▀░█▀▀░▀█▀░█▀█░█▀█░█▀▀░
░▀▀█░█▀▀░▀▀█░▀▀█░░█░░█░█░█░█░▀▀█░
░▀▀▀░▀▀▀░▀▀▀░▀▀▀░▀▀▀░▀▀▀░▀░▀░▀▀▀░

## 📋 Sessions (Verbose)

### Session: 0c2a20a7-8f3d-91bc-4e5a-6f7g8h9i0j1k

**Branch:** feature/user-auth
**Type:** feature
**State:** CHANGES_COMMITTED
**Created:** 2025-10-12T01:15:30.123Z
**Updated:** 2025-10-12T03:22:15.456Z

**Metadata:**
- Description: Add user authentication
- Author: john@example.com
- Stash: null
- PR: null

**State History:**
1. INIT → BRANCH_READY (2025-10-12T01:15:30.123Z)
2. BRANCH_READY → CHANGES_COMMITTED (2025-10-12T03:22:15.456Z)

---

### Session: 8f3d91bc-4e5a-6f7g-8h9i-0j1k2l3m4n5o

**Branch:** feature/api-refactor
**Type:** feature
**State:** BRANCH_READY
**Created:** 2025-10-11T14:22:11.789Z
**Updated:** 2025-10-11T14:22:11.789Z

**Metadata:**
- Description: Refactor API client
- Author: jane@example.com
- Stash: null
- PR: null

**State History:**
1. INIT → BRANCH_READY (2025-10-11T14:22:11.789Z)

---

**Total:** 2 active session(s)
```

---

### 7. /devsolo:swap

**Success Output:**

```
░█▀▀░█░█░█▀█░█▀█░█▀█░▀█▀░█▀█░█▀▀░
░▀▀█░█▄█░█▀█░█▀▀░█▀▀░░█░░█░█░█░█░
░▀▀▀░▀░▀░▀░▀░▀░░░▀░░░▀▀▀░▀░▀░▀▀▀░

## ✅ Swap Successful

**Operation:** Switched to feature/api-refactor

---

### Pre-flight Checks:

- ✓ Target session exists (8f3d91bc...)
- ✓ Target branch exists
- ✓ Uncommitted changes stashed

### Operations Executed:

- ✓ Stashed current work (stash@{0})
- ✓ Switched to branch: feature/api-refactor
- ✓ Activated session: 8f3d91bc
- ✓ Working directory clean

### Post-flight Verifications:

- ✓ On target branch
- ✓ Target session active
- ✓ Previous work stashed safely

---

### 📝 Current State

**Branch:** feature/api-refactor
**Session:** 8f3d91bc (active)
**State:** BRANCH_READY

---

### Next Steps:

Work on this feature. To return to previous work:

```
/devsolo:swap --branchName="feature/user-auth"
```

Your stashed changes will be automatically restored.
```

**With Stash Restore:**

```
░█▀▀░█░█░█▀█░█▀█░█▀█░▀█▀░█▀█░█▀▀░
░▀▀█░█▄█░█▀█░█▀▀░█▀▀░░█░░█░█░█░█░
░▀▀▀░▀░▀░▀░▀░▀░░░▀░░░▀▀▀░▀░▀░▀▀▀░

## ✅ Swap Successful

**Operation:** Switched to feature/user-auth

---

### Pre-flight Checks:

- ✓ Target session exists (0c2a20a7...)
- ✓ Target branch exists
- ✓ Previous stash found for this branch

### Operations Executed:

- ✓ Switched to branch: feature/user-auth
- ✓ Activated session: 0c2a20a7
- ✓ Restored stashed changes (stash@{1})
- ✓ Applied 2 files from stash

### Post-flight Verifications:

- ✓ On target branch
- ✓ Target session active
- ✓ Stashed work restored

---

### 📝 Current State

**Branch:** feature/user-auth
**Session:** 0c2a20a7 (active)
**State:** CHANGES_COMMITTED
**Working directory:** 2 files modified (from stash)

---

### Next Steps:

Continue your work. Your uncommitted changes have been restored.
```

---

### 8. /devsolo:abort

**Success Output:**

```
░█▀█░█▀▄░█▀█░█▀▄░▀█▀░▀█▀░█▀█░█▀▀░
░█▀█░█▀▄░█░█░█▀▄░░█░░░█░░█░█░█░█░
░▀░▀░▀▀░░▀▀▀░▀░▀░░▀░░▀▀▀░▀░▀░▀▀▀░

## ⚠ Abort Confirmation

This will:
- Mark session as aborted (0c2a20a7)
- Switch to main branch
- Delete branch: feature/experiment (if --deleteBranch)
- ⚠ Uncommitted changes will be lost unless stashed

Confirm abort? [y/N]: y

---

### Operations Executed:

- ✓ Stashed uncommitted changes (stash@{0})
- ✓ Switched to main branch
- ✓ Deleted branch: feature/experiment (local)
- ✓ Session marked as aborted

### Post-flight Verifications:

- ✓ On main branch
- ✓ Session aborted
- ✓ Branch deleted
- ✓ Uncommitted changes preserved in stash

---

## ✅ Abort Successful

**Operation:** Session aborted and branch deleted

### 📝 Result

- **Branch:** feature/experiment (deleted)
- **Session:** 0c2a20a7 (aborted)
- **Stash:** stash@{0} (if you need to recover work)

---

### Next Steps:

Start fresh with:

```
/devsolo:launch
```

To recover stashed work:
```
git stash pop
```
```

---

### 9. /devsolo:cleanup

**Success Output:**

```
░█▀▀░█░░░█▀▀░█▀█░█▀█░█░█░█▀█░
░█░░░█░░░█▀▀░█▀█░█░█░█░█░█▀▀░
░▀▀▀░▀▀▀░▀▀▀░▀░▀░▀░▀░▀▀▀░▀░░░

## 🔍 Scanning for cleanup candidates...

### Stale Sessions (2)

| ID       | Branch              | State    | Age     |
|----------|---------------------|----------|---------|
| 2d967326 | feature/oauth2      | COMPLETE | 5 days  |
| 9e8d7c6b | feature/experiment  | ABORTED  | 10 days |

### Orphaned Branches (2)

| Branch                    | Last Commit   | Age     |
|--------------------------|---------------|---------|
| feature/old-work         | 3 days ago    | 15 days |
| fix/ancient-bug          | 2 weeks ago   | 30 days |

---

## ⚠ Proposed Actions

- Remove 2 stale sessions
- Delete 2 orphaned branches

Confirm cleanup? [y/N]: y

---

### Operations Executed:

- ✓ Removed session: 2d967326 (feature/oauth2)
- ✓ Removed session: 9e8d7c6b (feature/experiment)
- ✓ Deleted branch: feature/old-work (local)
- ✓ Deleted branch: fix/ancient-bug (local)

### Post-flight Verifications:

- ✓ Stale sessions removed: 2
- ✓ Branches deleted: 2
- ✓ On main branch
- ✓ Working directory clean

---

## ✅ Cleanup Complete

### 📊 Summary

- **Sessions cleaned:** 2
- **Branches deleted:** 2
- **Storage freed:** ~8 KB
- **Total actions:** 4

---

### 📝 Result

Your repository is now tidy:
- Active sessions only
- No orphaned branches
- Clean session storage
```

---

### 10. /devsolo:hotfix

**Success Output (Critical):**

```
░█░█░█▀█░▀█▀░█▀▀░▀█▀░█░█░
░█▀█░█░█░░█░░█▀▀░░█░░▄▀▄░
░▀░▀░▀▀▀░░▀░░▀░░░▀▀▀░▀░▀░

## 🔍 git-droid analysis:

- **Severity:** CRITICAL ⚠
- Current branch: main ✓
- Working directory: clean ✓
- Generated branch: hotfix/critical-auth-bypass

---

### Pre-flight Checks:

- ✓ On main branch
- ✓ Working directory clean
- ✓ Hotfix branch name available
- ⚠ Critical severity: expedited process enabled

### Operations Executed:

- ✓ Created branch: hotfix/critical-auth-bypass
- ✓ Checked out to hotfix branch
- ✓ Created HOTFIX session

### Post-flight Verifications:

- ✓ On hotfix branch
- ✓ Session active (HOTFIX type)
- ✓ Ready for critical fix

---

## ✅ Hotfix Session Started

**Session:** d1e2f3a4 (HOTFIX)
**Branch:** hotfix/critical-auth-bypass
**Severity:** CRITICAL
**State:** BRANCH_READY

---

### ⚠ Critical Hotfix Guidelines

1. **Make MINIMAL changes** to fix the issue
2. **Test locally** before committing
3. **Use /devsolo:commit** with clear hotfix message
4. **Ship immediately** with /devsolo:ship

### Next Steps:

1. Make your fix (keep it minimal!)
2. Test the fix
3. Commit: `/devsolo:commit --message="hotfix: fix critical auth bypass"`
4. Ship: `/devsolo:ship --autoMerge`
```

---

### 11. /devsolo:prime

**Output:**

```
░█▀█░█▀▄░▀█▀░█▀▄▀█░▀█▀░█▀█░█▀▀░
░█▀▀░█▀▄░░█░░█░▀░█░░█░░█░█░█░█░
░▀░░░▀░▀░▀▀▀░▀░░░▀░▀▀▀░▀░▀░▀▀▀░

[Priming workflow executes - reads files and analyzes codebase]

---

## Project Summary

**devsolo** is an AI-native Git workflow automation tool built exclusively for Claude Code.

### Key Features
- One-command workflow (launch → commit → ship)
- 13 native slash commands
- Specialized sub-agents (git-droid, docs-droid)
- State machine control for deterministic workflows
- GitHub integration with PR management

---

## Architecture Overview

### Technology Stack
- Language: TypeScript (Node.js >= 20.0.0)
- MCP SDK: @modelcontextprotocol/sdk
- Git: simple-git
- GitHub: @octokit/rest

### Component Layers
```
Slash Commands → Sub-Agents → MCP Tools → Services → Git/GitHub
```

---

## Directory Structure

### Key Directories
- `src/mcp/` - MCP server and tools
- `src/services/` - Core services
- `src/state-machines/` - Workflow state machines
- `.claude/commands/devsolo/` - 13 slash commands
- `.claude/agents/` - Sub-agent configs
- `docs/` - Documentation (guides, specs, dev docs)

---

## Development Conventions

### Documentation Standards
- Naming: `lowercase-with-hyphens.md`
- User docs → `docs/guides/`
- Dev docs → `docs/dev/system/`
- Plans → `docs/dev/plans/`
- Reports → `docs/dev/reports/`

### Workflow Management
- devsolo enforces its own workflows when `.devsolo/session.json` exists
- Never use direct git commands during active sessions
- Use MCP tools instead

---

**Context established. Ready to work on devsolo codebase.**
```

---

### 12. /devsolo:doc

**Audit Mode Output:**

```
[Uses docs-droid output style - see docs-droid section for full format]

📋 Scanning documentation in docs/...

Found 45 total documents

Issues Found:

Naming Violations (3):
| Current Path                    | Issue      | Suggested Fix              |
|--------------------------------|------------|----------------------------|
| docs/guides/QuickStart.md      | PascalCase | quickstart.md              |
| docs/dev/system/API_Guide.md   | Underscore | api-guide.md               |
| docs/specs/Feature Plan.md     | Spaces     | feature-plan.md            |

[... rest of audit output following docs-droid style ...]
```

---

### 13. /devsolo:status-line

**Enable Output:**

```
[Status line command has simpler output - just reports success]

## ✅ Status Line Enabled

The devsolo status line will now appear in your Claude Code interface.

**Format:** `[devsolo] 💻 {session-id} | {branch} | {state}`

**Example:** `[devsolo] 💻 0c2a20a7 | feature/auth | BRANCH_READY`

To customize, use:
```
/devsolo:status-line update --format="{icon} {branch}"
```
```

---

## Complete Workflow Examples

### Example 1: Simple Feature (Launch → Commit → Ship)

#### Step 1: Launch

```
User: /devsolo:launch

[Banner displays]

git-droid: Analysis shows clean state, prompts for description

User: "Add rate limiting to API"

[Output showing branch created: feature/add-rate-limiting-to-api]
[Session: abc123... State: BRANCH_READY]
```

#### Step 2: Work + Commit

```
User: [makes code changes]

User: /devsolo:commit

[Banner displays]

[Output showing auto-generated message: feat(api): implement rate limiting middleware]
[Files changed shown]
[State: BRANCH_READY → CHANGES_COMMITTED]
```

#### Step 3: Ship

```
User: /devsolo:ship

[Banner displays]

[Output showing:
- Push successful
- PR #126 created
- CI checks: build ✓, test ✓, lint ✓
- PR merged
- Branches cleaned up
- Back on main]
```

---

### Example 2: Multi-Commit Feature

#### Launch

```
/devsolo:launch --description="Refactor authentication module"
[Creates feature/refactor-authentication-module]
```

#### First Commit

```
[User makes changes to login.ts]

/devsolo:commit --message="refactor(auth): simplify login flow"
[Commit 1 created]
```

#### Second Commit

```
[User makes changes to session.ts]

/devsolo:commit --message="refactor(auth): improve session management"
[Commit 2 created]
```

#### Third Commit

```
[User updates tests]

/devsolo:commit --message="test(auth): update authentication tests"
[Commit 3 created]
```

#### Ship All

```
/devsolo:ship

[Auto-generates PR description from all 3 commits]
[Creates PR #127 with summary]
[All commits squashed into one on merge]
```

---

### Example 3: Context Switching (Swap Workflow)

#### Working on Feature A

```
/devsolo:launch --description="Add dashboard analytics"
[Branch: feature/add-dashboard-analytics]

[User makes some changes but doesn't commit]
```

#### Urgent: Switch to Feature B

```
/devsolo:swap --branchName="feature/api-client" --stash

[Output shows:
- Stashed uncommitted changes from feature A
- Switched to feature/api-client (existing session)
- Ready to work on feature B]
```

#### Work on Feature B and Ship

```
[User works on feature B]

/devsolo:commit
/devsolo:ship

[Feature B shipped successfully]
```

#### Return to Feature A

```
/devsolo:swap --branchName="feature/add-dashboard-analytics"

[Output shows:
- Switched back to feature A
- Automatically restored stashed changes
- Can continue where left off]
```

---

### Example 4: Emergency Hotfix

#### Critical Bug Discovered

```
/devsolo:hotfix --issue="production-login-broken" --severity="critical"

[Creates hotfix/production-login-broken]
[HOTFIX session with critical priority]
```

#### Quick Fix

```
[User makes minimal fix]

/devsolo:commit --message="hotfix: fix production login authentication"

[Commit created with hotfix type]
```

#### Immediate Ship

```
/devsolo:ship --autoMerge

[Output shows:
- Push immediately
- PR created
- Expedited CI (critical priority)
- Auto-merged when CI passes
- Deployed to production]
```

---

### Example 5: Staged-Only Commits

#### Work in Progress

```
/devsolo:launch --description="Implement payment processing"

[User makes changes to multiple files:
- payment/stripe.ts (ready to commit)
- payment/paypal.ts (ready to commit)
- payment/crypto.ts (not ready, still testing)]
```

#### Commit Ready Files Only

```
git add payment/stripe.ts payment/paypal.ts

/devsolo:commit --stagedOnly

[Output shows:
- Only stripe.ts and paypal.ts committed
- crypto.ts remains uncommitted
- Can continue working on crypto.ts]
```

#### Later: Commit Remaining Work

```
git add payment/crypto.ts

/devsolo:commit --stagedOnly --message="feat(payment): add cryptocurrency support"

[crypto.ts now committed]
```

#### Ship Everything

```
/devsolo:ship

[All commits shipped together in PR]
```

---

## Error Handling Examples

### Error 1: No Active Session

```
User: /devsolo:commit

[Banner displays]

## ✗ Operation Failed

**Error:** Cannot commit without active session

---

### Pre-flight Checks:

- ✗ No active session on current branch
- ⚠ On branch 'main'
- ✓ Changes detected (ready to commit)

---

### Issue

You are not in an active devsolo workflow session.

### Resolution

Choose one of the following options (in priority order):

**Option 1: Start a new feature workflow**
```
/devsolo:launch
```

**Option 2: Check if you have other active sessions**
```
/devsolo:sessions
/devsolo:swap --branchName="<active-branch>"
```

**Option 3: Use standard git**
```
git commit -m "your message"
```
```

---

### Error 2: Uncommitted Changes During Launch

```
User: /devsolo:launch

[Banner displays]

## 🔍 git-droid analysis:

- Current branch: main ✓
- Working directory: changes present ⚠
- Active session: no ✓

---

### ⚠ Uncommitted Changes Detected

You have uncommitted changes in your working directory:
- src/api/routes.ts (modified)
- src/api/handlers.ts (modified)
- tests/api.test.ts (new file)

Please choose an option:

1. Bring them to the new branch (stash and restore) [RECOMMENDED]
   Risk: Low | Action: Stash changes, create branch, restore stashed changes

2. Discard them (start fresh)
   Risk: High | Action: Permanently discard all uncommitted changes

3. Cancel launch
   Risk: Low | Action: Abort launch operation, stay on current branch
```

---

### Error 3: CI Checks Failed

```
User: /devsolo:ship

[Banner displays]
[Push and PR creation successful]

## ⚠ Waiting for CI Checks

Monitoring checks (timeout: 20 minutes)...

- [00:30] build: running...
- [01:15] build: passed ✓
- [01:20] test: running...
- [03:45] test: FAILED ✗
- [03:50] lint: passed ✓

---

## ✗ Ship Failed

**Error:** CI checks failed

---

### Failed Checks

**test** (failed after 2m 25s):
```
FAIL tests/auth.test.ts
  ● Authentication › should validate tokens

    expect(received).toBe(expected)

    Expected: true
    Received: false

      at Object.<anonymous> (tests/auth.test.ts:45:23)

Tests: 1 failed, 47 passed
```

### Issue

The test suite failed. Your changes have been pushed and the PR has been created, but the merge was not completed.

**PR:** https://github.com/owner/repo/pull/128

### Resolution

**Option 1: Fix the tests**
1. Review the failing test output above
2. Fix the issue locally
3. Commit the fix: `/devsolo:commit`
4. Push again: `/devsolo:ship --push --createPR=false --merge`

**Option 2: Review in PR**
1. Visit the PR to see full CI logs
2. Make fixes
3. Push updates

**Option 3: Abort and fix later**
```
/devsolo:abort
```

### Current State

- Branch: feature/auth-improvements (still checked out)
- Session: Active (state: PR_CREATED)
- PR: #128 (open, CI failed)
```

---

### Error 4: Target Session Not Found (Swap)

```
User: /devsolo:swap --branchName="feature/nonexistent"

[Banner displays]

## ✗ Swap Failed

**Error:** Target session not found

---

### Issue

No active session found for branch `feature/nonexistent`.

### Available Sessions

| ID       | Branch                      | Type    | State            |
|----------|-----------------------------|---------|------------------|
| 0c2a20a7 | feature/user-auth           | feature | CHANGES_COMMITTED|
| 8f3d91bc | feature/api-refactor        | feature | BRANCH_READY     |

### Resolution

**Option 1: Swap to an existing session**
```
/devsolo:swap --branchName="feature/user-auth"
```

**Option 2: Start a new session**
```
/devsolo:launch --branchName="feature/nonexistent"
```

**Option 3: List all sessions**
```
/devsolo:sessions --all
```
```

---

### Error 5: GitHub Authentication Missing

```
User: /devsolo:ship

[Banner displays]

## ✗ Ship Failed

**Error:** GitHub authentication not configured

---

### Pre-flight Checks:

- ✓ All changes committed
- ✓ Session ready to ship
- ✗ GitHub authentication not configured

---

### Issue

GitHub authentication is required to create pull requests and merge.

### Resolution

**Option 1: Use GitHub CLI (Recommended)**
```bash
gh auth login
```

**Option 2: Set environment variable**
```bash
export GITHUB_TOKEN=your_token_here
```

**Option 3: Use standard git workflow**
```bash
git push origin feature/your-branch
gh pr create
```

After authentication is configured, try shipping again:
```
/devsolo:ship
```
```

---

## Consistency Checklist

Use this checklist when creating or reviewing command outputs:

### Visual Structure
- [ ] Unique ASCII art banner displayed before operation
- [ ] Clear section headers (`##` for major, `###` for subsections)
- [ ] Horizontal rules (`---`) between major sections
- [ ] Double newlines between sections
- [ ] Single newlines between list items
- [ ] Proper code block formatting with triple backticks

### Content Flow (git-droid commands - with validation)
- [ ] Analysis phase first (🔍 if applicable)
- [ ] **"Pre-flight Checks:"** section (EXACT label with colon)
- [ ] **"Operations Executed:"** section (EXACT label with colon)
- [ ] **"Post-flight Verifications:"** section (EXACT label with colon)
- [ ] Result summary (✅ success or ✗ error)
- [ ] **"Next Steps:"** section (EXACT label with colon)
- [ ] All section labels use correct capitalization
- [ ] All section labels end with colons

### Content Flow (docs-droid commands)
- [ ] Analysis phase (📋 scanning/analyzing)
- [ ] Issue summary with tables
- [ ] **Numbered options (1, 2, 3)** for 3+ choices with [RECOMMENDED] marker
- [ ] Yes/no confirmation for simple binary choices
- [ ] Risk level and Action shown for all options
- [ ] Actions completed with details
- [ ] Summary with counts (📊)

### Content Flow (query commands)
- [ ] Main content (status info, session list, etc.)
- [ ] **"Next Steps:"** section (EXACT label with colon)
- [ ] No pre-flight/post-flight checks (read-only operations)
- [ ] Clean, concise output format

### Icons and Symbols
- [ ] ✓ for passed checks and successful operations
- [ ] ✗ for failed checks and errors
- [ ] ⚠ for warnings and cautions
- [ ] 🔍 for analysis and investigation
- [ ] 📋 for info and lists
- [ ] ✅ for complete/successful results
- [ ] 📊 for summaries and statistics

### Error Handling
- [ ] Clear error message in header
- [ ] Pre-flight checks showing what failed
- [ ] Issue description explaining the problem
- [ ] Resolution section with actionable steps
- [ ] Multiple options when applicable
- [ ] Code examples for next steps

### Tone and Language
- [ ] Professional and clear
- [ ] Active voice ("Created branch" not "Branch was created")
- [ ] Imperative mood for next steps ("Run /devsolo:ship" not "You should run")
- [ ] Consistent terminology across all commands
- [ ] No unnecessary verbosity

### State Information
- [ ] Session ID shown (short form for brevity)
- [ ] Branch name clearly displayed
- [ ] State shown and explained
- [ ] State transitions documented (BRANCH_READY → CHANGES_COMMITTED)
- [ ] Metadata included when relevant

### Next Steps Section
- [ ] Always include **"Next Steps:"** section (with colon)
- [ ] Use specific command examples
- [ ] Make next actions obvious
- [ ] Link related commands
- [ ] Guide user forward in workflow

### User Options (when presenting choices)
- [ ] Use **numbered format (1, 2, 3)** for 3+ choices
- [ ] Mark one option as **[RECOMMENDED]**
- [ ] Show **Risk level** (Low/Medium/High) for each option
- [ ] Show **Action** (what will be executed) for each option
- [ ] Use yes/no for simple binary confirmations
- [ ] Present options before execution, not after

### Tables
- [ ] Use tables for multiple items (sessions, files, checks)
- [ ] Consistent column headers
- [ ] Aligned columns
- [ ] Include totals/summaries
- [ ] Empty state handled gracefully

### Spacing and Readability
- [ ] No walls of text
- [ ] Grouped related information
- [ ] Visual hierarchy clear
- [ ] Scannable at a glance
- [ ] Important info highlighted

---

## Notes for Maintainers

1. **Update This Document**: When adding new commands or changing output formats, update this document immediately.

2. **Consistency is Key**: Users should instantly recognize output from any devsolo command. The patterns here ensure that recognition.

3. **Banner Identity**: Each command's unique ASCII banner provides immediate visual feedback about which operation is running. **IMPORTANT**: Banners must be displayed at the command level, BEFORE invoking sub-agents, so users see them immediately.

4. **Exact Section Labels**: The following section labels MUST be used exactly as shown (including capitalization and colons):
   - **"Pre-flight Checks:"** (not "Pre-flight checks" or "PreFlight")
   - **"Operations Executed:"** (not "Operations" or "Operations executed")
   - **"Post-flight Verifications:"** (not "Post-flight verifications")
   - **"Next Steps:"** (not "Next steps")

   These exact labels are critical for pattern recognition and consistency across all commands.

5. **User Options Format**: When presenting choices:
   - **3+ options**: Use numbered format (1, 2, 3) with [RECOMMENDED] marker, Risk level, and Action
   - **2 options**: Use yes/no confirmation for simple binary choices
   - Always present options BEFORE execution

6. **Error Messages Matter**: Errors should never leave users stranded. Always provide actionable resolution steps with specific command examples.

7. **Next Steps Always**: Every command output must include a "Next Steps:" section guiding the user to the next logical action.

8. **Test Output Rendering**: Claude Code renders markdown - test your output to ensure it displays correctly.

9. **Sub-Agent Responsibility**:
   - **MCP tools** return structured data (PreFlightCheckResult[], PostFlightCheckResult[], CheckOption[])
   - **Sub-agents** format this data using templates from output style guides
   - **Commands** orchestrate and display banners first

10. **Layer Separation**: Maintain clear boundaries:
    - Commands: Display banner, invoke sub-agent, pass arguments
    - Sub-agents: Format MCP results into user-friendly output
    - MCP tools: Execute operations, return structured data

---

**Last Updated**: 2025-10-14 (Updated for command output consistency alignment)
**Maintainer**: Review this document during any command output changes
**Related Docs**:
- `.claude/output-styles/git-droid.md` - git-droid formatting templates
- `.claude/output-styles/docs-droid.md` - docs-droid formatting templates
- `.claude/agents/git-droid.md` - git-droid agent definition
- `.claude/agents/docs-droid.md` - docs-droid agent definition
- `.claude/commands/devsolo/*.md` - All 13 command definitions
- `specs/004-command-output-consistency-alignment.md` - Feature specification
