# Slash Command Sub-Agent Invocation Fix

**Date:** 2025-10-14
**Issue:** Slash commands were not properly invoking sub-agents
**Status:** Fixed

## Problem Statement

When users invoked devsolo slash commands like `/devsolo:ship`, Claude Code was falling back to general-purpose git/PR instructions and executing workflows using direct bash commands instead of following the documented architecture:

**Expected Flow:**
```
User → Slash Command → Sub-Agent → MCP Tool → Structured Results
```

**Actual Flow (Before Fix):**
```
User → Slash Command → Direct Bash Commands (bypassing architecture)
```

## Root Cause Analysis

### Issue 1: Ambiguous Instructions

Command files contained vague instructions like:
```markdown
1. **Invoke git-droid sub-agent** to coordinate the ship workflow
```

This didn't specify **HOW** to invoke the sub-agent, leading Claude to interpret the request as general guidance rather than specific tool usage.

### Issue 2: Missing Tool Reference

The command files didn't explicitly mention the **Task tool** or the **subagent_type** parameter, which are required to invoke specialized sub-agents.

### Issue 3: Conflict with System Instructions

Claude Code's system instructions include detailed git/PR workflows that use direct bash commands. Without explicit instructions to use sub-agents, Claude would default to these general instructions.

## Architecture Overview

devsolo uses a three-layer architecture:

### Layer 1: Slash Commands (`.claude/commands/devsolo/*.md`)
- Entry point for user interaction
- Display banners
- Orchestrate workflow by invoking sub-agents
- Pass user arguments to sub-agents

### Layer 2: Sub-Agents (`.claude/agents/*.md`)
- **git-droid**: Coordinates git workflow operations
- **docs-droid**: Manages documentation operations
- Invoked via Task tool with specific `subagent_type`
- Call MCP tools for actual operations
- Format MCP results into user-friendly output

### Layer 3: MCP Tools (`src/mcp/tools/*.ts`)
- Pure business logic implementation
- Return structured data (PreFlightCheckResult[], PostFlightCheckResult[], etc.)
- No CLI/UI formatting
- Stateless operations

## Solution Implementation

Updated all 9 devsolo command files to explicitly specify Task tool invocation:

### Before (Ambiguous)
```markdown
1. **Invoke git-droid sub-agent** to coordinate the ship workflow
```

### After (Explicit)
```markdown
1. **Use the Task tool** to invoke the git-droid sub-agent:
   - **subagent_type:** "git-droid"
   - **description:** "Coordinate ship workflow"
   - **prompt:** "Execute the ship workflow with the following parameters: [pass all user arguments]. You must:
     - Check for uncommitted changes
     - Generate PR description if not provided
     - Call `mcp__devsolo__devsolo_ship` MCP tool with all parameters
     - Format all results following git-droid output style from `.claude/output-styles/git-droid.md`
     - Include these sections: Pre-flight Checks, Operations Executed, Post-flight Verifications, Result Summary, Next Steps"
```

## Files Modified

### Command Files (9 files)
1. `.claude/commands/devsolo/ship.md` - Ship workflow
2. `.claude/commands/devsolo/commit.md` - Commit workflow
3. `.claude/commands/devsolo/launch.md` - Launch workflow
4. `.claude/commands/devsolo/abort.md` - Abort workflow
5. `.claude/commands/devsolo/swap.md` - Swap workflow
6. `.claude/commands/devsolo/cleanup.md` - Cleanup workflow
7. `.claude/commands/devsolo/hotfix.md` - Hotfix workflow
8. `.claude/commands/devsolo/doc.md` - Documentation management

All commands with query-only operations (info, sessions, init, status-line) already use direct MCP tool calls without sub-agents, which is correct since they don't need orchestration.

## Agent Type Registration

The Task tool in Claude Code has pre-registered agent types:

```
Available agent types:
- general-purpose: Multi-step tasks (Tools: *)
- statusline-setup: Status line configuration (Tools: Read, Edit)
- output-style-setup: Output style creation (Tools: Read, Write, Edit, Glob, Grep)
- git-droid: Git workflow coordination for devsolo (Tools: *)
- docs-droid: Documentation management for devsolo (Tools: *)
```

