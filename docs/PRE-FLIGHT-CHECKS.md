# Pre-Flight and Post-Flight Checks

All han-solo commands implement comprehensive pre-flight and post-flight checks to ensure safe, predictable operations.

## Philosophy

- **Pre-flight checks**: Validate conditions before making any changes
- **Post-flight verifications**: Confirm expected state after operations complete
- **Visual feedback**: All checks displayed to user with clear ✓/⚠/✗ indicators
- **Fail fast**: Catch issues early before modifying repository state
- **Suggestions**: Failed checks provide actionable recommendations

## Check Output Format

```
🔍 Pre-Flight Checks (5/5 passed)
  ✓ Check name: Success message
  ⚠ Check name: Warning message
  ✗ Check name: Failure message
    Suggestion: How to fix this issue
    Suggestion: Alternative approach

✓ All checks passed (5/5)
```

---

## Launch Command

### Pre-Flight Checks

| Check | Purpose | Failure Action |
|-------|---------|----------------|
| **On main/master branch** | Ensure starting from correct base | Block unless --force |
| **Working directory clean** | No uncommitted changes present | Block unless --force |
| **Main up to date with origin** | Latest changes pulled | Warn but allow |
| **No existing session** | No active session on current branch | Block (prevents conflicts) |
| **Branch name available** | Branch not previously used for merged PR | Block (prevents reuse) |

#### Branch Name Availability Details

The branch validator checks:
- Local branch doesn't exist
- Remote branch doesn't exist
- No previous session used this branch for a merged PR

**Blocked scenarios:**
- Branch was merged and deleted → Name is retired
- Branch was merged, deleted, then recreated → Critical error

**Allowed scenarios:**
- Branch was aborted (never merged) → Safe to reuse
- Fresh name never used before

**Suggestions when blocked:**
```
Suggestion: feature/my-feature-v2
Suggestion: feature/my-feature-2024-10-03
Suggestion: feature/my-feature-continued
```

### Post-Flight Verifications

| Verification | Expected State |
|--------------|----------------|
| **Session created** | Valid session ID exists |
| **Feature branch created** | Local branch exists |
| **Branch checked out** | Currently on new branch |
| **Session state** | State = BRANCH_READY |
| **No uncommitted changes** | Working directory clean |

---

## Ship Command

### Pre-Flight Checks

| Check | Purpose | Failure Action |
|-------|---------|----------------|
| **Session valid** | Active session exists for current branch | Block |
| **Not on main branch** | Prevent shipping from main | Block |
| **GitHub integration configured** | Can create/merge PRs | Block |
| **No branch reuse detected** | Branch hasn't been merged and recreated | Block (critical) |
| **No PR conflicts** | Only one PR per branch lifecycle | Block if multiple PRs |
| **Git hooks configured** | Pre-commit, pre-push hooks installed | Warn but allow |

#### Branch Reuse Detection

Checks for dangerous reuse scenarios:

**CRITICAL - Blocks Ship:**
- Branch was deleted after merge, then recreated
- Indicates improper workflow (should use new branch name)

**WARNING - Allows with Notice:**
- Adding commits after previous PR merged
- Will create new PR for additional changes

#### PR Conflict Detection

Enforces single PR per branch lifecycle:

| Scenario | Action | Reason |
|----------|--------|--------|
| Multiple open PRs | **BLOCK** | Manual intervention required |
| Single open PR exists | **UPDATE** | Push updates existing PR |
| Previous PR merged | **CREATE NEW** | Additional changes after merge |
| No PR exists | **CREATE** | First PR for branch |

### Post-Flight Verifications

| Verification | Expected State |
|--------------|----------------|
| **PR merged** | PR merged successfully on GitHub |
| **Feature branches deleted** | Local and remote branches removed |
| **Main branch synced** | Local main has squashed commit |
| **Session marked complete** | State = COMPLETE |
| **Currently on main** | Switched back to main branch |
| **No uncommitted changes** | Working directory clean |
| **Single PR lifecycle maintained** | No duplicate PRs detected |

---

## Cleanup Command

