# Command Architecture and Flow

## Overview

DevSolo commands are implemented as MCP tools that follow a standardized workflow pattern. This document describes the architecture, execution flow, validation checks, and result types for each command.

## Architecture Components

### Base Classes

#### `BaseMCPTool<TInput, TResult>`
Abstract base class that enforces a standard execution pattern for all workflow tools.

**Key Features:**
- Standardized execution flow with 8 phases
- Pre-flight and post-flight validation
- Banner display management
- Error handling and result formatting

**Execution Flow:**
```
Phase 0: Display banner (if not called via MCP prompt)
Phase 1: Check initialization
Phase 2: Collect missing parameters (prompt-based)
Phase 3: Run pre-flight checks
Phase 4: Handle prompts (return options or auto-resolve)
Phase 5: Handle errors (only internal failures)
Phase 6: Execute core workflow
Phase 7: Run post-flight verifications
Phase 8: Merge and return final result
```

### Validation Services

#### `PreFlightCheckService`
Runs validation checks before workflow execution.

**Check Levels:**
- `info` - Informational, passed check
- `warning` - Non-critical issue, continues execution
- `error` - Critical failure, halts execution
- `prompt` - Recoverable issue with options for Claude to resolve

#### `PostFlightVerification`
Verifies expected outcomes after workflow execution.

**Check Levels:**
- Same as pre-flight, but typically only `info` or `error`

### Result Types

#### Elicitation Results (Prompts for Claude)
Returns `success: true` with data for Claude to analyze and act upon.

**Triggers:**
- Missing required parameters
- `level: 'prompt'` in pre-flight checks
- User input needed for decision-making

**Example Response:**
```json
{
  "success": true,
  "message": "Please provide...",
  "data": { /* context for Claude */ },
  "nextSteps": ["Step 1", "Step 2"]
}
```

#### Error Results (Halts Execution)
Returns `success: false` with error messages.

**Triggers:**
- `level: 'error'` in pre-flight checks (failedCount > 0)
- Execution failures in workflow
- Post-flight verification failures

**Example Response:**
```json
{
  "success": false,
  "errors": ["Error message 1", "Error message 2"],
  "preFlightChecks": [/* check details */]
}
```

## Command Details

### devsolo_init

**Purpose:** Initialize devsolo in a project

**Type:** Setup command

**Pre-flight Checks:** None (custom validation in tool)

**Post-flight Checks:** None

**Elicitation Scenarios:**
- Already initialized (if not `auto: true`)
  - Level: Error
  - Message: "devsolo is already initialized. Use auto: true to reinitialize."

**Error Scenarios:**
- Not a git repository
  - Level: Error
  - Message: "Not a git repository. Initialize git first with: git init"

**Parameters:**
- `scope` (optional): 'project' | 'user'
- `force` (optional): boolean
- `auto` (optional): boolean

---

### devsolo_launch

**Purpose:** Start a new feature workflow

**Type:** Workflow initialization

**Pre-flight Checks:**
1. `onMainBranch` (prompt)
   - **Pass:** On main branch
   - **Fail (prompt):** On different branch
     - Options: stash_and_switch, switch_to_main, abort_session

2. `workingDirectoryClean` (prompt)
   - **Pass:** No uncommitted changes
   - **Fail (prompt):** Uncommitted changes detected
     - Options: stash_changes, commit_changes

3. `mainUpToDate` (error)
   - **Pass:** Main is up to date with remote
   - **Fail (error):** Main is behind remote
     - Suggestion: `git pull origin main`

4. `noExistingSession` (prompt)
   - **Pass:** No active session
   - **Fail (prompt):** Active session exists
     - Options: abort_session, swap_session, complete_session

5. `branchNameAvailable` (error)
   - **Pass:** Branch name available
   - **Fail (error):** Branch already exists
     - Suggestion: Choose different name or delete existing

**Post-flight Checks:** None

**Elicitation Scenarios:**
- Missing branch description
  - Returns with prompt for Claude to ask user
- Pre-flight check level 'prompt' (see above)

**Error Scenarios:**
- Failed to determine branch name
- Failed to handle uncommitted changes
- Failed to handle active session

**Parameters:**
- `description` (optional): string - Feature description
- `branchName` (optional): string - Custom branch name
- `auto` (optional): boolean - Auto-resolve prompts
- `stashRef` (optional): string - Git stash to restore
- `popStash` (optional): boolean - Pop stash after branch creation

---

### devsolo_commit

