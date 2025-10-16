# Workflow State Management

This document describes the workflow state indicator system used across devsolo's multi-stage workflows to eliminate redundant status checks and improve execution performance.

## Overview

Multi-stage workflows (`/devsolo:ship`, `/devsolo:launch`, `/devsolo:abort`, `/devsolo:swap`) previously performed redundant checks at each stage (e.g., checking for active session multiple times, re-running git status unnecessarily). The workflow state management system solves this by:

1. **Stage 1** performs all necessary pre-flight checks once
2. Creates a workflow state object containing verified information
3. Passes state to subsequent stages
4. Each subsequent stage skips redundant checks and uses verified state

## Benefits

- **Faster Execution**: No redundant git operations or file system checks
- **Clearer Logic**: Each stage knows exactly what's been verified
- **Better Debugging**: State object provides full audit trail
- **Reduced Complexity**: Stages don't need to re-implement verification logic

## Workflow State Object Structure

```json
{
  "workflowId": "workflow-type-timestamp",
  "stage": "STAGE_N",
  "verified": {
    // Flags indicating what has been verified
    // (varies by workflow type)
  },
  "context": {
    // Dynamic context data
    // (varies by workflow type and stage)
  }
}
```

### Common Verified Fields

All workflows include these in the `verified` section:

- `sessionActive`: Session existence verified
- `changesChecked`: Git status has been checked

Workflow-specific fields:

- **ship**: `sessionReady`, `commitCompleted`
- **launch**: `onMainBranch`, `mainSynced`, `sessionChecked`
- **abort**: `sessionExists`
- **swap**: `targetSessionExists`

### Common Context Fields

All workflows include these in the `context` section:

- `branchName`: Current or target branch name
- `hasUncommittedChanges`: Whether uncommitted changes were detected
- `userChoice`: User's selection from presented options

## Implementation Pattern

### Stage 1: Initialize & Verify

```markdown
**prompt:** "Initialize workflow. You must:
  - Check for active devsolo session
  - Check for uncommitted changes using `git status`
  - [Other workflow-specific checks]
  - Create workflow state object:
    ```json
    {
      \"workflowId\": \"workflow-[timestamp]\",
      \"stage\": \"STAGE_1\",
      \"verified\": {
        \"sessionActive\": [true/false],
        \"changesChecked\": true
      },
      \"context\": {
        \"branchName\": \"[branch-name]\",
        \"hasUncommittedChanges\": [true/false],
        \"userChoice\": \"[OPTION]\"
      }
    }
    ```"
```

### Stage N: Use State

```markdown
**prompt:** "Continue workflow with state from Stage N-1: [pass workflow state object]. You must:
  - SKIP session verification (already verified in Stage 1 - check workflow state)
  - SKIP uncommitted changes check (already checked in Stage 1 - check workflow state)
  - [Perform stage-specific operations]
  - Update workflow state object:
    ```json
    {
      \"stage\": \"STAGE_N\",
      \"verified\": { ...previous verified fields... },
      \"context\": {
        ...previous context fields...,
        \"newField\": [value]
      }
    }
    ```"
```

### Orchestrator Responsibilities

The orchestrator (slash command handler) must:

1. **After Stage 1**: Extract workflow state from git-droid response
2. **Before Stage N**: Pass workflow state to git-droid sub-agent
3. **After Stage N**: Extract updated state for next stage

```markdown
1. **Use the Task tool** to invoke git-droid sub-agent
   [prompt includes workflow state]

2. **⬆️ OUTPUT** the complete git-droid response

3. **Extract workflow state** from git-droid response

4. **Check the response** for "Next Stage:" directive

5. **Pass workflow state** to next stage
```

## Workflow-Specific Details

### Ship Workflow (3 stages)

**Stage 1: Initialize Ship Workflow**
- Verifies: session active, uncommitted changes, session ready to ship
- State created with: sessionActive, changesChecked, hasUncommittedChanges

