# Abort

Cancel the current workflow session and optionally delete the feature branch.

## Arguments

- `branchName` (optional): Branch to abort (default: current branch)
- `deleteBranch` (optional): Delete the branch after aborting (default: false)
- `force` (optional): Force abort even with uncommitted changes (default: false)
- `yes` (optional): Skip confirmation prompts (default: false)

## Workflow

**Display the following banner immediately before commencing the workflow:**

```
░█▀█░█▀▄░█▀█░█▀▄░▀█▀░▀█▀░█▀█░█▀▀░
░█▀█░█▀▄░█░█░█▀▄░░█░░░█░░█░█░█░█░
░▀░▀░▀▀░░▀▀▀░▀░▀░░▀░░▀▀▀░▀░▀░▀▀▀░
```

1. **Use the Task tool** to invoke the git-droid sub-agent:
   - **subagent_type:** "git-droid"
   - **description:** "Coordinate abort workflow"
   - **prompt:** "Execute the abort workflow with the following parameters: [pass all user arguments]. You must:
     - Verify session exists for the target branch
     - Check for uncommitted changes (present numbered options if present)
     - Confirm abort (destructive action, unless yes=true)
     - Call `mcp__devsolo__devsolo_abort` MCP tool with parameters
     - Switch to main branch
     - Optionally delete the feature branch
     - Mark session as aborted
     - Format all results following git-droid output style from `.claude/output-styles/git-droid.md`
     - Include these sections: Pre-flight Checks, Operations Executed, Post-flight Verifications, Result Summary, Next Steps
     - Present numbered options for user choices with [RECOMMENDED] marker when needed"

2. git-droid will execute the workflow and return formatted results

**Output Formatting:** git-droid handles all output formatting including:
- Pre-flight Checks section
- Operations Executed section
- Post-flight Verifications section
- Result Summary section
- Next Steps section
- Numbered options for user choices (with [RECOMMENDED] marker)

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
   - Delete local feature branch (if requested)
   - Delete remote branch (if exists and requested)
   - Prune stale remote-tracking refs (if remote branch deleted)
   - Mark session as aborted
   - Update session state

4. Post-flight Verifications:
   ✓ On main branch
   ✓ Session marked aborted
   ✓ Branch deleted (if requested)
   ✓ Remote-tracking refs cleaned up
```

## Examples

```
# Abort current session (prompts for confirmation)
/devsolo:abort

# Abort and delete branch
/devsolo:abort --deleteBranch

# Abort specific branch
/devsolo:abort --branchName="feature/old-work" --deleteBranch

# Force abort without prompts (loses uncommitted changes)
/devsolo:abort --force --yes

# Abort with stashing
/devsolo:abort --deleteBranch
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
/devsolo:abort
# Branch exists, session aborted, can resume later
```

### Scenario 2: Abandon Work Completely
```
# You started a feature but decided not to continue
# Remove everything
/devsolo:abort --deleteBranch
# Branch deleted, session aborted, clean state
```

### Scenario 3: Emergency Switch
```
# Need to switch to hotfix immediately
/devsolo:abort --yes
# Quick abort without prompts
/devsolo:hotfix --issue="critical-bug"
```

### Scenario 4: Cleanup Old Branch
```
# Abort old work and remove branch
/devsolo:abort --branchName="feature/old-experiment" --deleteBranch --yes
```

## Notes

- Destructive operation - be careful!
- Uncommitted changes will be lost unless stashed
- Session can be resumed later if branch not deleted
- Use /devsolo:swap to switch between sessions without aborting
- Aborted sessions remain in history for audit trail
- Can view aborted sessions with /devsolo:sessions --all
- When deleteBranch=true: removes local branch, remote branch (if exists), and stale remote-tracking refs
- Remote-tracking refs (e.g., `origin/feature-branch`) are local cache pointers to remote branches
- Pruning removes stale refs that point to deleted remote branches, keeping your local git state clean