**Purpose:** Commit changes with a message

**Type:** Workflow action

**Pre-flight Checks:**
1. `sessionExists` (error)
   - **Pass:** Active session found
   - **Fail (error):** No active session
     - Suggestion: Start a session with devsolo_launch

2. `hasUncommittedChanges` (warning)
   - **Pass:** Changes to commit exist
   - **Fail (warning):** No changes to commit
     - Suggestion: Make changes before committing

**Post-flight Checks:** None

**Elicitation Scenarios:**
- Missing commit message
  - Returns diff and changed files for Claude to analyze
  - Claude generates conventional commit message
  - NextSteps: "Analyze diff", "Generate commit message", "Call devsolo_commit with message"

- No changes to commit (in parameter collection phase)
  - Returns early with warning

**Error Scenarios:**
- No active session (pre-flight check fails)

**Parameters:**
- `message` (optional): string - Commit message
- `stagedOnly` (optional): boolean - Only commit staged files (default: false)
- `auto` (optional): boolean - Auto-resolve prompts

---

### devsolo_ship

**Purpose:** Push, create PR, merge, and cleanup

**Type:** Workflow completion

**Pre-flight Checks:**
1. `sessionExists` (error)
   - **Pass:** Active session found
   - **Fail (error):** No active session
     - Suggestion: Start a session with devsolo_launch

2. `onFeatureBranch` (error)
   - **Pass:** On feature branch (not main)
   - **Fail (error):** On main branch
     - Suggestion: Create feature branch with devsolo_launch

3. `noUncommittedChanges` (error) ⭐
   - **Pass:** All changes committed
   - **Fail (error):** Uncommitted changes detected
     - Suggestion: Commit changes first using devsolo_commit

4. `hasCommitsToShip` (warning)
   - **Pass:** Commits ready to ship
   - **Fail (warning):** No commits to ship
     - Suggestion: Make commits before shipping

5. `noMergeConflicts` (error)
   - **Pass:** No merge conflicts
   - **Fail (error):** Merge conflicts detected
     - Suggestion: Resolve conflicts before continuing

**Custom Checks (in createContext):**
- Merged/closed PR check (BLOCKING ERROR)
  - If PR is already merged or closed, throws error
  - Reason: Branches cannot be reused after PR merge/close

**Post-flight Checks:**
1. `branchMerged` (error)
   - **Pass:** Currently on main (feature branch merged)
   - **Fail (error):** Not on main branch

2. `featureBranchDeleted` (error)
   - **Pass:** Feature branch deleted
   - **Fail (error):** Feature branch still exists

3. `sessionClosed` (error)
   - **Pass:** Session marked as COMPLETE
   - **Fail (error):** Session not properly closed

**Elicitation Scenarios:**
- Missing PR description (for new PR creation)
  - Returns commits, changed files, and diff stats
  - Claude analyzes and generates PR description
  - NextSteps: "Analyze changes", "Generate PR description", "Call devsolo_ship with prDescription"

**Error Scenarios:**
- Pre-flight check failures (see above)
- Merged/closed PR detected (blocking)
- Failed to create/update PR (execution error)
- CI checks failed or timed out (execution error)
- Failed to merge PR (execution error)
- Post-flight verification failures

**Parameters:**
- `prDescription` (optional): string - PR description
- `push` (optional): boolean - Push to remote
- `createPR` (optional): boolean - Create pull request
- `merge` (optional): boolean - Merge to main
- `stagedOnly` (optional): boolean - Only commit staged files if committing
- `auto` (optional): boolean - Auto-resolve prompts

**Workflow Steps:**
1. Push to remote
2. Create or update PR
3. Wait for CI checks to pass
4. Merge PR (squash merge)
5. Sync main and cleanup (delete branch, close session)

---

### devsolo_status

**Purpose:** Show current workflow status

**Type:** Query command

**Pre-flight Checks:** None

**Post-flight Checks:** None

**Elicitation Scenarios:** None

**Error Scenarios:** None (informational command)

**Parameters:** None

**Returns:**
- Current branch
- Session info (if exists)
- Git status (staged, unstaged, untracked counts)
- Session state and metadata

---

### devsolo_sessions

**Purpose:** List workflow sessions

**Type:** Query command

**Pre-flight Checks:** None

**Post-flight Checks:** None

**Elicitation Scenarios:** None

**Error Scenarios:** None (informational command)

**Parameters:**
- `all` (optional): boolean - Show completed sessions
- `verbose` (optional): boolean - Show detailed info
- `cleanup` (optional): boolean - Clean up expired sessions

