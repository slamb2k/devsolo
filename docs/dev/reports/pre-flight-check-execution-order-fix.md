# Pre-Flight Check Execution Order Fix

**Date**: 2025-10-15
**Issue**: Launch tool bypassing pre-flight checks by auto-stashing before checks run
**Status**: ✅ Fixed

## Problem

The launch tool had a critical architectural flaw where pre-flight checks were running AFTER state modifications, causing them to always pass even when they should fail.

### Execution Flow (Before Fix)

```
1. collectMissingParameters()
2. createContext()
   └─ determineBranchName()
   └─ handleUncommittedChanges() → AUTO-STASHES CHANGES
   └─ handleActiveSession()
3. runPreFlightChecks()
   └─ workingDirectoryClean → ALWAYS PASSES (already stashed!)
4. executeWorkflow()
```

### The Issue

- `createContext()` was auto-stashing uncommitted changes
- `runPreFlightChecks()` ran AFTER the stash
- The `workingDirectoryClean` check always passed
- Users never saw pre-flight check failures for dirty working directory
- Launch would proceed and potentially fail later with errors

### User Impact

> "WHY IS LAUNCHING THROWING ERRORS RATHER THAN THE PRE-FILTER CHECKS CAUSING A LAUNCH WITH NO ERRORS?????"

- Pre-flight checks were supposed to catch uncommitted changes and fail gracefully
- Instead, changes were auto-stashed, checks passed, and errors occurred during execution
- No clear feedback to user about what went wrong

## Solution

### Key Insight

`createContext()` should only **gather context data**, not **modify state**. State modifications belong in `executeWorkflow()` which runs AFTER pre-flight checks pass.

### Changes Made

#### 1. Simplified `createContext()` (launch-tool.ts:103-115)

**Before**:
```typescript
protected async createContext(input: LaunchToolInput): Promise<Record<string, unknown>> {
  const branchName = await this.determineBranchName(input);

  const stashResult = await this.handleUncommittedChanges(input); // MODIFIES STATE
  const abortResult = await this.handleActiveSession(); // MODIFIES STATE

  return { branchName, stashPopped, stashRef };
}
```

**After**:
```typescript
protected async createContext(input: LaunchToolInput): Promise<Record<string, unknown>> {
  // NOTE: This only determines the name, does NOT modify state
  // State modifications (stashing, aborting sessions) happen in executeWorkflow()
  const branchName = await this.determineBranchName(input);

  return { branchName };
}
```

#### 2. Removed Auto-Stashing from `executeWorkflow()` (launch-tool.ts:135-180)

**Before**:
```typescript
protected async executeWorkflow(context: WorkflowContext): Promise<WorkflowExecutionResult> {
  const stashResult = await this.handleUncommittedChanges(input); // AUTO-STASH
  await this.handleActiveSession();

  const session = await this.createSession(...);
  await this.createBranch(...);

  if (stashResult.stashRef) {
    await this.gitOps.stashPopSpecific(stashResult.stashRef); // AUTO-POP
  }
}
```

**After**:
```typescript
protected async executeWorkflow(context: WorkflowContext): Promise<WorkflowExecutionResult> {
  // NOTE: Pre-flight checks have already verified working directory is clean
  // If we reach this point, there are no uncommitted changes to handle

  await this.handleActiveSession();
  const session = await this.createSession(...);
  await this.createBranch(...);

  // Only restore if user explicitly provided a stash reference
  if (input.stashRef && input.popStash !== false) {
    await this.gitOps.stashPopSpecific(input.stashRef);
  }
}
```

#### 3. Removed `handleUncommittedChanges()` Method

This method is no longer needed since:
- Pre-flight checks ensure working directory is clean
- No auto-stashing happens
- Users must explicitly handle uncommitted changes before launching

### Execution Flow (After Fix)

```
1. collectMissingParameters()
2. createContext()
   └─ determineBranchName() (read-only)
3. runPreFlightChecks()
   └─ workingDirectoryClean → FAILS if dirty! ✅
4. If checks pass: executeWorkflow()
   └─ handleActiveSession()
   └─ createSession()
   └─ createBranch()
```

## Expected Behavior

### Before Launch

User must have a clean working directory:
- Commit changes: `git commit -am "message"`
- Stash changes: `git stash`
- Discard changes: `git restore .`

### Launch Attempt with Uncommitted Changes

```bash
$ devsolo launch
❌ Failed

🔍 Pre-flight Checks:
  ✓ On Main Branch: Currently on main
  ✗ Working Directory Clean: 3 unstaged, 2 untracked files
    💡 git commit -am "message" OR git stash
  ✓ Main Branch Up To Date: main is up to date with remote

❌ Errors:
  - 3 unstaged, 2 untracked files
```

### Launch with Clean Working Directory

```bash
$ devsolo launch
✅ Success

🔍 Pre-flight Checks:
  ✓ On Main Branch: Currently on main
  ✓ Working Directory Clean: No uncommitted changes
  ✓ Main Branch Up To Date: main is up to date with remote
  ✓ No Existing Session: No active session on branch 'main'
  ✓ Branch Name Available: Branch name 'feature/my-feature' is available

✅ Launched successfully on branch 'feature/my-feature'
```

## Benefits

1. **Clear Feedback**: Users see exactly what's wrong via pre-flight checks
2. **No Hidden State Changes**: Launch doesn't auto-stash without user knowledge
3. **Explicit Control**: Users must explicitly handle uncommitted changes
4. **Predictable Behavior**: Pre-flight checks accurately reflect repository state
5. **Fail Fast**: Problems caught before any state modifications occur

## Related Documentation

- [Git-Droid Agent Workflow](../learnings/git-droid-agent-workflow.md) - How to route git operations
- [Prompt-Based Parameter Collection](../learnings/prompt-based-parameter-collection.md) - Parameter handling pattern

## Testing

To test the fix:

1. Make uncommitted changes
2. Run `devsolo launch`
3. Should see pre-flight check failure with clear error message
4. Commit or stash changes
5. Run `devsolo launch` again
6. Should succeed

## Future Improvements

- Add auto-mode option to automatically stash if user wants that behavior
- Provide suggested commands in pre-flight check failures
- Consider interactive mode to offer stashing as an option
