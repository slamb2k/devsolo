# Cleanup

Clean up stale sessions and orphaned branches to keep your repository tidy.

## Arguments

- `deleteBranches` (optional): Delete orphaned branches (default: prompt)
- `force` (optional): Skip confirmations (default: false)
- `verbose` (optional): Show detailed output with all sections (default: false, brief mode)

## Workflow

**Display the following banner immediately before commencing the workflow:**

```
░█▀▀░█░░░█▀▀░█▀█░█▀█░█░█░█▀█░
░█░░░█░░░█▀▀░█▀█░█░█░█░█░█▀▀░
░▀▀▀░▀▀▀░▀▀▀░▀░▀░▀░▀░▀▀▀░▀░░░
```

**⚠️ CRITICAL OUTPUT REQUIREMENT:** After EVERY Task tool invocation in this workflow, you MUST immediately output the complete git-droid response as text to the user. DO NOT proceed to check signals or continue to the next stage without first displaying the full output. The user needs to see all numbered options, formatted sections, and status information.

**Before starting the workflow, resolve auto mode:**
1. If `--auto` argument was provided: use that value (true or false)
2. Otherwise, read `.devsolo/config.yaml` and check for `preferences.autoMode`
3. Pass the resolved auto mode to all nested MCP tool calls and slash command invocations using `--auto:true` or `--auto:false`

**Before starting the workflow, resolve verbose mode:**
1. If `--verbose` argument was provided: use that value (true or false)
2. Otherwise, read `.devsolo/config.yaml` and check for `preferences.verboseMode`
3. If not in config, default to `false` (brief mode)
4. Pass the resolved verbose mode to all nested git-droid sub-agent invocations using `verbose=true` or `verbose=false`
5. In brief mode (verbose=false), git-droid agents should show minimal output: status indicator + result summary only
6. In verbose mode (verbose=true), git-droid agents should show all sections: Pre-flight Checks, Operations Executed, Post-flight Verifications, Result Summary, Next Steps

The cleanup workflow consists of two stages, each using a separate git-droid sub-agent invocation:

### Stage 1: Analyze Repository

1. **Use the Task tool** to invoke the git-droid sub-agent:
   - **subagent_type:** "git-droid"
   - **description:** "Analyzing repository..."
   - **prompt:** "Analyze the repository for cleanup candidates with the following parameters: [pass all user arguments]. Auto mode: [resolved auto mode value]. You must:
     - Sync main branch first (checkout main, pull latest changes)
     - Scan `.devsolo/sessions/` directory for stale sessions (COMPLETE, ABORTED, expired, branch deleted)
     - Scan git branches for orphaned branches (no active session, not main, not current)
     - Present findings in tables if multiple items found
     - Show summary of what will be cleaned
     - If auto mode is TRUE: Automatically choose option 1 (clean sessions and branches) and set 'Next Stage: EXECUTE_FULL_CLEANUP'
     - If auto mode is FALSE: Present numbered options to user:
       1. Clean sessions and branches [RECOMMENDED]
       2. Clean sessions only
       3. Cancel cleanup
     - Format results following git-droid output style from `.claude/output-styles/git-droid.md`
     - Include these sections: Pre-flight Checks (with tables showing candidates), Result Summary
     - IMPORTANT: In your Result Summary section, include EXACTLY one of:
       * 'Next Stage: EXECUTE_FULL_CLEANUP' (user chose option 1)
       * 'Next Stage: EXECUTE_SESSION_CLEANUP' (user chose option 2)
       * 'Next Stage: ABORTED' (user chose option 3, or nothing to clean)"

2. **⬆️ OUTPUT the complete git-droid response above as text to the user**
   - Display the ENTIRE formatted output exactly as git-droid returned it
   - Include ALL sections: Pre-flight Checks, Operations Executed, Post-flight Verifications, Result Summary, Next Steps
   - Do NOT summarize, skip sections, or add commentary
   - The user MUST see this output before you proceed

3. **Check the response** for the "Next Stage:" directive in Result Summary:
   - If 'Next Stage: EXECUTE_FULL_CLEANUP', proceed to Stage 2 with deleteBranches=true
   - If 'Next Stage: EXECUTE_SESSION_CLEANUP', proceed to Stage 2 with deleteBranches=false
   - If 'Next Stage: ABORTED', terminate workflow

### Stage 2: Execute Cleanup

