# Critical Bug Report: V1 Ship Workflow Failure

## Issue Summary

The v1 `hansolo ship` command has a critical workflow bug that leaves repositories in an inconsistent state after PR merges. This is the exact problem that v2 was designed to solve.

## What Happened

**Expected Workflow:**
```
ship → commit → push → create PR → merge → sync main → delete branches → complete session
```

**Actual V1 Behavior:**
```
ship           # No changes (already committed)
ship --push    # Pushed to remote ✅
ship --create-pr # Created PR ✅
PR merged on GitHub ✅
❌ NO automatic cleanup
❌ Session state NOT updated
❌ Still on feature branch
❌ Branches NOT deleted
❌ Main NOT synced
```

## Root Causes

### 1. Multi-Step Manual Process
V1 requires multiple invocations with different flags:
- `ship` - commit
- `ship --push` - push
- `ship --create-pr` - create PR
- `ship --merge` - merge (but doesn't work if PR was merged externally)

### 2. Session Doesn't Track PR
```typescript
// V1 session.metadata.pr doesn't save the PR number
// So ship --merge can't find the PR to merge
```

### 3. External Merge Not Detected
If PR is merged through GitHub UI or auto-merge:
- Ship command doesn't know it happened
- Session stays in wrong state
- Cleanup never runs

### 4. No Post-Merge Hook
V1 has no mechanism to trigger cleanup after a merge happens

## Evidence

From actual failed workflow:
```bash
$ gh pr view 17 --json mergedAt,state
{
  "mergedAt": "2025-10-02T18:49:24Z",
  "state": "MERGED"
}

$ git branch --show-current
feature/v2-implementation  # ❌ Still on feature branch!

$ hansolo status
Session: feature/v2-implementation
State: BRANCH_READY  # ❌ Should be COMPLETE!

$ git log origin/main -1
4ada1a3 feat: implement v2 with pre/post-flight checks (#17)  # ✅ Merge is on main

$ git log origin/feature/v2-implementation -1
c294a53 feat: implement v2 with pre/post-flight checks  # ❌ Remote branch still exists!
```

## Impact

**For Users:**
- Manual cleanup required after every PR merge
- Easy to forget and accumulate orphaned branches
- Repository becomes cluttered
- Session state tracking breaks
- Can't rely on workflow automation

**For Repository:**
- Orphaned feature branches pile up
- Stale sessions accumulate
- Main branch not automatically synced
- Linear history not enforced programmatically

## V2 Solution

V2 fixes this with a single automated command:

```typescript
// From hansolo-ship-v2.ts
async executeCompleteWorkflow(session, options) {
  // 1. Commit changes (if any)
  if (await this.gitOps.hasUncommittedChanges()) {
    await this.commitChanges(session, options.message);
  }

  // 2. Push to remote
  await this.pushToRemote(session, options.force);

  // 3. Create or update PR
  const pr = await this.createOrUpdatePR(session);

  // 4. Wait for checks and auto-merge
  await this.waitAndMerge(session, pr.number, options.yes);

  // 5. Sync main and cleanup ← THIS IS THE FIX!
  await this.syncMainAndCleanup(session);
}

private async syncMainAndCleanup(session) {
  // Switch to main
  await this.gitOps.checkoutBranch('main');

  // Pull latest (includes squashed commit)
  await this.gitOps.pull('origin', 'main');

  // Delete local branch
  await this.gitOps.deleteBranch(session.branchName, true);

  // Delete remote branch
  await this.gitOps.deleteRemoteBranch(session.branchName);

  // Mark session complete
  session.transitionTo('COMPLETE', 'auto_progression');
  await this.sessionRepo.updateSession(session.id, session);
}
```

## Why V2 Replacement Failed

Attempted to replace v1 commands with v2, but:

1. **API Mismatch** - V2 commands have different method signatures
2. **Missing Methods** - V1 had `resume()`, `abortAll()` methods v2 doesn't
3. **Interface Differences** - V2 doesn't implement `CommandHandler` interface
4. **CLI Integration** - CLI and MCP server expect v1 API

## Required Fix

### Option 1: Adapter Layer (Recommended)
Create adapters that wrap v2 commands with v1 API:

```typescript
// src/commands/adapters/ship-adapter.ts
export class ShipCommand {
  private v2Command = new ShipCommandV2();

  async execute(options) {
    // Translate v1 options to v2
    return this.v2Command.execute({
      message: options.message,
      yes: options.yes,
      force: options.force,
    });
  }

  // Support legacy methods
  async push(options) {
    return this.execute({ ...options });
  }

  async createPR(options) {
    return this.execute({ ...options });
  }

  async merge(options) {
    return this.execute({ ...options });
  }
}
```

### Option 2: Full CLI Refactor
- Update CLI to use v2 API directly
- Remove legacy method calls
- Update MCP server
- Breaking change for scripts

### Option 3: Hybrid Approach
- Use v2 for new installs
- Keep v1 available with deprecation warnings
- Migrate over time

## Immediate Workaround

Until v2 is integrated, users must manually run cleanup:

```bash
# After PR merges
git checkout main
git pull origin main
git branch -d feature/branch-name
hansolo cleanup  # Or manual git push origin --delete feature/branch-name
```

## Test Case for V2

```bash
# This should work end-to-end without manual intervention
hansolo launch "test-feature"
# ... make changes ...
hansolo ship
# After CI passes:
# ✅ Should be on main
# ✅ Session should be COMPLETE
# ✅ Feature branches should be deleted (local and remote)
# ✅ Main should have the squashed commit
```

## Priority

**CRITICAL** - This affects every single PR merge workflow and causes repository clutter.

## Recommended Action

1. Create adapter layer to wrap v2 commands
2. Update CLI to use adapters
3. Add integration tests for complete workflow
4. Document migration path for users
5. Add pre-commit hook to prevent direct v1 ship usage
