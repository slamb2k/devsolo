# Ship

Complete the entire workflow: commit any uncommitted changes, push to remote, create PR, wait for CI, merge, cleanup, and return to main. All in one command!

## Arguments

- `prDescription` (optional): Custom PR description (default: auto-generated from commits)
- `push` (optional): Push to remote (default: true)
- `createPR` (optional): Create pull request (default: true)
- `merge` (optional): Merge PR after CI passes (default: true)
- `stagedOnly` (optional): When committing, only commit staged files (default: false)
- `auto` (optional): Automatically use recommended options (default: false)
- `verbose` (optional): Show detailed output with all sections (default: false, brief mode)

## Workflow

**Display the following banner immediately before commencing the workflow:**

```
░█▀▀░█░█░▀█▀░█▀█░█▀█░▀█▀░█▀█░█▀▀░
░▀▀█░█▀█░░█░░█▀▀░█▀▀░░█░░█░█░█░█░
░▀▀▀░▀░▀░▀▀▀░▀░░░▀░░░▀▀▀░▀░▀░▀▀▀░
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
  {"content": "Initialize ship workflow", "activeForm": "Initializing ship workflow", "status": "pending"},
  {"content": "Commit changes (if needed)", "activeForm": "Committing changes", "status": "pending"},
  {"content": "Complete ship workflow", "activeForm": "Completing ship workflow", "status": "pending"}
]
```
Update todo status as you progress through stages (pending → in_progress → completed).

The ship workflow consists of three stages, each using a separate git-droid sub-agent invocation:

### Stage 1: Initialize Ship Workflow

1. **Mark todo as in_progress:** Update "Initialize ship workflow" to in_progress status

2. **Use the Task tool** to invoke the git-droid sub-agent:
   - **subagent_type:** "git-droid"
   - **description:** "Initialising ship workflow..."
   - **prompt:** "Initialize the ship workflow with the following parameters: [pass all user arguments including verbose flag and auto mode]. Auto mode: [resolved auto mode value]. You must:
     - Check for active devsolo session
     - Check for uncommitted changes using `git status`
     - Verify session is ready to ship
     - Handle scenarios based on auto mode:
       * If NO active session found:
         - If auto mode is TRUE: Automatically launch a feature workflow first (use SlashCommand to invoke /devsolo:launch with auto mode), then set 'Next Stage: LAUNCH_THEN_SHIP'
         - If auto mode is FALSE: Report error, guide user to run /devsolo:launch first, set 'Next Stage: ABORTED'
       * If uncommitted changes exist (and session exists):
         - If auto mode is TRUE: Automatically choose option 1 (commit all changes) and set 'Next Stage: COMMIT_ALL'
         - If auto mode is FALSE: Present numbered options to user:
           1. Commit all changes and proceed with ship [RECOMMENDED]
           2. Commit only staged changes and proceed with ship
           3. Abort ship workflow
       * If no uncommitted changes: Indicate ready to proceed with ship and set 'Next Stage: PROCEED_TO_SHIP'
     - Format results following git-droid output style from `.claude/output-styles/git-droid.md`
     - CRITICAL - Output formatting based on verbose flag:
       * If verbose=false (brief mode):
         - DO NOT OUTPUT: "Pre-flight Checks", "Post-flight Verifications", "Operations Executed", or "Analysis" sections
         - ONLY OUTPUT: Result Summary (and options table if user input needed - only show table if auto mode is FALSE)
       * If verbose=true (verbose mode): Include all sections: Pre-flight Checks, Result Summary
     - IMPORTANT: Create workflow state object and include it in your response:
       ```json
       {
         \"workflowId\": \"ship-[timestamp]\",
         \"stage\": \"STAGE_1\",
         \"verified\": {
           \"sessionActive\": [true/false],
           \"sessionId\": \"[session-id]\",
           \"changesChecked\": true,
           \"sessionReady\": [true/false]
         },
         \"context\": {
           \"branchName\": \"[branch-name]\",
           \"hasUncommittedChanges\": [true/false],
           \"userChoice\": \"[LAUNCH_THEN_SHIP/COMMIT_ALL/COMMIT_STAGED/PROCEED_TO_SHIP/ABORTED]\",
           \"autoModeUsed\": [true/false],
           \"launchedFeatureBranch\": \"[branch-name if launched]\"
         }
       }
       ```
     - IMPORTANT: In your Result Summary section, include EXACTLY one of:
       * 'Next Stage: LAUNCH_THEN_SHIP' (auto mode launched feature workflow, ready to ship)
       * 'Next Stage: COMMIT_ALL' (auto mode chose option 1, or user chose option 1)
       * 'Next Stage: COMMIT_STAGED' (user chose option 2)
       * 'Next Stage: PROCEED_TO_SHIP' (no uncommitted changes, ready to ship)
       * 'Next Stage: ABORTED' (no active session in manual mode, or user chose option 3)"

