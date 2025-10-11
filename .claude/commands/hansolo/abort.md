# Abort

Cancel the current workflow session and optionally delete the feature branch.

## Arguments

- `branchName` (optional): Branch to abort (default: current branch)
- `deleteBranch` (optional): Delete the branch after aborting (default: false)
- `force` (optional): Force abort even with uncommitted changes (default: false)
- `yes` (optional): Skip confirmation prompts (default: false)

## Workflow

1. **Invoke git-droid sub-agent** to coordinate the abort workflow
2. git-droid will:
   - Verify session exists for the target branch
   - Check for uncommitted changes
   - If uncommitted changes present:
     - Offer to stash them (unless force=true)
     - Warn about potential data loss
   - Confirm abort (destructive action, unless yes=true)
   - **Display the following banner immediately before calling the MCP tool:**

```
░█▀█░█▀▄░█▀█░█▀▄░▀█▀░▀█▀░█▀█░█▀▀░
░█▀█░█▀▄░█░█░█▀▄░░█░░░█░░█░█░█░█░
░▀░▀░▀▀░░▀▀▀░▀░▀░░▀░░▀▀▀░▀░▀░▀▀▀░
```

   - Call `mcp__hansolo__hansolo_abort` with parameters
   - Switch to main branch
   - Optionally delete the feature branch
   - Mark session as aborted
   - Report results following git-droid output style

## Abort Workflow Details

```
1. Pre-flight Checks:
   ✓ Session exists for branch
   ✓ Not currently on main branch
   ✓ Uncommitted changes handled (stashed or force)

2. Confirmation:
   ⚠ Abort will:
   - Mark session as aborted
   - Switch to main branch
   - Optionally delete branch (if --deleteBranch)
   - Any uncommitted changes will be lost (unless stashed)

   Confirm? [y/N]

3. Abort Operation:
   - Stash uncommitted changes (if requested)
   - Switch to main branch
   - Delete feature branch (if requested)
   - Mark session as aborted
   - Update session state

4. Post-flight Verifications:
   ✓ On main branch
   ✓ Session marked aborted
   ✓ Branch deleted (if requested)
```

## Examples

```
# Abort current session (prompts for confirmation)
/hansolo abort

# Abort and delete branch
/hansolo abort --deleteBranch

# Abort specific branch
/hansolo abort --branchName="feature/old-work" --deleteBranch

# Force abort without prompts (loses uncommitted changes)
/hansolo abort --force --yes

# Abort with stashing
/hansolo abort --deleteBranch
# (will prompt to stash if uncommitted changes present)
```

## Safety Features

1. **Uncommitted Changes Protection**:
   - Detects uncommitted changes
   - Offers to stash them
   - Warns about data loss if force=true

2. **Confirmation Prompt**:
   - Shows what will happen
   - Requires explicit confirmation
   - Can be skipped with --yes flag

3. **Branch Preservation**:
   - By default, keeps the branch (only marks session aborted)
   - Must explicitly request --deleteBranch
   - Useful if you want to return to the work later

## Use Cases

### Scenario 1: Changed Mind, Keep Work
```
# You started a feature but want to work on something else first
# Keep the branch and work for later
/hansolo abort
# Branch exists, session aborted, can resume later
```

### Scenario 2: Abandon Work Completely
```
# You started a feature but decided not to continue
# Remove everything
/hansolo abort --deleteBranch
# Branch deleted, session aborted, clean state
```

### Scenario 3: Emergency Switch
```
# Need to switch to hotfix immediately
/hansolo abort --yes
# Quick abort without prompts
/hansolo hotfix --issue="critical-bug"
```

### Scenario 4: Cleanup Old Branch
```
# Abort old work and remove branch
/hansolo abort --branchName="feature/old-experiment" --deleteBranch --yes
```

## Notes

- Destructive operation - be careful!
- Uncommitted changes will be lost unless stashed
- Session can be resumed later if branch not deleted
- Use /hansolo swap to switch between sessions without aborting
- Aborted sessions remain in history for audit trail
- Can view aborted sessions with /hansolo sessions --all
