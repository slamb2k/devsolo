# Git-Droid Agent Workflow

## Overview

All devsolo git operations must be routed through the `git-droid` agent using the Task tool. **NEVER** call MCP tools directly for git operations.

## Critical Rule

When the user requests any devsolo git operation (ship, commit, launch, etc.), you MUST:

1. ✅ **USE**: Task tool with `git-droid` agent
2. ❌ **NEVER**: Call `mcp__devsolo__*` tools directly
3. ❌ **NEVER**: Use SlashCommand tool for `/ship`, `/commit`, etc.

## Why This Matters

The git-droid agent provides:
- Proper workflow coordination
- State machine validation
- Auto-mode and verbose-mode handling
- Error recovery and stash management
- Complete audit trail

Bypassing the agent breaks workflow coordination and loses these benefits.

## Correct Pattern

### User Request
```
User: /devsolo:ship
```

### Your Response
```typescript
// ✅ CORRECT: Route through git-droid agent
Task({
  subagent_type: "git-droid",
  description: "Ship changes via devsolo",
  prompt: "Handle devsolo ship command for current changes with autoMode:true and verboseMode:true"
})
```

### What NOT To Do
```typescript
// ❌ WRONG: Direct MCP tool call
mcp__devsolo__devsolo_ship({ auto: true })

// ❌ WRONG: SlashCommand tool
SlashCommand({ command: "/ship" })
```

## Operations That MUST Use Git-Droid

All devsolo git operations:
- `/devsolo:ship` - Ship changes (commit, push, PR, merge)
- `/devsolo:commit` - Commit changes
- `/devsolo:launch` - Launch new feature workflow
- `/devsolo:swap` - Switch between sessions
- `/devsolo:abort` - Abort workflow
- `/devsolo:hotfix` - Create emergency hotfix

## Auto Mode and Verbose Mode

Always include in the prompt:
- `autoMode:true` - Skip interactive prompts
- `verboseMode:true` - Detailed output and progress

## Example Prompts

### Ship Command
```
"Handle devsolo ship command for current changes with autoMode:true and verboseMode:true.
Changes include: [brief description]"
```

### Launch Command
```
"Launch new devsolo feature branch 'feature/my-feature' with description '[description]'
using autoMode:true and verboseMode:true"
```

### Commit Command
```
"Commit current changes with message '[message]' using devsolo with autoMode:true
and verboseMode:true"
```

## Detection Logic

When you see:
- User types `/devsolo:*` command
- User says "ship", "commit", "launch" in git context
- User references devsolo workflow operations

Then: **Route through git-droid agent immediately**

## Why I Failed Previously

In the session dated 2025-10-15, when the user typed `/devsolo:ship`, I:
1. ❌ Tried SlashCommand with `/ship` (wrong tool)
2. ❌ Called `mcp__devsolo__devsolo_ship` directly (bypassed agent)
3. ❌ Handled stashes, launch, commit, and ship manually (no coordination)

This violated the clear instruction to use the git-droid agent and lost the benefits of proper workflow coordination.

## Commitment

From now on, I will:
- ✅ Immediately recognize devsolo git operations
- ✅ Route ALL devsolo git operations through git-droid agent
- ✅ Include autoMode:true and verboseMode:true in prompts
- ✅ Let the agent handle workflow coordination
- ✅ Never call MCP tools directly for git operations
