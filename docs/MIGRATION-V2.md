# Migration Guide: v1 → v2

## Overview

Han-Solo v2 simplifies the workflow by making the ship command fully automatic. Instead of running ship multiple times with different flags, you now run it once and it handles everything.

## Breaking Changes

### Removed Flags

The following flags have been removed from the `ship` command:

- ❌ `--push` - No longer needed (automatic)
- ❌ `--create-pr` - No longer needed (automatic)
- ❌ `--merge` - No longer needed (automatic)

### Kept Flags

These flags remain available:

- ✅ `--message <msg>` - Custom commit message
- ✅ `--yes` / `-y` - Skip confirmations
- ✅ `--force` / `-f` - Override safety checks

## Migration Examples

### Example 1: Full Workflow

**v1 - Multiple Commands:**
```bash
# Step 1: Commit
hansolo ship

# Step 2: Push
hansolo ship --push

# Step 3: Create PR
hansolo ship --create-pr

# Step 4: Merge (after CI passes)
hansolo ship --merge
```

**v2 - Single Command:**
```bash
# Does everything automatically
hansolo ship

# Or skip confirmations for automation
hansolo ship --yes
```

### Example 2: Custom Commit Message

**v1:**
```bash
hansolo ship --message "feat: add user authentication"
hansolo ship --push
hansolo ship --create-pr
hansolo ship --merge
```

**v2:**
```bash
hansolo ship --message "feat: add user authentication"
```

### Example 3: Force Ship

**v1:**
```bash
hansolo ship --force
hansolo ship --push --force
hansolo ship --create-pr --force
hansolo ship --merge --force
```

**v2:**
```bash
hansolo ship --force
```

## What Changed?

### Automatic Workflow

The ship command now executes a complete workflow:

1. **Commits changes** (if any uncommitted changes exist)
   - Runs pre-commit hooks (lint, typecheck)

2. **Pushes to remote**
   - Runs pre-push hooks (tests)
   - Sets upstream automatically

3. **Creates or updates PR**
   - Detects if PR already exists (updates it)
   - Detects if multiple PRs exist (blocks - manual intervention)
   - Creates new PR if none exists

4. **Waits for CI checks**
   - Polls PR status every 30 seconds
   - Shows progress: `✓ 3 passed | ⏳ 2 pending | ✗ 0 failed`
   - Fails if any check fails

5. **Auto-merges PR**
   - Uses squash merge
   - Preserves PR title and description

6. **Syncs main and cleanup**
   - Switches to main branch
   - Pulls latest changes (includes squashed commit)
   - Deletes local feature branch
   - Deletes remote feature branch
   - Marks session as complete

### Enhanced Safety

v2 includes comprehensive pre-flight checks:

- ✅ Session validation
- ✅ Branch reuse prevention
- ✅ PR conflict detection
- ✅ Git hook verification

And post-flight verifications:

- ✅ PR merged successfully
- ✅ Branches deleted
- ✅ Main synced
- ✅ Session completed
- ✅ Clean working directory

## New Commands

### Launch Command Enhanced

**Pre-flight checks added:**
```bash
hansolo launch "my-feature"

🔍 Pre-Flight Checks (5/5 passed)
  ✓ On main/master branch: main
  ✓ Working directory clean
  ✓ Main up to date with origin
  ✓ No existing session
  ✓ Branch name available: feature/my-feature
```

**Post-flight verifications:**
```bash
✅ Post-Flight Verification (5/5 passed)
  ✓ Session created: ID: abc12345...
  ✓ Feature branch created: feature/my-feature
  ✓ Branch checked out: feature/my-feature
  ✓ Session state: BRANCH_READY
  ✓ No uncommitted changes
```

### Cleanup Command Enhanced

**What changed:**
- Automatically syncs main branch before cleanup
- Verifies orphaned branches are removed
- Post-flight checks ensure clean state

**Usage:**
```bash
hansolo cleanup

# Dry run to see what would be cleaned
hansolo cleanup --dry-run

# Skip confirmation
hansolo cleanup --yes
```

### Status Command Enhanced