1. **Use the Task tool** to invoke the git-droid sub-agent:
   - **subagent_type:** "git-droid"
   - **description:** "Executing cleanup..."
   - **prompt:** "Execute the cleanup operation. You must:
     - Call `mcp__devsolo__devsolo_cleanup` MCP tool with parameters
     - Pass --deleteBranches if Stage 1 returned 'EXECUTE_FULL_CLEANUP'
     - Remove stale session files
     - Delete orphaned branches (if deleteBranches=true): local and remote
     - Prune stale remote-tracking refs
     - Report counts (sessions removed, branches deleted)
     - Format results following git-droid output style from `.claude/output-styles/git-droid.md`
     - Include these sections: Operations Executed, Post-flight Verifications, Result Summary (with counts), Next Steps
     - IMPORTANT: In your Result Summary section, include EXACTLY one of:
       * 'Next Stage: COMPLETED' (cleanup successful)"

2. **⬆️ OUTPUT the complete git-droid response above as text to the user**
   - Display the ENTIRE formatted output exactly as git-droid returned it
   - Include ALL sections: Pre-flight Checks, Operations Executed, Post-flight Verifications, Result Summary, Next Steps
   - Do NOT summarize, skip sections, or add commentary
   - The user MUST see this output before you proceed

**Output Formatting:** Each git-droid stage handles its own output formatting following the git-droid output style

## Cleanup Workflow Details

The cleanup command orchestrates two distinct stages:

### Stage 1: Analyzing repository...

**Purpose:** Scan for cleanup candidates and get user confirmation

**Operations:**
- Sync main branch (checkout main, pull latest)
- Scan `.devsolo/sessions/` for stale sessions
  - COMPLETE state (already merged)
  - ABORTED state (user cancelled)
  - Expired (>30 days inactivity)
  - Branch no longer exists
- Scan git branches for orphaned branches
  - No active devsolo session
  - Not main branch
  - Not currently checked out
- Present findings in tables
- Show summary of what will be cleaned
- Present numbered options to user
- Return signal for next stage decision

**Output:**
- Pre-flight Checks section (with tables)
- Result Summary
- Signal: Next Stage: EXECUTE_FULL_CLEANUP | EXECUTE_SESSION_CLEANUP | ABORTED

### Stage 2: Executing cleanup...

**Purpose:** Remove stale sessions and orphaned branches

**Operations:**
- Call `mcp__devsolo__devsolo_cleanup` MCP tool
- Pass --deleteBranches based on Stage 1 choice
- Remove stale session files
- Delete orphaned branches (local and remote if requested)
- Prune stale remote-tracking refs
- Report counts (sessions removed, branches deleted)

**Output:**
- Operations Executed section
- Post-flight Verifications
- Result Summary (with counts)
- Next Steps
- Signal: Next Stage: COMPLETED

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
/devsolo:cleanup

# Cleanup and delete orphaned branches automatically
/devsolo:cleanup --deleteBranches

# Force cleanup without confirmations
/devsolo:cleanup --deleteBranches --force

# Cleanup only stale sessions (no branch deletion)
/devsolo:cleanup
# (respond "n" to branch deletion prompt)
```

## Use Cases

### Scenario 1: Regular Maintenance
```
# After shipping several features, clean up
/devsolo:cleanup --deleteBranches
# Removes completed session records and merged branches
```

### Scenario 2: Adopt Existing Branches
```
# You have branches created outside devsolo
# Cleanup will identify them as orphaned
/devsolo:cleanup
# Review the list, keep branches you want
# Delete ones you don't need
```

### Scenario 3: Repository Hygiene
```
# Regular cleanup schedule (weekly/monthly)
/devsolo:cleanup --deleteBranches --force
# Automated cleanup of stale state
```

### Scenario 4: After Team Member Leaves
```
# Clean up sessions and branches from departed teammate
/devsolo:cleanup --deleteBranches
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
4. **Use Sessions List**: Run /devsolo:sessions --all to see all sessions before cleanup
5. **Manual Cleanup**: Can always manually delete branches with git commands

## Notes

- Non-destructive to active work
- Removes only completed/aborted session metadata
- Orphaned branch deletion is optional
- Can be automated with --force flag
- Helps maintain clean git history
- Reduces clutter in session storage
- Safe to run frequently
- Always prunes stale remote-tracking refs (local cache pointers to remote branches)
- Pruning removes refs to branches deleted on GitHub/origin, keeping local git state synchronized
- Remote prune operation is non-destructive and safe to run
