# Multi-Stage Sub-Agent Orchestration Pattern

**Status:** Proposed
**Created:** 2025-10-15
**Author:** System Design
**Priority:** High - UX Improvement

## Overview

This plan introduces a **multi-stage sub-agent orchestration pattern** for complex devsolo workflows. Instead of using a single git-droid invocation that hides all operations behind a generic status message, we break workflows into distinct stages with descriptive status messages that give users clear visibility into what's happening at each step.

### Problem Statement

Current implementation uses single-stage orchestration:

```
git-droid(Coordinate ship workflow)
  ⎿  Done (10 tool uses · 22.5k tokens · 44.7s)
```

Users see only "Coordinate ship workflow" for 44 seconds without knowing:
- Is it committing?
- Is it pushing?
- Is it waiting for CI?
- What's actually happening?

### Proposed Solution

Multi-stage orchestration with descriptive status messages:

```
git-droid(Initialising ship workflow...)
  ⎿  Done (2 tool uses · 3.2k tokens · 5.3s)

git-droid(Committing changes...)
  ⎿  Done (3 tool uses · 5.1k tokens · 8.7s)

git-droid(Completing ship workflow...)
  ⎿  Done (5 tool uses · 14.2k tokens · 30.7s)
```

Users now see exactly what stage is running and can understand progress.

## Benefits

1. **Transparency:** Users see what's happening at each stage
2. **Progress Indication:** Clear sense of workflow progression
3. **Debugging:** Easier to identify where issues occur
4. **User Confidence:** Reduces anxiety during long operations
5. **Consistency:** Standard pattern across all complex workflows

## Pattern Template: Option C (Hybrid Approach)

The recommended pattern combines:
- Multi-stage orchestration (Claude Code coordinates stages)
- User interaction (git-droid presents numbered options)
- Structured signals (for stage progression decisions)
- Consistent formatting (git-droid output style)

### Template Structure

#### Stage N: [Stage Name]

```markdown
1. **Use the Task tool** to invoke the git-droid sub-agent:
   - **subagent_type:** "git-droid"
   - **description:** "[Present continuous verb phrase...]"
   - **prompt:** "[Imperative instruction]. You must:
     - [Primary operation]
     - [Conditional handling with user options]
     - Present numbered options for user choices with [RECOMMENDED] marker when needed
     - Format results following git-droid output style from `.claude/output-styles/git-droid.md`
     - Include these sections: [Section list]
     - In your Result Summary, include EXACTLY one of:
       * 'Next Stage: [STAGE_NAME]'
       * 'Next Stage: [ALTERNATIVE_STAGE]'
       * 'Next Stage: [TERMINAL_STATE]'"

2. **Display git-droid's output verbatim** to the user
   - Show the complete formatted output exactly as returned by git-droid
   - Do NOT add commentary, summaries, or interpretations

3. **Check the response** for the "Next Stage:" directive:
   - Parse the Result Summary section
   - Extract the stage name from "Next Stage: [STAGE_NAME]"
   - Route to appropriate next stage or terminate
```

### Signal Mechanism Specification

**Format:** `Next Stage: [STAGE_NAME]`

**Location:** Must appear in the "Result Summary" section of git-droid output

**Valid Stage Names:**
- Action-based: `COMMIT_ALL`, `COMMIT_STAGED`, `STASH_CHANGES`, `DELETE_BRANCH`
- Flow control: `PROCEED_TO_[STAGE]`, `SKIP_TO_[STAGE]`, `ABORTED`, `COMPLETED`

**Example in git-droid output:**
```
---

## Result Summary

Pre-flight checks complete. Uncommitted changes detected.

Next Stage: COMMIT_ALL

---
```

**Parsing Logic:**
1. Search for "Next Stage:" in git-droid response
2. Extract the stage name after the colon
3. Trim whitespace
4. Match against expected stage names
5. Route to corresponding stage or report error

## Command Implementations

### 1. /devsolo:ship (Refine Existing)

**Current Status:** Already implemented with 3 stages, needs refinement