**What changed:**
- Pre-flight checks ensure valid state
- Richer output with session details
- Shows PR information if available

**Usage:**
```bash
hansolo status

# Verbose output with full details
hansolo status --verbose
```

## State Machine Simplification

### v1 State Machine
User manually progressed through states:
- BRANCH_READY → CHANGES_COMMITTED (ship)
- CHANGES_COMMITTED → PUSHED (ship --push)
- PUSHED → PR_CREATED (ship --create-pr)
- PR_CREATED → MERGED (ship --merge)
- MERGED → COMPLETE (cleanup)

### v2 State Machine
Ship command handles all transitions automatically:
- BRANCH_READY → COMPLETE (ship)

**Note:** Internal states still exist but are managed automatically.

## Common Migration Issues

### Issue 1: "I used to ship incrementally"

**v1 Behavior:**
```bash
hansolo ship                 # Commit only
# Review changes, make more commits
hansolo ship                 # Commit again
# When ready
hansolo ship --push --create-pr --merge
```

**v2 Solution:**
```bash
git add .
git commit -m "WIP: partial changes"
# Make more changes
git add .
git commit -m "feat: complete feature"
# When ready
hansolo ship  # Does everything
```

**Alternative:**
Use git directly for intermediate commits, ship when complete.

### Issue 2: "I want to create PR but not merge yet"

**v1 Behavior:**
```bash
hansolo ship --push --create-pr
# Wait for review
# Later...
hansolo ship --merge
```

**v2 Solution:**
v2 waits for CI checks to pass before merging. If you need manual review before merge, you can:

1. Use GitHub's "require review" branch protection
2. CI checks will wait indefinitely until approved
3. Ship will only merge after approval + CI pass

**Workaround for immediate PR creation:**
Create PR manually on GitHub, then ship will detect and update it.

### Issue 3: "What if CI fails?"

**v1 Behavior:**
```bash
hansolo ship --merge
# Fails if CI not passing, must fix and re-run
```

**v2 Behavior:**
```bash
hansolo ship
# Waits for CI checks
# If checks fail, ship aborts
# Fix issues, commit, and run ship again
```

Ship intelligently detects if PR already exists and updates it.

## Backward Compatibility

### Command Aliases

All old commands still work:

```bash
hansolo launch     # Works
hansolo ship       # Works (but with new behavior)
hansolo abort      # Works
hansolo swap       # Works
hansolo status     # Works
hansolo sessions   # Works
hansolo cleanup    # Works
```

### Flag Support

Old flags are **ignored** with a warning:

```bash
hansolo ship --push
# ⚠️  Warning: --push flag is deprecated (auto-enabled in v2)
# Ship proceeds with full workflow
```

## Recommended Workflow

### v2 Best Practice

```bash
# 1. Start feature
hansolo launch "add-feature"

# 2. Make changes and commit as you go
git add .
git commit -m "feat: add feature part 1"

git add .
git commit -m "feat: add feature part 2"

# 3. Ship everything when ready
hansolo ship

# Done! Feature is merged, branches cleaned up, ready for next feature.
```

### Multiple Features Workflow

```bash
# Start feature 1
hansolo launch "feature-1"
# Work on feature 1...

# Swap to feature 2
hansolo launch "feature-2"
# Work on feature 2...

# Swap back to feature 1
hansolo swap feature-1
# Complete feature 1
hansolo ship

# Back to feature 2
hansolo swap feature-2
# Complete feature 2
hansolo ship
```

## Rollback Plan

If you need to rollback to v1 behavior:

```bash
npm install @hansolo/cli@1.x
```

Or use git commands directly:

```bash
git add .
git commit -m "message"
git push origin feature-branch
gh pr create
# Manual merge on GitHub
git checkout main
git pull
git branch -d feature-branch
```

## Questions?

- Check the [README](../README.md) for updated usage
- See [PRE-FLIGHT-CHECKS.md](./PRE-FLIGHT-CHECKS.md) for validation details
- Report issues on GitHub

## Summary

**The Bottom Line:**
- v1: 4 commands to ship → v2: 1 command to ship
- More safety checks
- Clearer output
- Less room for error
- Faster workflow
