# Base Tool Refactoring Guide

## Overview

All MCP tools now follow a standardized workflow pattern enforced by the `BaseMCPTool` abstract class. This ensures consistency across commands and makes it easy to add pre-flight checks, parameter prompts, and post-flight verifications.

## Standard Workflow Pattern

Every tool follows these phases:

1. **Check Initialization** - Verify devsolo is initialized (skip for InitTool)
2. **Collect Missing Parameters** - Prompt-based parameter collection
3. **Run Pre-Flight Checks** - Validate preconditions with actionable options
4. **Handle Prompts** - Return options to user or auto-resolve with `--auto`
5. **Execute Core Workflow** - Main tool logic
6. **Run Post-Flight Verifications** - Verify postconditions
7. **Return Result** - Merge all results and return

## Refactoring Pattern

### Before (Old Pattern)

```typescript
export class AbortTool implements MCPTool<AbortToolInput, SessionToolResult> {
  async execute(input: AbortToolInput): Promise<SessionToolResult> {
    try {
      // Manual initialization check
      if (!(await this.configManager.isInitialized())) {
        return { success: false, errors: ['...'] };
      }

      // Workflow logic mixed with validation
      const session = await this.sessionRepo.getSessionByBranch(targetBranch);
      if (!session) {
        return { success: false, errors: ['...'] };
      }

      // No standard prompt handling
      // No pre-flight/post-flight checks

      return { success: true, ... };
    } catch (error) {
      return createErrorResult(error, 'AbortTool');
    }
  }
}
```

### After (New Pattern)

```typescript
export interface AbortToolInput extends WorkflowToolInput {
  branchName?: string;
  deleteBranch?: boolean;
  // auto is inherited from WorkflowToolInput
}

export class AbortTool extends BaseMCPTool<AbortToolInput, SessionToolResult> {
  constructor(
    private sessionRepo: SessionRepository,
    private gitOps: GitOperations,
    configManager: ConfigurationManager
  ) {
    super(configManager); // Pass to base for initialization checks
  }

  // Override only what you need:

  protected async collectMissingParameters(
    input: AbortToolInput
  ): Promise<PromptCollectionResult> {
    // Return early if parameters needed
    if (!input.branchName) {
      // Provide context for Claude to help
      return {
        collected: false,
        result: {
          success: true,
          message: 'No branch name provided. Use current branch or ask user.',
          data: { currentBranch: await this.gitOps.getCurrentBranch() },
        },
      };
    }
    return { collected: true };
  }

  protected async runPreFlightChecks(
    context: WorkflowContext
  ): Promise<PreFlightVerificationResult | null> {
    // Optional: Add pre-flight checks
    // For abort, we might check if session exists, is active, etc.
    return this.preFlightCheckService.runAll(
      ['sessionExists', 'sessionIsActive'],
      context
    );
  }

  protected async executeWorkflow(
    context: WorkflowContext
  ): Promise<WorkflowExecutionResult> {
    // Pure workflow logic - no validation mixed in
    const input = context.input as AbortToolInput;
    const targetBranch = input.branchName || (await this.gitOps.getCurrentBranch());
    const session = await this.sessionRepo.getSessionByBranch(targetBranch);

    // Abort session
    session.transitionTo('ABORTED', 'user_action');
    await this.sessionRepo.updateSession(session.id, session);

    // Delete branch if requested
    if (input.deleteBranch) {
      await this.deleteBranch(targetBranch);
    }

    return {
      success: true,
      data: {
        sessionId: session.id,
        branchName: session.branchName,
        state: session.currentState,
        nextSteps: [
          'Session has been aborted',
          input.deleteBranch ? 'Branch deleted' : 'Branch still exists',
          'Use devsolo_launch to start a new workflow',
        ],
      },
    };
  }

  // Post-flight checks optional
  protected async runPostFlightVerifications(...) {
    return this.postFlightVerification.runAll(
      ['sessionAborted', 'branchDeleted'],
      context
    );
  }
}
```

## Tool-by-Tool Refactoring Plan

### Tools with Full Pattern (Pre-flight + Post-flight)

**LaunchTool** - ✅ Already partially compliant
- Needs: Extend BaseMCPTool, use standard phases
- Has: Pre-flight checks, post-flight checks, prompt handling

**ShipTool** - ✅ Already partially compliant
- Needs: Extend BaseMCPTool, use standard phases
- Has: Pre-flight checks, post-flight checks, prompt handling

**HotfixTool** - Needs work
- Needs: Extend BaseMCPTool, add pre-flight checks
- Has: Prompt-based parameter collection

**CommitTool** - ✅ Already partially compliant
- Needs: Extend BaseMCPTool
- Has: Prompt-based parameter collection

### Tools with Partial Pattern (Some checks)

**AbortTool** - Needs work
- Add: `auto` flag, pre-flight checks (session exists)
- Keep: Simple workflow logic

**SwapTool** - Needs work
- Add: `auto` flag, pre-flight checks (target session exists, handle uncommitted changes)
- Current: Has manual validation

**InitTool** - Special case
- Override `checkInitialization()` to allow running when not initialized
- Add: Pre-flight check (is git repo)

### Tools with No Checks (Query tools)

**StatusTool** - Minimal changes
- Extend BaseMCPTool but override most phases to do nothing
- Keep: Pure query logic

**SessionsTool** - Minimal changes
- Extend BaseMCPTool but override most phases to do nothing
- Keep: Pure query logic

**CleanupTool** - Needs consideration
- Add: `auto` flag for confirming deletions
- Add: Pre-flight checks showing what will be cleaned

**StatusLineTool** - Minimal changes
- Extend BaseMCPTool but override most phases to do nothing
- Keep: Simple configuration logic

## Standard Input Interface

All tools should extend `WorkflowToolInput`:

```typescript
export interface MyToolInput extends WorkflowToolInput {
  // Tool-specific parameters
  myParam?: string;
  // auto is inherited from WorkflowToolInput
}
```

## Benefits

1. **Consistency** - All tools follow the same pattern
2. **Extensibility** - Easy to add checks to any tool later
3. **Type Safety** - Enforced by abstract class
4. **Maintainability** - Clear separation of concerns
5. **User Experience** - Consistent prompt/error handling

## Migration Checklist

For each tool:

- [ ] Add `extends WorkflowToolInput` to input interface
- [ ] Change `implements MCPTool` to `extends BaseMCPTool`
- [ ] Add `configManager` to constructor, pass to `super()`
- [ ] Remove manual initialization check from `execute()`
- [ ] Move parameter prompting to `collectMissingParameters()`
- [ ] Move validation to `runPreFlightChecks()`
- [ ] Move core logic to `executeWorkflow()`
- [ ] Add `runPostFlightVerifications()` if needed
- [ ] Update result formatting in `createFinalResult()` if needed
- [ ] Remove `try/catch` from `execute()` (handled by base)
- [ ] Remove old `force`/`yes` flags, use `auto`
- [ ] Test build and functionality