**Returns:**
- List of active/all sessions
- Session details (ID, branch, state, created date)

---

### devsolo_swap

**Purpose:** Switch between workflow sessions

**Type:** Workflow action

**Pre-flight Checks:**
1. Custom `Target Session Exists` (error)
   - **Pass:** Session found for target branch
   - **Fail (error):** No session found for target branch
     - Suggestion: Use devsolo_sessions to list available sessions

**Post-flight Checks:** None

**Elicitation Scenarios:** None

**Error Scenarios:**
- Target session not found (pre-flight check fails)

**Parameters:**
- `branchName` (required): string - Branch to swap to
- `stash` (optional): boolean - Stash changes before swapping
- `force` (optional): boolean - Force swap even with changes
- `auto` (optional): boolean - Auto-resolve prompts

**Special Handling:**
- If `stash: true`, automatically stashes uncommitted changes
- If uncommitted changes and no `stash`, continues (no error)

---

### devsolo_abort

**Purpose:** Abort a workflow session

**Type:** Workflow cleanup

**Pre-flight Checks:**
1. Custom `Session Exists` (error)
   - **Pass:** Session found for branch
   - **Fail (error):** No session found
     - Suggestion: Use devsolo_sessions to list available sessions

2. Custom `Session Active` (error, if not `auto: true`)
   - **Pass:** Session is active
   - **Fail (error):** Session already aborted/complete
     - Suggestion: Session is already in terminal state

**Post-flight Checks:** None

**Elicitation Scenarios:** None

**Error Scenarios:**
- Session not found (pre-flight check fails)
- Session already in terminal state (pre-flight check fails, if not auto mode)

**Parameters:**
- `branchName` (optional): string - Branch to abort (current if not specified)
- `deleteBranch` (optional): boolean - Delete branch after aborting
- `force` (optional): boolean - Force abort
- `yes` (optional): boolean - Skip confirmation (CLI only)
- `auto` (optional): boolean - Auto-resolve prompts

**Workflow Steps:**
1. Mark session as ABORTED
2. Delete session from repository
3. Optionally delete branch (local and remote)

---

### devsolo_cleanup

**Purpose:** Clean up expired sessions and stale branches

**Type:** Maintenance command

**Pre-flight Checks:** None

**Post-flight Checks:** None

**Elicitation Scenarios:** None

**Error Scenarios:** None (best-effort cleanup)

**Parameters:**
- `deleteBranches` (optional): boolean - Delete stale branches
- `force` (optional): boolean - Force cleanup
- `auto` (optional): boolean - Auto-resolve prompts

**Returns:**
- Count of sessions cleaned up
- Count of branches deleted
- Warnings for any failures

---

### devsolo_hotfix

**Purpose:** Create emergency hotfix workflow

**Type:** Workflow initialization (specialized)

**Pre-flight Checks:** TBD (command implementation in progress)

**Post-flight Checks:** TBD

**Parameters:**
- `issue` (optional): string - Issue number or description
- `severity` (optional): 'critical' | 'high' | 'medium'
- `skipTests` (optional): boolean
- `skipReview` (optional): boolean
- `autoMerge` (optional): boolean
- `auto` (optional): boolean

---

### devsolo_status_line

**Purpose:** Manage Claude Code status line display

**Type:** Configuration command

**Pre-flight Checks:** None

**Post-flight Checks:** None

**Parameters:**
- `action` (required): 'enable' | 'disable' | 'update' | 'show'
- `format` (optional): string - Custom format string
- `showSessionInfo` (optional): boolean
- `showBranchInfo` (optional): boolean
- `showStateInfo` (optional): boolean

---

## Pre-flight Check Reference

### Available Check Types

| Check Type | Used By | Level | Description |
|------------|---------|-------|-------------|
| `onMainBranch` | launch | prompt | Verifies currently on main branch |
| `workingDirectoryClean` | launch | prompt | Verifies no uncommitted changes |
| `mainUpToDate` | launch | error | Verifies main is synced with remote |
| `noExistingSession` | launch | prompt | Verifies no active session exists |
| `branchNameAvailable` | launch | error | Verifies branch name not taken |
| `sessionExists` | commit, ship | error | Verifies active session exists |
| `onFeatureBranch` | ship | error | Verifies on feature branch (not main) |
| `hasUncommittedChanges` | commit | warning | Verifies changes exist to commit |
| `noUncommittedChanges` | ship | error | Verifies all changes are committed |
| `hasCommitsToShip` | ship | warning | Verifies commits exist to ship |
| `noMergeConflicts` | ship | error | Verifies no merge conflicts |

