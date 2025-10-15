# Development Learnings

This folder contains reusable patterns, coding strategies, testing approaches, naming conventions, and best practices discovered during devsolo development.

## Purpose

This serves as institutional memory - a knowledge base for current and future developers to:
- Avoid repeating mistakes
- Reuse successful patterns
- Understand why certain approaches were chosen
- Maintain consistency across the codebase

## What Goes Here

- Coding patterns and idioms
- Testing strategies and fixtures
- Naming conventions
- Architecture patterns
- Performance optimization techniques
- Error handling approaches
- State management patterns
- Git workflow learnings
- Tool configurations and why

## Current Learnings

### [Prompt-Based Parameter Collection Pattern](prompt-based-parameter-collection.md)
**Status**: ✅ Active (v2.0.0) - Extended with Hybrid Approach

A pattern for handling missing optional parameters in MCP tools by returning successful results with prompts instead of errors. This leverages Claude Code's conversational abilities to fill in missing information through AI-assisted generation **or user input**.

**Key Insight**: Since Claude Code doesn't support MCP elicitations, we return success with context and prompts, allowing Claude to generate missing parameters (commit messages, PR descriptions, etc.) in a multi-turn conversation. The pattern supports three interaction models:
- **AI-Generated**: Claude automatically generates the parameter
- **User-Provided**: Claude asks user for input
- **Collaborative**: Claude suggests, user modifies

**Used In**: CommitTool, ShipTool, LaunchTool, HotfixTool

**Benefits**: Natural conversational flow, AI assistance when helpful, user control when needed

---

### [Git-Droid Agent Workflow](git-droid-agent-workflow.md)
**Status**: ✅ Active (v2.5.0) - Critical Workflow Pattern

A mandatory pattern for routing all devsolo git operations through the git-droid agent using the Task tool. **NEVER** call MCP tools directly for git operations.

**Key Insight**: The git-droid agent provides proper workflow coordination, state machine validation, auto-mode/verbose-mode handling, error recovery, and complete audit trail. Bypassing the agent breaks workflow coordination.

**Used For**: All devsolo git operations (ship, commit, launch, swap, abort, hotfix)

**Benefits**: Proper workflow coordination, state validation, auto-mode support, error recovery

---

## Future Topics (To Document)

Organize by topic:
- `typescript-patterns.md` - TypeScript-specific patterns
- `testing-strategies.md` - Testing approaches that work well
- `state-machine-patterns.md` - State management learnings
- `git-workflow-best-practices.md` - Git/GitHub workflow insights
- `mcp-integration-patterns.md` - MCP server patterns
- `error-handling.md` - Error handling approaches

## How to Use

When implementing new features:
1. Check this folder for relevant patterns
2. Apply proven approaches
3. Add new learnings when you discover something valuable

When you discover a pattern worth preserving:
1. Extract it from the implementation
2. Document why it works
3. Provide examples
4. Add it here for others to find

## Related Documentation

- See [../reports/](../reports/) for the source of many learnings
- See [../plans/](../plans/) to apply these patterns to future work
