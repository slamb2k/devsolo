# Swap

Switch between active workflow sessions without aborting them.

## Arguments

- `branchName` (required): Target branch to swap to
- `stash` (optional): Stash uncommitted changes before swapping (default: prompt if changes present)
- `force` (optional): Force swap even with uncommitted changes (default: false)

## Workflow

1. **Invoke git-droid sub-agent** to coordinate the swap workflow
2. git-droid will:
   - Verify target session exists
   - If target session doesn't exist: list available sessions
   - Check for uncommitted changes on current branch
   - If uncommitted changes present:
     - Offer to stash them (unless stash or force specified)
     - Warn about potential data loss if force=true
   - **Display the following banner immediately before calling the MCP tool:**

```
░█▀▀░█░█░█▀█░█▀█░█▀█░▀█▀░█▀█░█▀▀░
░▀▀█░█▄█░█▀█░█▀▀░█▀▀░░█░░█░█░█░█░
░▀▀▀░▀░▀░▀░▀░▀░░░▀░░░▀▀▀░▀░▀░▀▀▀░
```

   - Call `mcp__hansolo__hansolo_swap` with parameters
   - Switch to target branch
   - Activate target session
   - Pop stash if previously stashed on target branch
   - Report results following git-droid output style

## Swap Workflow Details

```
1. Pre-flight Checks:
   ✓ Target session exists
   ✓ Target branch exists
   ✓ Uncommitted changes handled (stashed, committed, or force)

2. Stash Current Work (if needed):
   - Check for uncommitted changes
   - Stash with reference: stash@{swap-from-<current-branch>}
   - Save stash reference in session metadata

3. Switch Branch:
   - Checkout target branch
   - Activate target session

4. Restore Previous Work (if applicable):
   - Check if target branch had stashed work
   - Pop stash automatically if present

5. Post-flight Verifications:
   ✓ On target branch
   ✓ Target session active
   ✓ Stash applied (if applicable)
```

## Examples

```
# Swap to specific branch (prompts if uncommitted changes)
/hansolo swap --branchName="feature/other-work"

# Swap and automatically stash
/hansolo swap --branchName="feature/other-work" --stash

# Force swap (loses uncommitted changes)
/hansolo swap --branchName="feature/other-work" --force

# List available sessions first, then swap
/hansolo sessions
/hansolo swap --branchName="feature/authentication"
```

## Use Cases

### Scenario 1: Context Switch
```
# Working on feature A, need to help with feature B
# Current: feature/user-auth
/hansolo swap --branchName="feature/api-client" --stash

# Later, return to feature A
/hansolo swap --branchName="feature/user-auth"
# Automatically restores stashed work
```

### Scenario 2: Review Different Branches
```
# Quickly review multiple feature branches
/hansolo sessions
/hansolo swap --branchName="feature/feature-1"
# Review code...
/hansolo swap --branchName="feature/feature-2"
# Review code...
/hansolo swap --branchName="feature/feature-3"
```

### Scenario 3: Emergency Interruption
```
# Working on feature, need to fix critical bug immediately
# Current: feature/new-dashboard (with uncommitted changes)
/hansolo swap --branchName="fix/critical-login-bug" --stash

# Fix the bug and ship
/hansolo commit
/hansolo ship

# Return to dashboard work
/hansolo swap --branchName="feature/new-dashboard"
# Uncommitted work automatically restored
```

## Swap vs Abort

### Use Swap When:
- You plan to return to current work
- You have multiple features in progress
- Context switching between tasks
- Reviewing different branches
- Preserving uncommitted work

### Use Abort When:
- Abandoning current work permanently
- Starting fresh on different feature
- Cleaning up old experiments
- No intention to return

## Stash Management

han-solo automatically manages stashes for you:

1. **Automatic Stashing**: When swapping with uncommitted changes, creates stash
2. **Labeled Stashes**: Stashes are labeled with source branch for identification
3. **Automatic Restore**: When swapping back, automatically pops the stash
4. **Stash Tracking**: Session metadata tracks stash references

## Error Handling

git-droid will handle common errors:

- **Target session not found**: Lists available sessions to choose from
- **Target branch doesn't exist**: Reports error, suggests /hansolo sessions
- **Uncommitted changes**: Prompts to stash, commit, or force
- **Stash conflict**: Guides to manually resolve stash conflicts
- **Invalid branch name**: Validates branch name format

## Notes

- Preserves all session state when swapping
- Sessions remain active after swap
- Can have multiple active sessions
- Stashes are automatically managed
- Can view all stashes with `git stash list`
- Use /hansolo sessions to see all active sessions
- Swap is non-destructive (unlike abort)