### Pre-Flight Checks

| Check | Purpose | Failure Action |
|-------|---------|----------------|
| **Git repository** | Valid git repository | Block |
| **Han-solo initialized** | .hansolo directory exists | Block |

### Post-Flight Verifications

| Verification | Expected State |
|--------------|----------------|
| **On main branch** | Switched to main (or warning) |
| **Orphaned branches removed** | Branches without sessions deleted |
| **No stale sessions** | Completed/aborted sessions removed |
| **Working directory clean** | No uncommitted changes (or warning) |

**Note:** Cleanup includes automatic main branch sync before operations to ensure local main has all merged PR commits.

---

## Abort Command

### Pre-Flight Checks

| Check | Purpose | Failure Action |
|-------|---------|----------------|
| **Session exists** | Valid session for branch | Block |
| **Git repository** | Valid git repository | Block |

### Workflow Safety

- Detects uncommitted changes
- Offers to stash changes before aborting
- Confirms destructive actions (--yes to skip)
- Optionally deletes feature branch

### Post-Flight Verifications

| Verification | Expected State |
|--------------|----------------|
| **Session marked as aborted** | State = ABORTED |
| **On main branch** | Switched to main |
| **Feature branch deleted** | Branch removed (if --delete-branch) |
| **No uncommitted changes** | Clean state (or warning if stashed) |

---

## Swap Command

### Pre-Flight Checks

| Check | Purpose | Failure Action |
|-------|---------|----------------|
| **Target session exists** | Valid session for target branch | Block |
| **Not already on branch** | Prevent no-op swap | Block |

### Workflow Safety

- Detects uncommitted changes
- Offers to stash changes before swapping
- Blocks swap if changes present (unless --stash or --force)

### Post-Flight Verifications

| Verification | Expected State |
|--------------|----------------|
| **On target branch** | Currently on requested branch |
| **Session active** | Target session is active |
| **Changes stashed** | Stash created (if applicable) |

---

## Status Command

### Pre-Flight Checks

| Check | Purpose | Failure Action |
|-------|---------|----------------|
| **Git repository** | Valid git repository | Block |
| **Han-solo initialized** | .hansolo directory exists | Block |

**Output:** Read-only status display, no post-flight checks needed.

---

## Sessions Command

### Pre-Flight Checks

| Check | Purpose | Failure Action |
|-------|---------|----------------|
| **Han-solo initialized** | .hansolo directory exists | Block |

**Output:** Read-only session list, no post-flight checks needed.

---

## Defensive Guarantees

All commands enforce these invariants:

1. **Single Active Session** - Only one session per branch at a time
2. **Single PR Lifecycle** - Only one PR per feature branch lifecycle
3. **No Branch Reuse** - Branch names cannot be reused after merge + deletion
4. **Main Always Synced** - Main branch synced after every merge
5. **Complete Cleanup** - All branches/sessions cleaned up after merge
6. **Visible Checks** - All validations shown to user
7. **Clear Failures** - Failures include suggestions for resolution
8. **Atomic Operations** - Operations complete fully or not at all

## Override Mechanisms

### --force Flag
- Bypasses non-critical checks (working directory clean, uncommitted changes)
- Does NOT bypass critical checks (session exists, branch reuse, PR conflicts)
- Use with caution - can lead to lost work

### --yes Flag
- Skips confirmation prompts
- Does NOT skip validation checks
- Safe for automation/scripting

## Check Framework

All commands use the extensible check framework:

```typescript
class MyPreFlightChecks extends PreFlightChecks {
  private setupChecks(): void {
    this.addCheck(async () => this.checkSomething());
    this.addCheck(async () => this.checkSomethingElse());
  }

  private async checkSomething(): Promise<CheckResult> {
    const isValid = await validateSomething();

    return {
      passed: isValid,
      name: 'Check name',
      message: isValid ? 'Success message' : 'Failure message',
      level: isValid ? 'info' : 'error',
      suggestions: isValid ? undefined : ['How to fix', 'Alternative approach'],
    };
  }
}
```

This ensures consistency across all commands while allowing custom validation logic.