The `git-droid` and `docs-droid` agent types map to their respective agent definition files in `.claude/agents/`.

## Correct Usage Pattern

### 1. User Invokes Slash Command
```
/devsolo:ship
```

### 2. Claude Reads Command File
Reads `.claude/commands/devsolo/ship.md` and follows instructions.

### 3. Display Banner
```
░█▀▀░█░█░▀█▀░█▀█░█▀█░▀█▀░█▀█░█▀▀░
░▀▀█░█▀█░░█░░█▀▀░█▀▀░░█░░█░█░█░█░
░▀▀▀░▀░▀░▀▀▀░▀░░░▀░░░▀▀▀░▀░▀░▀▀▀░
```

### 4. Invoke Sub-Agent via Task Tool
```javascript
Task({
  subagent_type: "git-droid",
  description: "Coordinate ship workflow",
  prompt: "Execute the ship workflow with parameters: {...}"
})
```

### 5. git-droid Executes Workflow
- Checks for uncommitted changes (may invoke `/devsolo:commit` via SlashCommand tool)
- Analyzes commits since main
- Generates PR description if needed
- Calls `mcp__devsolo__devsolo_ship` MCP tool
- Receives structured results from MCP tool
- Formats results using templates from `.claude/output-styles/git-droid.md`

### 6. git-droid Returns Formatted Results
Returns to Claude with sections:
- Pre-flight Checks
- Operations Executed
- Post-flight Verifications
- Result Summary
- Next Steps

### 7. Claude Presents to User
Claude displays the formatted results from git-droid to the user.

## Benefits of This Architecture

### 1. Separation of Concerns
- Commands: Orchestration
- Sub-agents: Coordination and formatting
- MCP tools: Business logic

### 2. Consistent Output Formatting
All validation commands follow the same output pattern via output-style templates.

### 3. Reusability
Sub-agents can be invoked by multiple commands or other sub-agents (e.g., ship can invoke commit).

### 4. Maintainability
- MCP tools contain pure logic without UI concerns
- Output formatting centralized in output-style files
- Easy to update formatting without touching business logic

### 5. Testability
- MCP tools return structured data that's easy to test
- Sub-agents can be tested independently
- Clear interfaces between layers

## Testing Recommendations

### 1. Manual Testing
Test each command to verify proper sub-agent invocation:
```bash
/devsolo:launch --description="Test feature"
/devsolo:commit --message="Test commit"
/devsolo:ship
```

Verify that:
- Banner displays before sub-agent invocation
- Sub-agent coordinates the workflow
- MCP tools are called (not direct git commands)
- Output follows standard formatting with labeled sections

### 2. Automated Testing
Add integration tests that verify:
- Slash commands invoke correct sub-agents
- Sub-agents call correct MCP tools
- Results follow output format specifications

### 3. Negative Testing
Test failure scenarios:
- Commands without active session
- Commands with uncommitted changes
- Commands with invalid parameters

Verify that error handling follows the same output pattern.

## Related Documentation

- **Command Output Consistency:** `docs/dev/reports/command-output-consistency-review.md`
- **Feature Spec:** `specs/004-command-output-consistency-alignment.md`
- **Sub-Agent Definitions:** `.claude/agents/git-droid.md`, `.claude/agents/docs-droid.md`
- **Output Styles:** `.claude/output-styles/git-droid.md`, `.claude/output-styles/docs-droid.md`
- **MCP Tools:** `src/mcp/tools/*.ts`

## Future Considerations

### 1. Command Validation
Consider adding validation that ensures commands properly invoke sub-agents rather than falling back to default behavior.

### 2. Sub-Agent Testing
Create test harness that can invoke sub-agents directly to verify behavior without going through slash commands.

### 3. Output Format Validation
Add automated checks that verify sub-agent output matches the expected format from output-style templates.

### 4. Documentation
Update user-facing documentation to explain the three-layer architecture and how commands flow through the system.

## Conclusion

This fix ensures that devsolo slash commands properly follow the documented three-layer architecture (Command → Sub-Agent → MCP Tool) rather than falling back to general-purpose git instructions. The explicit Task tool invocation pattern makes the architecture clear and prevents future regressions.

**Status:** ✅ Complete
**Next Steps:** Test the updated ship command to verify proper workflow