3. **⬆️ OUTPUT the complete git-droid response above as text to the user**
   - Display the ENTIRE formatted output exactly as git-droid returned it
   - Include ALL sections: Pre-flight Checks, numbered options, Result Summary
   - Do NOT summarize, skip sections, or add commentary
   - The user MUST see this output before you proceed

4. **Extract workflow state** from git-droid response and store it for passing to next stage

5. **Check the response** for the "Next Stage:" directive in Result Summary:
   - If 'Next Stage: LAUNCH_THEN_SHIP', proceed directly to Stage 3 (Complete Ship Workflow) with workflow state and mark "Commit changes" as completed
   - If 'Next Stage: COMMIT_ALL' or 'Next Stage: COMMIT_STAGED', proceed to Stage 2 (Commit Changes) with workflow state
   - If 'Next Stage: PROCEED_TO_SHIP', skip to Stage 3 (Complete Ship Workflow) with workflow state and mark "Commit changes" as completed
   - If 'Next Stage: ABORTED', terminate workflow

6. **Mark todo as completed:** Update "Initialize ship workflow" to completed status

### Stage 2: Commit Changes (Conditional)

Only execute this stage if Stage 1 returned 'COMMIT_ALL' or 'COMMIT_STAGED'.

1. **Mark todo as in_progress:** Update "Commit changes (if needed)" to in_progress status

2. **Use the Task tool** to invoke the git-droid sub-agent:
   - **subagent_type:** "git-droid"
   - **description:** "Committing changes..."
   - **prompt:** "Commit the uncommitted changes with the following parameters: [pass verbose flag] and workflow state from Stage 1: [pass workflow state object]. You must:
     - SKIP session verification (already verified in Stage 1 - check workflow state)
     - SKIP uncommitted changes check (already checked in Stage 1 - check workflow state)
     - Use SlashCommand tool to invoke `/devsolo:commit` with appropriate parameters
     - If Stage 1 returned 'COMMIT_STAGED': Pass --stagedOnly flag
     - If Stage 1 returned 'COMMIT_ALL': Do not pass --stagedOnly flag
     - Pass --auto flag if provided in user arguments
     - Wait for commit to complete
     - Verify commit was successful
     - Update workflow state object:
       ```json
       {
         \"stage\": \"STAGE_2\",
         \"verified\": { ...previous verified fields... },
         \"context\": {
           ...previous context fields...,
           \"commitCompleted\": [true/false],
           \"commitSha\": \"[commit-sha]\"
         }
       }
       ```
     - Format results following git-droid output style from `.claude/output-styles/git-droid.md`
     - CRITICAL - Output formatting based on verbose flag:
       * If verbose=false (brief mode):
         - DO NOT OUTPUT: "Pre-flight Checks", "Post-flight Verifications", "Operations Executed", or "Analysis" sections
         - ONLY OUTPUT: Result Summary (and options table if user input needed)
       * If verbose=true (verbose mode): Include all sections: Operations Executed, Post-flight Verifications, Result Summary
     - IMPORTANT: In your Result Summary section, include EXACTLY one of:
       * 'Next Stage: PROCEED_TO_SHIP' (commit successful)
       * 'Next Stage: ABORTED' (commit failed or user aborted)"

3. **⬆️ OUTPUT the complete git-droid response above as text to the user**
   - Display the ENTIRE formatted output exactly as git-droid returned it
   - Include ALL sections: Operations Executed, Post-flight Verifications, Result Summary
   - Do NOT summarize, skip sections, or add commentary
   - The user MUST see this output before you proceed

4. **Extract updated workflow state** from git-droid response and store it for passing to next stage