**Changes Needed:**
- Replace string-based signal detection with structured "Next Stage:" directive
- Add user options in Stage 1 (don't auto-commit)
- Align with Option C pattern

#### Stage 1: Initialising ship workflow...

**Purpose:** Pre-flight checks and detect uncommitted changes

**Operations:**
- Check for active devsolo session
- Check `git status` for uncommitted changes
- If changes exist: Present numbered options to user
  1. Commit all changes and proceed with ship [RECOMMENDED]
  2. Commit only staged changes and proceed with ship
  3. Abort ship workflow
- If no changes: Indicate ready to ship

**Signal Output:**
- `Next Stage: COMMIT_ALL` (user chose option 1)
- `Next Stage: COMMIT_STAGED` (user chose option 2)
- `Next Stage: PROCEED_TO_SHIP` (no uncommitted changes)
- `Next Stage: ABORTED` (user chose option 3)

**Sections:** Pre-flight Checks, Result Summary

#### Stage 2: Committing changes... (Conditional)

**Condition:** Only if Stage 1 returned `COMMIT_ALL` or `COMMIT_STAGED`

**Operations:**
- Use SlashCommand tool to invoke `/devsolo:commit`
- Pass `--stagedOnly` if Stage 1 returned `COMMIT_STAGED`
- Wait for commit to complete
- Verify commit succeeded

**Signal Output:**
- `Next Stage: PROCEED_TO_SHIP` (commit successful)
- `Next Stage: ABORTED` (commit failed or user aborted)

**Sections:** Operations Executed, Post-flight Verifications, Result Summary

#### Stage 3: Completing ship workflow...

**Condition:** Always executes after Stages 1 or 2 if not aborted

**Operations:**
- Generate PR description if not provided
- Call `mcp__devsolo__devsolo_ship` MCP tool
- Monitor CI checks (MCP tool handles this)
- Report results (PR link, merge status)

**Signal Output:**
- `Next Stage: COMPLETED` (ship successful)
- `Next Stage: FAILED` (ship failed, branch preserved)

**Sections:** Operations Executed, Post-flight Verifications, Result Summary, Next Steps

---

### 2. /devsolo:swap (New Implementation)

**Current Status:** Single stage, needs multi-stage pattern

**Stages:** 3 (Initialize → Stash → Switch)

#### Stage 1: Initialising swap workflow...

**Purpose:** Validate target and detect uncommitted changes

**Operations:**
- Verify target session exists on target branch
- If not: List available sessions, abort
- Check for uncommitted changes on current branch
- If changes exist: Present numbered options
  1. Stash changes and swap [RECOMMENDED]
  2. Commit changes first (then abort swap, user should commit manually)
  3. Discard changes and swap (force)
  4. Abort swap workflow
- If no changes: Indicate ready to swap

**Signal Output:**
- `Next Stage: STASH_CHANGES` (option 1)
- `Next Stage: COMMIT_FIRST` (option 2, terminal state)
- `Next Stage: PROCEED_TO_SWAP` (option 3 force, or no changes)
- `Next Stage: ABORTED` (option 4)

**Sections:** Pre-flight Checks, Result Summary

#### Stage 2: Stashing current work... (Conditional)

**Condition:** Only if Stage 1 returned `STASH_CHANGES`

**Operations:**
- Create stash with labeled reference: `swap-from-{current-branch}`
- Store stash reference in session metadata
- Verify stash succeeded

**Signal Output:**
- `Next Stage: PROCEED_TO_SWAP` (stash successful)
- `Next Stage: ABORTED` (stash failed)

**Sections:** Operations Executed, Post-flight Verifications, Result Summary

#### Stage 3: Switching to target branch...

**Condition:** Always executes after Stages 1 or 2 if not aborted

**Operations:**
- Call `mcp__devsolo__devsolo_swap` MCP tool
- Checkout target branch
- Activate target session
- Check if target branch has stashed work
- Pop stash automatically if present

**Signal Output:**
- `Next Stage: COMPLETED` (swap successful)

**Sections:** Operations Executed, Post-flight Verifications, Result Summary, Next Steps

---

### 3. /devsolo:abort (New Implementation)

**Current Status:** Single stage, needs multi-stage pattern

**Stages:** 3 (Initialize → Handle Changes → Abort)

#### Stage 1: Initialising abort workflow...

**Purpose:** Verify session and detect uncommitted changes

**Operations:**
- Verify session exists for target branch
- Check for uncommitted changes
- Present numbered options with WARNING about destructive action:
  1. Stash changes and abort session [RECOMMENDED]
  2. Discard changes and abort session (force)
  3. Cancel abort workflow
- If no changes: Confirm abort action
  1. Abort session (keep branch) [RECOMMENDED]
  2. Abort session and delete branch
  3. Cancel abort workflow

**Signal Output:**
- `Next Stage: STASH_CHANGES` (uncommitted: option 1)
- `Next Stage: PROCEED_TO_ABORT` (uncommitted: option 2, or no changes: option 1)
- `Next Stage: DELETE_BRANCH` (no changes: option 2)
- `Next Stage: ABORTED` (option 3 in either case)

**Sections:** Pre-flight Checks, Result Summary

#### Stage 2: Handling uncommitted changes... (Conditional)

**Condition:** Only if Stage 1 returned `STASH_CHANGES`

**Operations:**
- Create stash with labeled reference: `abort-from-{branch}`
- Store stash reference for potential recovery
- Verify stash succeeded

**Signal Output:**
- `Next Stage: PROCEED_TO_ABORT` (stash successful)
- `Next Stage: ABORTED` (stash failed)

**Sections:** Operations Executed, Post-flight Verifications, Result Summary

#### Stage 3: Aborting session...

**Condition:** Always executes after Stages 1 or 2 if not aborted

**Operations:**
- Call `mcp__devsolo__devsolo_abort` MCP tool
- Pass `--deleteBranch` if Stage 1 returned `DELETE_BRANCH`
- Switch to main branch
- Delete feature branch (if requested)
- Mark session as aborted

**Signal Output:**
- `Next Stage: COMPLETED` (abort successful)

**Sections:** Operations Executed, Post-flight Verifications, Result Summary, Next Steps

---

### 4. /devsolo:launch (New Implementation)

**Current Status:** Single stage, needs multi-stage pattern

**Stages:** 4 (Initialize → Handle Changes → Handle Session → Create Branch)

#### Stage 1: Initialising launch workflow...

**Purpose:** Pre-flight checks and detect issues

**Operations:**
- Check if on main branch
- Check if main is up to date with remote
- Check for uncommitted changes
- Check for existing active session
- Report findings and present options based on what was found

**If uncommitted changes:**
1. Commit changes first [RECOMMENDED]
2. Stash changes
3. Discard changes
4. Abort launch

**If existing session:**
1. Abort existing session [RECOMMENDED]
2. Keep both sessions
3. Abort launch

**Signal Output:**
- `Next Stage: HANDLE_CHANGES` (uncommitted changes detected)
- `Next Stage: HANDLE_SESSION` (existing session detected)
- `Next Stage: CREATE_BRANCH` (clean state)
- `Next Stage: ABORTED` (user cancelled)

**Sections:** Pre-flight Checks, Result Summary

#### Stage 2: Handling uncommitted changes... (Conditional)

**Condition:** Only if Stage 1 returned `HANDLE_CHANGES`

**Operations:**
- Execute user's choice (commit/stash/discard)
- If commit: Generate commit message, execute commit
- If stash: Create labeled stash
- If discard: Force clean working directory
- Verify action succeeded
- Check again if existing session exists

**Signal Output:**
- `Next Stage: HANDLE_SESSION` (if existing session also detected)
- `Next Stage: CREATE_BRANCH` (if no session conflict)
- `Next Stage: ABORTED` (if action failed)

**Sections:** Operations Executed, Post-flight Verifications, Result Summary

#### Stage 3: Handling existing session... (Conditional)

**Condition:** Only if Stage 1 or 2 returned `HANDLE_SESSION`

**Operations:**
- If user chose abort: Use SlashCommand to invoke `/devsolo:abort`
- If user chose keep both: Continue to CREATE_BRANCH
- Verify session handling succeeded

**Signal Output:**
- `Next Stage: CREATE_BRANCH` (session handled)
- `Next Stage: ABORTED` (user cancelled or failed)

**Sections:** Operations Executed, Post-flight Verifications, Result Summary

#### Stage 4: Creating feature branch...

**Condition:** Always executes after previous stages if not aborted

**Operations:**
- Generate branch name from description if not provided
- Call `mcp__devsolo__devsolo_launch` MCP tool
- Create feature branch
- Create session
- Checkout to new branch

**Signal Output:**
- `Next Stage: COMPLETED` (launch successful)

**Sections:** Operations Executed, Post-flight Verifications, Result Summary, Next Steps

---

### 5. /devsolo:cleanup (New Implementation)

**Current Status:** Single stage, needs multi-stage pattern

**Stages:** 2 (Analyze → Execute)

#### Stage 1: Analyzing repository...

**Purpose:** Scan for cleanup candidates and get user confirmation

**Operations:**
- Sync main branch (checkout main, pull latest)
- Scan `.devsolo/sessions/` for stale sessions
- Scan git branches for orphaned branches
- Present findings in tables
- Show what will be cleaned
- Present numbered options:
  1. Clean sessions and branches [RECOMMENDED]
  2. Clean sessions only
  3. Cancel cleanup

**Signal Output:**
- `Next Stage: EXECUTE_FULL_CLEANUP` (option 1)
- `Next Stage: EXECUTE_SESSION_CLEANUP` (option 2)
- `Next Stage: ABORTED` (option 3)

**Sections:** Pre-flight Checks (with tables), Result Summary

#### Stage 2: Executing cleanup...

**Condition:** Always executes after Stage 1 if not aborted

**Operations:**
- Call `mcp__devsolo__devsolo_cleanup` MCP tool
- Pass `--deleteBranches` if Stage 1 returned `EXECUTE_FULL_CLEANUP`
- Remove stale session files
- Delete orphaned branches (if requested)
- Prune stale remote-tracking refs
- Report counts (sessions removed, branches deleted)

**Signal Output:**
- `Next Stage: COMPLETED` (cleanup successful)

**Sections:** Operations Executed, Post-flight Verifications, Result Summary, Next Steps

---

## Implementation Order

### Phase 1: Refine Ship (Highest Priority)
1. Update `/devsolo:ship` with Option C pattern
2. Test with real workflows
3. Validate signal mechanism works reliably

**Rationale:** Ship is already partially implemented and most commonly used

### Phase 2: High-Impact Commands
1. Update `/devsolo:swap` (complex state management)
2. Update `/devsolo:abort` (destructive operation)

**Rationale:** These have complex conditional logic that benefits most from staging

### Phase 3: Remaining Commands
1. Update `/devsolo:launch` (4 stages, most complex)
2. Update `/devsolo:cleanup` (simpler 2-stage pattern)

**Rationale:** Launch is complex but less frequently used; cleanup is simpler

## Testing Strategy

### Unit Testing (Per Stage)

For each stage, verify:
1. **Input validation:** Stage receives correct parameters
2. **git-droid invocation:** Task tool called with correct prompt
3. **Output parsing:** Signal correctly extracted from response
4. **Routing logic:** Correct next stage selected based on signal
5. **Error handling:** Failed stages abort gracefully

### Integration Testing (Full Workflow)

Test complete workflows with different paths:

**Ship workflow paths:**
- Path A: No uncommitted changes → Direct to ship
- Path B: Uncommitted changes → Commit all → Ship
- Path C: Uncommitted changes → Commit staged → Ship
- Path D: Uncommitted changes → Abort
- Path E: CI fails → Report error, preserve branch

**Swap workflow paths:**
- Path A: No uncommitted changes → Direct swap
- Path B: Uncommitted changes → Stash → Swap → Restore
- Path C: Uncommitted changes → Force swap (discard)
- Path D: Uncommitted changes → Abort

**Abort workflow paths:**
- Path A: No changes → Abort (keep branch)
- Path B: No changes → Abort (delete branch)
- Path C: Uncommitted changes → Stash → Abort
- Path D: Uncommitted changes → Force abort (discard)

**Launch workflow paths:**
- Path A: Clean state → Direct launch
- Path B: Uncommitted changes → Commit → Launch
- Path C: Uncommitted changes → Stash → Launch
- Path D: Existing session → Abort session → Launch
- Path E: Both issues → Handle changes → Handle session → Launch

**Cleanup workflow paths:**
- Path A: Stale sessions only → Clean sessions
- Path B: Stale sessions + orphaned branches → Full cleanup
- Path C: Nothing to clean → Report, exit
- Path D: User cancels → Abort

### Error Scenarios

Test failure modes:
1. git-droid doesn't return expected signal → Log error, present options
2. MCP tool call fails → Report error, guidance for manual recovery
3. User interrupts mid-workflow → State preserved for retry
4. Network timeout during CI wait → Report timeout, branch preserved
5. Stash conflicts during swap/abort → Guidance for manual resolution

## Success Metrics

1. **User Feedback:** Users report better understanding of workflow progress
2. **Support Reduction:** Fewer questions about "what's happening?"
3. **Error Clarity:** Easier to identify which stage failed
4. **Consistency:** All complex commands follow same pattern
5. **Reliability:** Signal mechanism works >99% of time

## Rollback Plan

If multi-stage orchestration causes issues:
1. Keep enhanced signal mechanism but reduce to single stage
2. Revert to original "Coordinate [workflow] workflow" pattern
3. Document lessons learned

## Future Enhancements

1. **Progress Indicators:** Show "Stage 1/3" in status messages
2. **Time Estimates:** "Completing ship workflow... (est. 30s remaining)"
3. **Parallel Stages:** For independent operations, run stages concurrently
4. **Stage Caching:** Skip redundant checks if state unchanged
5. **Workflow Replay:** Record stage progression for debugging

## References

- Original discussion: PR #120 feedback on ship workflow transparency
- git-droid output style: `.claude/output-styles/git-droid.md`
- Existing patterns: All commands in `.claude/commands/devsolo/`
- Signal mechanism inspiration: State machines, workflow orchestration patterns

---

**Next Steps:**
1. Review and approve this plan
2. Begin Phase 1: Refine `/devsolo:ship`
3. Test signal mechanism reliability
4. Iterate based on real-world usage
5. Roll out to remaining commands