### Check Level Behaviors

| Level | Behavior | Claude Action | Execution |
|-------|----------|---------------|-----------|
| `info` | Pass - informational | None | Continues |
| `warning` | Fail - non-critical | Informed but continues | Continues |
| `error` | Fail - critical | Cannot proceed | Halts |
| `prompt` | Fail - recoverable | Resolves issue or asks user | Halts until resolved |

## Banner Display

### Banner Behavior

**When called via MCP prompt** (`_via_prompt: true`):
- Banner displayed by prompt handler (before tool execution)
- Tool execution skips banner (prevents duplication)

**When called directly as tool** (`_via_prompt: false` or undefined):
- Streaming notification sent (for future Claude Code support)
- Banner included in result warnings (displayed with tool result)

### Banner Implementation

Located in `src/ui/banners.ts`:
- ASCII art banners for each command
- `getBanner(command)` function retrieves banner by name
- Random color applied on display

## State Machine

### Session States

1. **INITIALIZED** - Session created, branch ready
2. **BRANCH_READY** - On feature branch, ready for work
3. **CHANGES_COMMITTED** - Changes committed, ready to ship
4. **PUSHED** - Changes pushed to remote
5. **PR_CREATED** - Pull request created
6. **CHECKS_PASSING** - CI checks passing
7. **READY_TO_MERGE** - Ready to merge PR
8. **COMPLETE** - PR merged, session complete
9. **ABORTED** - Session aborted by user

### State Transitions

```
                    launch
                      ↓
                BRANCH_READY
                      ↓
                   commit
                      ↓
            CHANGES_COMMITTED
                      ↓
              ship (start)
                      ↓
                   PUSHED
                      ↓
                PR_CREATED
                      ↓
              CHECKS_PASSING
                      ↓
             READY_TO_MERGE
                      ↓
              ship (complete)
                      ↓
                  COMPLETE

    abort (any state)
         ↓
      ABORTED
```

## Error Handling Strategy

### Phase-Based Error Handling

**Phase 1 (Initialization Check):**
- Returns early with error if not initialized
- Suggests running `devsolo_init`

**Phase 3 (Pre-flight Checks):**
- `level: 'error'` → Halts execution, returns error result
- `level: 'prompt'` → Returns options for Claude to resolve
- `level: 'warning'` → Continues execution, includes in result

**Phase 6 (Workflow Execution):**
- Exceptions caught and wrapped in error result
- Specific workflow failures handled explicitly

**Phase 7 (Post-flight Verifications):**
- Failed verifications included in final result
- Does not halt execution (already completed)

### Custom Error Checks

Some tools implement custom checks in `createContext()`:
- **ship-tool**: Merged/closed PR check (BLOCKING)
  - Reason: Cannot reuse merged branches
  - Throws error before pre-flight checks

## Best Practices

### For Adding New Commands

1. Extend `BaseMCPTool<TInput, TResult>`
2. Implement required methods:
   - `executeWorkflow()` - Core logic
3. Override optional methods as needed:
   - `checkInitialization()` - If tool doesn't require init
   - `collectMissingParameters()` - For elicitation
   - `runPreFlightChecks()` - For validation
   - `runPostFlightVerifications()` - For result verification
   - `createFinalResult()` - For custom result formatting

4. Use appropriate check levels:
   - `error` - Must be resolved, halts execution
   - `prompt` - Can be resolved by Claude, halts until resolved
   - `warning` - Informational, continues execution

5. Implement banner in `src/ui/banners.ts`

### For Modifying Checks

1. Add new check types to `PreFlightCheckType` in `pre-flight-check-service.ts`
2. Implement check method in `PreFlightCheckService`
3. Use in tool's `runPreFlightChecks()` method
4. Document in this file

## Future Enhancements

### Planned Features

- **Streaming notifications**: When Claude Code supports it, banners will display immediately
- **Auto-resolution**: Enhanced auto mode for prompt-level checks
- **Check customization**: Per-project check configuration
- **Custom checks**: Plugin system for project-specific validation

### Known Limitations

- Streaming notifications not yet supported by Claude Code
- Some checks require GitHub integration (PR status, CI checks)
- Auto mode limited to simple resolutions

---

**Last Updated:** 2025-10-11
**Version:** 2.0.0