5. **Check the response** for the "Next Stage:" directive in Result Summary:
   - If 'Next Stage: PROCEED_TO_SHIP', proceed to Stage 3 (Complete Ship Workflow) with workflow state
   - If 'Next Stage: ABORTED', terminate workflow

6. **Mark todo as completed:** Update "Commit changes (if needed)" to completed status

### Stage 3: Complete Ship Workflow

1. **Mark todo as in_progress:** Update "Complete ship workflow" to in_progress status

2. **Use the Task tool** to invoke the git-droid sub-agent:
   - **subagent_type:** "git-droid"
   - **description:** "Completing ship workflow..."
   - **prompt:** "Complete the ship workflow with the following parameters: [pass all user arguments including verbose flag] and workflow state from previous stages: [pass workflow state object]. You must:
     - SKIP session verification (already verified in Stage 1 - check workflow state)
     - SKIP uncommitted changes check (already checked in Stage 1 - check workflow state)
     - SKIP commit verification (handled in Stage 2 if needed - check workflow state)
     - Generate PR description if not provided (analyze commits since main)
     - Call `mcp__devsolo__devsolo_ship` MCP tool with all parameters
     - Monitor CI checks (MCP tool handles this)
     - Update workflow state object:
       ```json
       {
         \"stage\": \"STAGE_3\",
         \"verified\": { ...previous verified fields... },
         \"context\": {
           ...previous context fields...,
           \"prNumber\": [pr-number],
           \"prUrl\": \"[pr-url]\",
           \"merged\": [true/false]
         }
       }
       ```
     - Format all results following git-droid output style from `.claude/output-styles/git-droid.md`
     - CRITICAL - Output formatting based on verbose flag:
       * If verbose=false (brief mode):
         - DO NOT OUTPUT: "Pre-flight Checks", "Post-flight Verifications", "Operations Executed", or "Analysis" sections
         - ONLY OUTPUT: Result Summary (with PR link, and options table if user input needed)
       * If verbose=true (verbose mode): Include all sections: Operations Executed, Post-flight Verifications, Result Summary (with PR link and stats), Next Steps
     - IMPORTANT: In your Result Summary section, include EXACTLY one of:
       * 'Next Stage: COMPLETED' (ship successful)
       * 'Next Stage: FAILED' (ship failed, branch preserved)"

3. **⬆️ OUTPUT the complete git-droid response above as text to the user**
   - Display the ENTIRE formatted output exactly as git-droid returned it
   - Include ALL sections: Operations Executed, Post-flight Verifications, Result Summary, Next Steps
   - Do NOT summarize, skip sections, or add commentary
   - The user MUST see this output before you proceed

4. **Mark todo as completed:** Update "Complete ship workflow" to completed status

**Output Formatting:** Each git-droid stage handles its own output formatting following the git-droid output style

## Ship Workflow Details

The ship command orchestrates three distinct stages:

### Stage 1: Initialising ship workflow...

**Purpose:** Pre-flight checks and detection of uncommitted changes

**Operations:**
- Verify active devsolo session exists
- Check `git status` for uncommitted changes
- Validate session state is ready to ship
- Report findings to user
- Return signal for next stage decision

**Output:**
- Pre-flight Checks section
- Result Summary
- Signal: Next Stage: COMMIT_ALL | COMMIT_STAGED | PROCEED_TO_SHIP | ABORTED

### Stage 2: Committing changes... (Conditional)

**Purpose:** Commit any uncommitted changes before shipping

**When Executed:** Only if Stage 1 detected uncommitted changes

**Operations:**
- Invoke `/devsolo:commit` via SlashCommand tool
- Pass --stagedOnly if Stage 1 returned COMMIT_STAGED
- Pass --auto if provided in user arguments
- Wait for commit to complete
- Verify commit succeeded
- Update session state

**Output:**
- Operations Executed section
- Post-flight Verifications
- Result Summary
- Signal: Next Stage: PROCEED_TO_SHIP | ABORTED

### Stage 3: Completing ship workflow...

**Purpose:** Push, create PR, wait for CI, merge, and cleanup

**Operations:**
1. **Generate PR Description** (if not provided):
   - Analyze commits since main branch
   - Extract key changes
   - Create structured description:
     ```
     ## Summary
     Brief overview (1-3 sentences)

     ## Changes
     - Key change 1
     - Key change 2

     ## Testing
     How to test these changes

     ## Related Issues
     Fixes #123
     ```

