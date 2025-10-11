# Cleanup

Clean up stale sessions and orphaned branches to keep your repository tidy.

## Arguments

- `deleteBranches` (optional): Delete orphaned branches (default: prompt)
- `force` (optional): Skip confirmations (default: false)

## Workflow

1. **Invoke git-droid sub-agent** to coordinate the cleanup workflow
2. git-droid will:
   - Sync main branch first (pull latest changes)
   - Identify orphaned branches (branches without active sessions)
   - Identify stale sessions (completed, aborted, or expired sessions)
   - Show summary of items to clean
   - Confirm deletions (unless force=true)
   - **Display the following banner immediately before calling the MCP tool:**

```
░█▀▀░█░░░█▀▀░█▀█░█▀█░█░█░█▀█░
░█░░░█░░░█▀▀░█▀█░█░█░█░█░█▀▀░
░▀▀▀░▀▀▀░▀▀▀░▀░▀░▀░▀░▀▀▀░▀░░░
```

   - Call `mcp__devsolo__devsolo_cleanup` with parameters
   - Remove stale sessions
   - Delete orphaned branches (if requested)
   - Report results following git-droid output style

## Cleanup Workflow Details

```
1. Sync Main Branch:
   - Checkout main branch
   - Pull latest changes
   - Ensures we have current state

2. Analysis Phase:
   🔍 Scanning for cleanup candidates...

   Orphaned Branches (branches without sessions):
   | Branch                    | Last Commit   | Age       |
   |--------------------------|---------------|-----------|
   | feature/old-work         | 3 days ago    | 15 days   |
   | fix/ancient-bug          | 2 weeks ago   | 30 days   |

   Stale Sessions (completed/aborted/expired):
   | ID       | Branch              | State      | Age       |
   |----------|---------------------|------------|-----------|
   | 0c2a20a7 | feature/done        | COMPLETE   | 5 days    |
   | 8f3d91bc | feature/abandoned   | ABORTED    | 10 days   |

3. Confirmation:
   ⚠ Cleanup will:
   - Remove 2 stale sessions
   - Delete 2 orphaned branches

   Confirm? [y/N]

4. Cleanup Operations:
   - Remove stale session files
   - Delete orphaned branches (local)
   - Delete orphaned branches (remote, if tracking)

5. Post-flight Verifications:
   ✓ Sessions cleaned: 2
   ✓ Branches deleted: 2
   ✓ On main branch
```

## What Gets Cleaned

### Stale Sessions
Sessions are considered stale if:
- State is COMPLETE (feature already merged)
- State is ABORTED (user cancelled)
- Expired (older than 30 days of inactivity)
- Branch no longer exists

### Orphaned Branches
Branches are considered orphaned if:
- No active devsolo session exists
- Not the main branch
- Not currently checked out
- User confirms deletion

## Examples

```
# Cleanup with prompts
/devsolo cleanup

# Cleanup and delete orphaned branches automatically
/devsolo cleanup --deleteBranches

# Force cleanup without confirmations
/devsolo cleanup --deleteBranches --force

# Cleanup only stale sessions (no branch deletion)
/devsolo cleanup
# (respond "n" to branch deletion prompt)
```

## Use Cases

### Scenario 1: Regular Maintenance
```
# After shipping several features, clean up
/devsolo cleanup --deleteBranches
# Removes completed session records and merged branches
```

### Scenario 2: Adopt Existing Branches
```
# You have branches created outside devsolo
# Cleanup will identify them as orphaned
/devsolo cleanup
# Review the list, keep branches you want
# Delete ones you don't need
```

### Scenario 3: Repository Hygiene
```
# Regular cleanup schedule (weekly/monthly)
/devsolo cleanup --deleteBranches --force
# Automated cleanup of stale state
```

### Scenario 4: After Team Member Leaves
```
# Clean up sessions and branches from departed teammate
/devsolo cleanup --deleteBranches
# Review and confirm deletion of old work
```

## Safety Features

1. **Analysis First**: Shows what will be cleaned before acting
2. **Confirmation Required**: Prompts before destructive operations (unless force)
3. **Main Branch Sync**: Updates main first to avoid deleting active work
4. **Protected Branches**: Never deletes main branch or current branch
5. **Session Preservation**: Keeps active sessions intact

## What's NOT Cleaned

The cleanup command will NOT remove:
- Active sessions (in progress)
- Main branch
- Currently checked out branch
- Branches with recent commits (less than 7 days old)
- Protected branches (configured in repository)

## Tips

1. **Run Regularly**: Clean up after shipping features to keep state tidy
2. **Review Before Confirming**: Check the list of items to be cleaned
3. **Sync First**: Cleanup automatically syncs main, so you get latest state
4. **Use Sessions List**: Run /devsolo sessions --all to see all sessions before cleanup
5. **Manual Cleanup**: Can always manually delete branches with git commands

## Notes

- Non-destructive to active work
- Removes only completed/aborted session metadata
- Orphaned branch deletion is optional
- Can be automated with --force flag
- Helps maintain clean git history
- Reduces clutter in session storage
- Safe to run frequently