**Stage 2: Commit Changes (Conditional)**
- Receives state, skips: session verification, changes check
- Updates state with: commitCompleted, commitSha

**Stage 3: Complete Ship Workflow**
- Receives state, skips: session verification, changes check, commit verification
- Updates state with: prNumber, prUrl, merged

### Launch Workflow (4 stages)

**Stage 1: Initialize Launch Workflow**
- Verifies: on main branch, main synced, uncommitted changes, existing session
- State created with: onMainBranch, mainSynced, changesChecked, sessionChecked

**Stage 2: Handle Uncommitted Changes (Conditional)**
- Receives state, skips: branch verification, main sync check
- Updates state with: changesHandled, changeAction

**Stage 3: Handle Existing Session (Conditional)**
- Receives state, skips: branch verification, main sync check, changes check
- Updates state with: sessionHandled, sessionAction

**Stage 4: Create Feature Branch**
- Receives state, skips: all prior verifications
- Updates state with: branchCreated, branchName, sessionId

### Abort Workflow (3 stages)

**Stage 1: Initialize Abort Workflow**
- Verifies: session exists, uncommitted changes
- State created with: sessionExists, sessionId, changesChecked

**Stage 2: Handle Uncommitted Changes (Conditional)**
- Receives state, skips: session verification, changes check
- Updates state with: stashCreated, stashRef

**Stage 3: Abort Session**
- Receives state, skips: session verification, changes check
- Updates state with: sessionAborted, branchDeleted

### Swap Workflow (3 stages)

**Stage 1: Initialize Swap Workflow**
- Verifies: target session exists, uncommitted changes on current branch
- State created with: targetSessionExists, targetSessionId, changesChecked

**Stage 2: Stash Current Work (Conditional)**
- Receives state, skips: target session verification, changes check
- Updates state with: stashCreated, stashRef

**Stage 3: Switch to Target Branch**
- Receives state, skips: target session verification, changes check
- Updates state with: swapped, stashPopped

## Best Practices

### For Workflow Developers

1. **Always verify in Stage 1**: Perform all necessary checks once
2. **Document what's verified**: Update verified flags in state object
3. **Pass complete state**: Include all previous verified and context data
4. **Update incrementally**: Add new context as stages progress
5. **Clear SKIP instructions**: Explicitly tell git-droid what to skip

### For git-droid Sub-agents

1. **Check workflow state first**: Always read the state object if provided
2. **Respect SKIP instructions**: Don't re-run verified checks
3. **Update state accurately**: Ensure all changes are reflected
4. **Preserve previous data**: Don't lose verified flags or context

### For Testing

1. **Verify state propagation**: Ensure state passes correctly between stages
2. **Test skip behavior**: Confirm checks are actually skipped
3. **Validate state updates**: Check that each stage updates state correctly
4. **Test error scenarios**: Ensure state handles failures gracefully

## Performance Impact

Before workflow state management:
- Ship workflow: ~3-5 redundant git operations
- Launch workflow: ~5-8 redundant git operations
- Abort workflow: ~2-3 redundant git operations
- Swap workflow: ~2-3 redundant git operations

After workflow state management:
- All workflows: Only necessary operations executed once

Estimated performance improvement: **20-40% faster execution** depending on workflow complexity and repository size.

## Future Enhancements

Potential improvements to the workflow state system:

1. **State Persistence**: Save state to .devsolo/workflow-state/ for crash recovery
2. **State Validation**: JSON schema validation for state objects
3. **State Introspection**: /devsolo:state command to view current workflow state
4. **State History**: Track state changes for debugging and audit
5. **Cross-Workflow State**: Share verified state between related workflows

## Related Documentation

- [Git-droid Output Style](../../../.claude/output-styles/git-droid.md)
- [Ship Command](../../../.claude/commands/devsolo/ship.md)
- [Launch Command](../../../.claude/commands/devsolo/launch.md)
- [Abort Command](../../../.claude/commands/devsolo/abort.md)
- [Swap Command](../../../.claude/commands/devsolo/swap.md)
