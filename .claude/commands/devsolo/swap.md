# Swap

Switch between active workflow sessions without aborting them.

## Arguments

- `branchName` (required): Target branch to swap to
- `stash` (optional): Stash uncommitted changes before swapping (default: prompt if changes present)
- `force` (optional): Force swap even with uncommitted changes (default: false)

## Workflow

**Display the following banner immediately before commencing the workflow:**

```
░█▀▀░█░█░█▀█░█▀█░█▀█░▀█▀░█▀█░█▀▀░
░▀▀█░█▄█░█▀█░█▀▀░█▀▀░░█░░█░█░█░█░
░▀▀▀░▀░▀░▀░▀░▀░░░▀░░░▀▀▀░▀░▀░▀▀▀░
```

1. **Use the Task tool** to invoke the git-droid sub-agent:
   - **subagent_type:** "git-droid"
   - **description:** "Coordinate swap workflow"
   - **prompt:** "Execute the swap workflow with the following parameters: [pass all user arguments]. You must:
     - Verify target session exists (list available sessions if not)
     - Check for uncommitted changes (present numbered options if present)
     - Call `mcp__devsolo__devsolo_swap` MCP tool with parameters
     - Switch to target branch
     - Activate target session
     - Pop stash if previously stashed on target branch
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
/devsolo:swap --branchName="feature/other-work"

# Swap and automatically stash
/devsolo:swap --branchName="feature/other-work" --stash

# Force swap (loses uncommitted changes)
/devsolo:swap --branchName="feature/other-work" --force

# List available sessions first, then swap
/devsolo:sessions
/devsolo:swap --branchName="feature/authentication"
```

## Use Cases

### Scenario 1: Context Switch
```
# Working on feature A, need to help with feature B
# Current: feature/user-auth
/devsolo:swap --branchName="feature/api-client" --stash

# Later, return to feature A
/devsolo:swap --branchName="feature/user-auth"
# Automatically restores stashed work
```

### Scenario 2: Review Different Branches
```
# Quickly review multiple feature branches
/devsolo:sessions
/devsolo:swap --branchName="feature/feature-1"
# Review code...
/devsolo:swap --branchName="feature/feature-2"
# Review code...
/devsolo:swap --branchName="feature/feature-3"
```

### Scenario 3: Emergency Interruption
```
# Working on feature, need to fix critical bug immediately
# Current: feature/new-dashboard (with uncommitted changes)
/devsolo:swap --branchName="fix/critical-login-bug" --stash

# Fix the bug and ship
/devsolo:commit
/devsolo:ship

# Return to dashboard work
/devsolo:swap --branchName="feature/new-dashboard"
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

devsolo automatically manages stashes for you:

1. **Automatic Stashing**: When swapping with uncommitted changes, creates stash
2. **Labeled Stashes**: Stashes are labeled with source branch for identification
3. **Automatic Restore**: When swapping back, automatically pops the stash
4. **Stash Tracking**: Session metadata tracks stash references

## Error Handling

git-droid will handle common errors:

- **Target session not found**: Lists available sessions to choose from
- **Target branch doesn't exist**: Reports error, suggests /devsolo:sessions
- **Uncommitted changes**: Prompts to stash, commit, or force
- **Stash conflict**: Guides to manually resolve stash conflicts
- **Invalid branch name**: Validates branch name format

## Notes

- Preserves all session state when swapping
- Sessions remain active after swap
- Can have multiple active sessions
- Stashes are automatically managed
- Can view all stashes with `git stash list`
- Use /devsolo:sessions to see all active sessions
- Swap is non-destructive (unlike abort)
