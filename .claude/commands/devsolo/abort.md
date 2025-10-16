# Abort

Cancel the current workflow session and optionally delete the feature branch.

## Arguments

- `branchName` (optional): Branch to abort (default: current branch)
- `deleteBranch` (optional): Delete the branch after aborting (default: false)
- `force` (optional): Force abort even with uncommitted changes (default: false)
- `yes` (optional): Skip confirmation prompts (default: false)
- `verbose` (optional): Show detailed output with all sections (default: false, brief mode)

## Workflow

**Display the following banner immediately before commencing the workflow:**

```
░█▀█░█▀▄░█▀█░█▀▄░▀█▀░▀█▀░█▀█░█▀▀░
░█▀█░█▀▄░█░█░█▀▄░░█░░░█░░█░█░█░█░
░▀░▀░▀▀░░▀▀▀░▀░▀░░▀░░▀▀▀░▀░▀░▀▀▀░
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
  {"content": "Initialize abort workflow", "activeForm": "Initializing abort workflow", "status": "pending"},
  {"content": "Handle uncommitted changes (if needed)", "activeForm": "Handling uncommitted changes", "status": "pending"},
  {"content": "Complete abort workflow", "activeForm": "Completing abort workflow", "status": "pending"}
]
```
Update todo status as you progress through stages (pending → in_progress → completed). Skip stages that aren't needed by marking them completed immediately.

The abort workflow consists of three stages, each using a separate git-droid sub-agent invocation:

### Stage 1: Initialize Abort Workflow

1. **Use the Task tool** to invoke the git-droid sub-agent:
   - **subagent_type:** "git-droid"
   - **description:** "Initialising abort workflow..."
   - **prompt:** "Initialize the abort workflow with the following parameters: [pass all user arguments]. Auto mode: [resolved auto mode value]. You must:
     - Verify session exists for the target branch
     - If session not found: Report error and abort
     - Check for uncommitted changes using `git status`
     - Present WARNING about destructive action
     - If uncommitted changes exist:
       * If auto mode is TRUE: Automatically choose option 1 (stash) and set 'Next Stage: STASH_CHANGES'
       * If auto mode is FALSE: Present numbered options:
         1. Stash changes and abort session [RECOMMENDED]
         2. Discard changes and abort session (force)
         3. Cancel abort workflow
     - If no uncommitted changes:
       * If auto mode is TRUE: Automatically choose option 1 (delete branch) and set 'Next Stage: DELETE_BRANCH'
       * If auto mode is FALSE: Present numbered options:
         1. Abort session and delete branch [RECOMMENDED]
         2. Abort session (keep branch)
         3. Cancel abort workflow
     - Format results following git-droid output style from `.claude/output-styles/git-droid.md`
     - Include these sections: Pre-flight Checks, Result Summary
     - IMPORTANT: Create workflow state object and include it in your response:
       ```json
       {
         \"workflowId\": \"abort-[timestamp]\",
         \"stage\": \"STAGE_1\",
         \"verified\": {
           \"sessionExists\": [true/false],
           \"sessionId\": \"[session-id]\",
           \"changesChecked\": true
         },
         \"context\": {
           \"branchName\": \"[branch-name]\",
           \"hasUncommittedChanges\": [true/false],
           \"userChoice\": \"[STASH_CHANGES/PROCEED_TO_ABORT/DELETE_BRANCH/ABORTED]\",
           \"deleteBranchRequested\": [true/false]
         }
       }
       ```
     - IMPORTANT: In your Result Summary section, include EXACTLY one of:
       * 'Next Stage: STASH_CHANGES' (uncommitted changes: user chose option 1)
       * 'Next Stage: PROCEED_TO_ABORT' (uncommitted changes: user chose option 2, OR no changes: user chose option 2)
       * 'Next Stage: DELETE_BRANCH' (no changes: user chose option 1)
       * 'Next Stage: ABORTED' (user chose option 3, or session not found)"

2. **⬆️ OUTPUT the complete git-droid response above as text to the user**
   - Display the ENTIRE formatted output exactly as git-droid returned it
   - Include ALL sections: Pre-flight Checks, Operations Executed, Post-flight Verifications, Result Summary, Next Steps
   - Do NOT summarize, skip sections, or add commentary
   - The user MUST see this output before you proceed

3. **Extract workflow state** from git-droid response and store it for passing to next stage

4. **Check the response** for the "Next Stage:" directive in Result Summary:
   - If 'Next Stage: STASH_CHANGES', proceed to Stage 2 (Handle Uncommitted Changes) with workflow state
   - If 'Next Stage: PROCEED_TO_ABORT', skip to Stage 3 (Abort Session) with workflow state
   - If 'Next Stage: DELETE_BRANCH', skip to Stage 3 (Abort Session) with workflow state and deleteBranch=true
   - If 'Next Stage: ABORTED', terminate workflow

### Stage 2: Handle Uncommitted Changes (Conditional)

Only execute this stage if Stage 1 returned 'STASH_CHANGES'.

