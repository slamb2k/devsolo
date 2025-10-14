# Swap

Switch between active workflow sessions without aborting them.

## Arguments

- `branchName` (required): Target branch to swap to
- `stash` (optional): Stash uncommitted changes before swapping (default: prompt if changes present)
- `force` (optional): Force swap even with uncommitted changes (default: false)
- `verbose` (optional): Show detailed output with all sections (default: false, brief mode)

## Workflow

**Display the following banner immediately before commencing the workflow:**

```
░█▀▀░█░█░█▀█░█▀█░█▀█░▀█▀░█▀█░█▀▀░
░▀▀█░█▄█░█▀█░█▀▀░█▀▀░░█░░█░█░█░█░
░▀▀▀░▀░▀░▀░▀░▀░░░▀░░░▀▀▀░▀░▀░▀▀▀░
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

**Create workflow progress tracker:**
Use the TodoWrite tool to create todos showing all workflow stages:
```json
[
  {"content": "Initialize swap workflow", "activeForm": "Initializing swap workflow", "status": "pending"},
  {"content": "Handle uncommitted changes (if needed)", "activeForm": "Handling uncommitted changes", "status": "pending"},
  {"content": "Complete swap workflow", "activeForm": "Completing swap workflow", "status": "pending"}
]
```
Update todo status as you progress through stages (pending → in_progress → completed). Skip stages that aren't needed by marking them completed immediately.

The swap workflow consists of three stages, each using a separate git-droid sub-agent invocation:

### Stage 1: Initialize Swap Workflow

1. **Use the Task tool** to invoke the git-droid sub-agent:
   - **subagent_type:** "git-droid"
   - **description:** "Initialising swap workflow..."
   - **prompt:** "Initialize the swap workflow with the following parameters: [pass all user arguments]. Auto mode: [resolved auto mode value]. You must:
     - Verify target session exists on target branch
     - If target session not found: List available sessions and abort
     - Check for uncommitted changes on current branch using `git status`
     - If uncommitted changes exist:
       * If auto mode is TRUE: Automatically choose option 1 (stash) and set 'Next Stage: STASH_CHANGES'
       * If auto mode is FALSE: Present numbered options to user:
         1. Stash changes and swap [RECOMMENDED]
         2. Commit changes first (then abort swap, user should commit manually)
         3. Discard changes and swap (force)
         4. Abort swap workflow
     - If no uncommitted changes: Indicate ready to swap
     - Format results following git-droid output style from `.claude/output-styles/git-droid.md`
     - Include these sections: Pre-flight Checks, Result Summary
     - IMPORTANT: In your Result Summary section, include EXACTLY one of:
       * 'Next Stage: STASH_CHANGES' (user chose option 1)
       * 'Next Stage: COMMIT_FIRST' (user chose option 2, terminal state)
       * 'Next Stage: PROCEED_TO_SWAP' (user chose option 3 force, or no changes)
       * 'Next Stage: ABORTED' (user chose option 4, or target session not found)"

2. **⬆️ OUTPUT the complete git-droid response above as text to the user**
   - Display the ENTIRE formatted output exactly as git-droid returned it
   - Include ALL sections: Pre-flight Checks, Operations Executed, Post-flight Verifications, Result Summary, Next Steps
   - Do NOT summarize, skip sections, or add commentary
   - The user MUST see this output before you proceed

3. **Check the response** for the "Next Stage:" directive in Result Summary:
   - If 'Next Stage: STASH_CHANGES', proceed to Stage 2 (Stash Current Work)
   - If 'Next Stage: PROCEED_TO_SWAP', skip to Stage 3 (Switch to Target Branch)
   - If 'Next Stage: COMMIT_FIRST', display message and terminate (user should commit manually then retry)
   - If 'Next Stage: ABORTED', terminate workflow

### Stage 2: Stash Current Work (Conditional)

Only execute this stage if Stage 1 returned 'STASH_CHANGES'.

1. **Use the Task tool** to invoke the git-droid sub-agent:
   - **subagent_type:** "git-droid"
   - **description:** "Stashing current work..."
   - **prompt:** "Stash uncommitted changes on current branch. You must:
     - Get current branch name
     - Create stash with labeled reference: swap-from-{current-branch}
     - Store stash reference in session metadata
     - Verify stash succeeded
     - Format results following git-droid output style from `.claude/output-styles/git-droid.md`
     - Include these sections: Operations Executed, Post-flight Verifications, Result Summary
     - IMPORTANT: In your Result Summary section, include EXACTLY one of:
       * 'Next Stage: PROCEED_TO_SWAP' (stash successful)
       * 'Next Stage: ABORTED' (stash failed)"

2. **⬆️ OUTPUT the complete git-droid response above as text to the user**
   - Display the ENTIRE formatted output exactly as git-droid returned it
   - Include ALL sections: Pre-flight Checks, Operations Executed, Post-flight Verifications, Result Summary, Next Steps
   - Do NOT summarize, skip sections, or add commentary
   - The user MUST see this output before you proceed

3. **Check the response** for the "Next Stage:" directive in Result Summary:
   - If 'Next Stage: PROCEED_TO_SWAP', proceed to Stage 3 (Switch to Target Branch)
   - If 'Next Stage: ABORTED', terminate workflow

### Stage 3: Switch to Target Branch

1. **Use the Task tool** to invoke the git-droid sub-agent:
   - **subagent_type:** "git-droid"
   - **description:** "Switching to target branch..."
   - **prompt:** "Complete the swap to target branch with the following parameters: [pass all user arguments]. You must:
     - Call `mcp__devsolo__devsolo_swap` MCP tool with parameters
     - Checkout target branch
     - Activate target session
     - Check if target branch has stashed work
     - Pop stash automatically if present
     - Format results following git-droid output style from `.claude/output-styles/git-droid.md`
     - Include these sections: Operations Executed, Post-flight Verifications, Result Summary, Next Steps
     - IMPORTANT: In your Result Summary section, include EXACTLY one of:
       * 'Next Stage: COMPLETED' (swap successful)"

2. **⬆️ OUTPUT the complete git-droid response above as text to the user**
   - Display the ENTIRE formatted output exactly as git-droid returned it
   - Include ALL sections: Pre-flight Checks, Operations Executed, Post-flight Verifications, Result Summary, Next Steps
   - Do NOT summarize, skip sections, or add commentary
   - The user MUST see this output before you proceed

**Output Formatting:** Each git-droid stage handles its own output formatting following the git-droid output style

## Swap Workflow Details

The swap command orchestrates three distinct stages:

### Stage 1: Initialising swap workflow...

**Purpose:** Validate target session and detect uncommitted changes

**Operations:**
- Verify target session exists on target branch
- If not found: List available sessions, abort workflow
- Check for uncommitted changes on current branch
- Present options if changes detected
- Return signal for next stage decision

**Output:**
- Pre-flight Checks section
- Result Summary
- Signal: Next Stage: STASH_CHANGES | COMMIT_FIRST | PROCEED_TO_SWAP | ABORTED

### Stage 2: Stashing current work... (Conditional)

**Purpose:** Stash uncommitted changes before swapping

**When Executed:** Only if Stage 1 returned STASH_CHANGES

**Operations:**
- Get current branch name
- Create stash with labeled reference: swap-from-{current-branch}
- Store stash reference in session metadata
- Verify stash succeeded

**Output:**
- Operations Executed section
- Post-flight Verifications
- Result Summary
- Signal: Next Stage: PROCEED_TO_SWAP | ABORTED

### Stage 3: Switching to target branch...

**Purpose:** Execute branch switch and restore stashed work if present

**Operations:**
- Call `mcp__devsolo__devsolo_swap` MCP tool
- Checkout target branch
- Activate target session
- Check if target branch has stashed work
- Pop stash automatically if present

**Output:**
- Operations Executed section
- Post-flight Verifications
- Result Summary
- Next Steps
- Signal: Next Stage: COMPLETED

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