2. **Execute Ship via MCP Tool:**
   - Call `mcp__devsolo__devsolo_ship` with all parameters
   - This single tool call handles:
     - Push to remote
     - Create or update GitHub PR
     - Wait for CI checks to pass (20 minute timeout)
     - Auto-merge PR with squash
     - Sync local main branch
     - Delete feature branches (local & remote)
     - Mark session as complete

3. **Report Results:**
   - Show PR URL and number
   - Show merge status
   - Show cleanup results
   - Report any errors with actionable guidance

**Output:**
- Operations Executed section
- Post-flight Verifications
- Result Summary (with PR link and stats)
- Next Steps
- Signal: Next Stage: COMPLETED | FAILED

## PR Description Generation Rules

### Summary Section
- 1-3 sentences describing the overall purpose
- What problem does this solve?
- What value does it add?

### Changes Section
- Bulleted list of key changes
- Organized by component/area if possible
- Focus on user-facing or significant changes
- Derived from commit messages and diff

### Testing Section
- How to verify these changes work
- Any special test cases to run
- Manual testing steps if needed

### Related Issues Section
- Extract issue numbers from commit messages
- Format: "Fixes #123, Relates to #456"
- Only include if issues are mentioned

## Examples

```
# Ship with auto-generated PR description
/devsolo:ship

# Ship with custom PR description
/devsolo:ship --prDescription="Add OAuth2 authentication

This PR implements OAuth2 support for user authentication.

## Changes
- Add OAuth2 provider configuration
- Implement token exchange flow
- Add refresh token handling

## Testing
1. Configure OAuth2 provider
2. Test login flow
3. Verify token refresh

Fixes #42"

# Ship but don't merge (for manual review)
/devsolo:ship --merge=false

# Ship only staged changes
/devsolo:ship --stagedOnly

# Push and create PR, but don't merge
/devsolo:ship --createPR --merge=false
```

## What Happens During Ship

```
1. Pre-flight Checks:
   ✓ All changes committed
   ✓ Session ready to ship
   ✓ GitHub authentication configured
   ✓ CI configured in repository

2. Push Operation:
   - Push commits to remote branch
   - Set upstream tracking

3. PR Creation:
   - Create or update pull request
   - Set title from first commit
   - Set description (auto-generated or custom)
   - Add devsolo footer

4. CI Wait:
   - Monitor CI check status
   - Report progress (build, test, lint, etc)
   - Timeout after 20 minutes
   - Report failed checks with logs

5. Merge Operation:
   - Squash merge to main
   - Delete remote branch
   - Update main branch

6. Local Cleanup:
   - Checkout main branch
   - Pull latest changes
   - Delete feature branch (local)
   - Mark session complete

7. Post-flight Verifications:
   ✓ Pushed to remote
   ✓ PR created (#123)
   ✓ CI checks passed
   ✓ PR merged
   ✓ Branches deleted
   ✓ On main branch
   ✓ Session completed
```

## Workflow State Management

This workflow uses a state indicator system to avoid redundant checks across stages:

- **Stage 1** performs all pre-flight checks and creates workflow state object
- **Stage 2** receives state, skips session/changes verification, performs commit
- **Stage 3** receives state, skips all prior verifications, performs ship operations

Each stage updates the state object with new context before passing to the next stage. This ensures:
- No redundant session verification
- No redundant git status checks
- Faster execution
- Clear workflow progress tracking

## Notes

- Requires an active devsolo session
- Requires GitHub authentication (gh CLI or GITHUB_TOKEN)
- Will commit any uncommitted changes automatically
- Waits up to 20 minutes for CI checks
- Uses squash merge to maintain linear history
- Prevents branch reuse after merge
- Adds devsolo footer to PR automatically
- Reports PR URL for easy access

## Error Handling

git-droid will handle common errors and provide guidance:

- **No active session**: Guide to /devsolo:launch
- **GitHub auth missing**: Guide to run `gh auth login`
- **CI checks failing**: Report which checks failed with logs
- **Merge conflict**: Guide to resolve conflicts manually
- **Network timeout**: Report timeout, preserve branch for retry
- **Permission denied**: Check repository permissions