1. **Use the Task tool** to invoke the git-droid sub-agent:
   - **subagent_type:** "git-droid"
   - **description:** "Handling uncommitted changes..."
   - **prompt:** "Stash uncommitted changes before aborting, using workflow state from Stage 1: [pass workflow state object]. You must:
     - SKIP session verification (already verified in Stage 1 - check workflow state)
     - SKIP uncommitted changes check (already checked in Stage 1 - check workflow state)
     - Get current branch name
     - Create stash with labeled reference: abort-from-{branch}
     - Store stash reference for potential recovery
     - Verify stash succeeded
     - Update workflow state object:
       ```json
       {
         \"stage\": \"STAGE_2\",
         \"verified\": { ...previous verified fields... },
         \"context\": {
           ...previous context fields...,
           \"stashCreated\": [true/false],
           \"stashRef\": \"[stash-ref]\"
         }
       }
       ```
     - Format results following git-droid output style from `.claude/output-styles/git-droid.md`
     - Include these sections: Operations Executed, Post-flight Verifications, Result Summary
     - IMPORTANT: In your Result Summary section, include EXACTLY one of:
       * 'Next Stage: PROCEED_TO_ABORT' (stash successful)
       * 'Next Stage: ABORTED' (stash failed)"

2. **⬆️ OUTPUT the complete git-droid response above as text to the user**
   - Display the ENTIRE formatted output exactly as git-droid returned it
   - Include ALL sections: Pre-flight Checks, Operations Executed, Post-flight Verifications, Result Summary, Next Steps
   - Do NOT summarize, skip sections, or add commentary
   - The user MUST see this output before you proceed

3. **Extract updated workflow state** from git-droid response and store it for passing to next stage

4. **Check the response** for the "Next Stage:" directive in Result Summary:
   - If 'Next Stage: PROCEED_TO_ABORT', proceed to Stage 3 (Abort Session) with workflow state
   - If 'Next Stage: ABORTED', terminate workflow

### Stage 3: Abort Session

1. **Use the Task tool** to invoke the git-droid sub-agent:
   - **subagent_type:** "git-droid"
   - **description:** "Aborting session..."
   - **prompt:** "Complete the abort operation with the following parameters: [pass all user arguments] and workflow state from previous stages: [pass workflow state object]. You must:
     - SKIP session verification (already verified in Stage 1 - check workflow state)
     - SKIP uncommitted changes check (already handled in Stage 2 if needed - check workflow state)
     - Call `mcp__devsolo__devsolo_abort` MCP tool with parameters
     - Pass --deleteBranch if Stage 1 returned 'DELETE_BRANCH'
     - Switch to main branch
     - Delete feature branch (if requested)
     - Mark session as aborted
     - Update workflow state object:
       ```json
       {
         \"stage\": \"STAGE_3\",
         \"verified\": { ...previous verified fields... },
         \"context\": {
           ...previous context fields...,
           \"sessionAborted\": [true/false],
           \"branchDeleted\": [true/false]
         }
       }
       ```
     - Format results following git-droid output style from `.claude/output-styles/git-droid.md`
     - Include these sections: Operations Executed, Post-flight Verifications, Result Summary, Next Steps
     - IMPORTANT: In your Result Summary section, include EXACTLY one of:
       * 'Next Stage: COMPLETED' (abort successful)"

2. **⬆️ OUTPUT the complete git-droid response above as text to the user**
   - Display the ENTIRE formatted output exactly as git-droid returned it
   - Include ALL sections: Pre-flight Checks, Operations Executed, Post-flight Verifications, Result Summary, Next Steps
   - Do NOT summarize, skip sections, or add commentary
   - The user MUST see this output before you proceed

**Output Formatting:** Each git-droid stage handles its own output formatting following the git-droid output style

## Abort Workflow Details

The abort command orchestrates three distinct stages:

### Stage 1: Initialising abort workflow...

**Purpose:** Verify session and detect uncommitted changes

**Operations:**
- Verify session exists for target branch
- If not found: Report error and abort workflow
- Check for uncommitted changes
- Present WARNING about destructive action
- Present context-appropriate numbered options to user
- Return signal for next stage decision

**Output:**
- Pre-flight Checks section
- Result Summary
- Signal: Next Stage: STASH_CHANGES | PROCEED_TO_ABORT | DELETE_BRANCH | ABORTED

### Stage 2: Handling uncommitted changes... (Conditional)

**Purpose:** Stash uncommitted changes before aborting

**When Executed:** Only if Stage 1 returned STASH_CHANGES

**Operations:**
- Get current branch name
- Create stash with labeled reference: abort-from-{branch}
- Store stash reference for potential recovery
- Verify stash succeeded

**Output:**
- Operations Executed section
- Post-flight Verifications
- Result Summary
- Signal: Next Stage: PROCEED_TO_ABORT | ABORTED

### Stage 3: Aborting session...

**Purpose:** Execute abort operation and cleanup

**Operations:**
- Call `mcp__devsolo__devsolo_abort` MCP tool
- Pass --deleteBranch if Stage 1 returned DELETE_BRANCH
- Switch to main branch
- Delete feature branch (if requested)
- Delete remote branch (if exists and requested)
- Prune stale remote-tracking refs
- Mark session as aborted

**Output:**
- Operations Executed section
- Post-flight Verifications
- Result Summary
- Next Steps
- Signal: Next Stage: COMPLETED

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

## Workflow State Management

This workflow uses a state indicator system to avoid redundant checks across stages:

- **Stage 1** performs all pre-flight checks (session verification, uncommitted changes) and creates workflow state object
- **Stage 2** (conditional) receives state, skips session/changes checks, handles stashing
- **Stage 3** receives state, skips all prior verifications, executes abort operation

Each stage updates the state object with new context before passing to the next stage. This ensures:
- No redundant session verification
- No redundant git status checks
- Faster execution
- Clear workflow progress tracking

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
