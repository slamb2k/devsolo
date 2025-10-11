import { BaseToolResult, MCPTool } from './base-tool';
import { ConfigurationManager } from '../../services/configuration-manager';
import { PreFlightVerificationResult } from '../../services/validation/pre-flight-check-service';
import { PostFlightVerificationResult } from '../../services/validation/post-flight-verification';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

/**
 * Standard input structure for all workflow tools
 */
export interface WorkflowToolInput {
  auto?: boolean; // Automatically choose recommended options for prompts
  _via_prompt?: boolean; // Hidden: validates call is via MCP prompt (ensures banner display)
  [key: string]: unknown; // Allow additional tool-specific parameters
}

/**
 * Context passed through workflow phases
 */
export interface WorkflowContext {
  input: WorkflowToolInput;
  [key: string]: unknown; // Tool-specific context
}

/**
 * Result from prompt-based parameter collection
 */
export interface PromptCollectionResult {
  collected: boolean; // true if all parameters collected
  result?: BaseToolResult; // Result to return if not all collected
}

/**
 * Result from core workflow execution
 */
export interface WorkflowExecutionResult {
  success: boolean;
  data?: Record<string, unknown>;
  errors?: string[];
  warnings?: string[];
  [key: string]: unknown;
}

/**
 * Abstract base class for all MCP workflow tools
 * Enforces standard workflow pattern:
 * 1. Check initialization
 * 2. Collect missing parameters (prompt-based)
 * 3. Run pre-flight checks
 * 4. Handle prompts (return options or auto-resolve)
 * 5. Execute core workflow
 * 6. Run post-flight verifications
 * 7. Return result
 */
export abstract class BaseMCPTool<TInput extends WorkflowToolInput, TResult extends BaseToolResult>
implements MCPTool<TInput, TResult> {
  constructor(
    protected configManager: ConfigurationManager,
    protected server?: Server
  ) {}

  /**
   * Main execution flow - DO NOT OVERRIDE
   * This enforces the standard pattern for all tools
   */
  async execute(input: TInput): Promise<TResult> {
    try {
      // Note: Banner display is now handled by slash commands, not MCP tools
      // Slash commands display the banner before invoking MCP tools

      // Phase 1: Check initialization
      const initCheck = await this.checkInitialization();
      if (!initCheck.success) {
        return initCheck as TResult;
      }

      // Phase 2: Prompt-based parameter collection
      const paramResult = await this.collectMissingParameters(input);
      if (!paramResult.collected && paramResult.result) {
        return paramResult.result as TResult;
      }

      // Create workflow context
      const context: WorkflowContext = {
        input,
        ...await this.createContext(input),
      };

      // Phase 3: Run pre-flight checks
      const preFlightResult = await this.runPreFlightChecks(context);

      // Phase 4: Handle prompts
      if (preFlightResult && preFlightResult.promptCount > 0) {
        const promptResult = await this.handlePrompts(preFlightResult, input);
        if (promptResult) {
          return promptResult as TResult;
        }
      }

      // Phase 5: Handle errors (only internal failures)
      if (preFlightResult && preFlightResult.failedCount > 0) {
        return this.createPreFlightErrorResult(preFlightResult) as TResult;
      }

      // Phase 6: Execute core workflow
      const workflowResult = await this.executeWorkflow(context);
      if (!workflowResult.success) {
        return this.createWorkflowErrorResult(workflowResult) as TResult;
      }

      // Phase 7: Run post-flight verifications
      const postFlightResult = await this.runPostFlightVerifications(context, workflowResult);

      // Phase 8: Merge and return final result
      return this.createFinalResult(workflowResult, preFlightResult, postFlightResult);
    } catch (error) {
      return this.createErrorResult(error);
    }
  }

  /**
   * Phase 1: Check initialization
   * Override if tool doesn't require initialization (e.g., InitTool)
   */
  protected async checkInitialization(): Promise<BaseToolResult> {
    const isInitialized = await this.configManager.isInitialized();
    if (!isInitialized) {
      return {
        success: false,
        errors: ['devsolo is not initialized. Run devsolo_init first.'],
      };
    }
    return { success: true };
  }

  /**
   * Phase 2: Collect missing parameters
   * Override to implement prompt-based parameter collection
   * Return { collected: true } if all parameters present
   * Return { collected: false, result } to return early with prompt
   */
  protected async collectMissingParameters(
    _input: TInput
  ): Promise<PromptCollectionResult> {
    // Default: assume all parameters collected
    return { collected: true };
  }

  /**
   * Create workflow context
   * Override to add tool-specific context
   */
  protected async createContext(_input: TInput): Promise<Record<string, unknown>> {
    return {};
  }

  /**
   * Phase 3: Run pre-flight checks
   * Override to implement pre-flight validation
   * Return null if no pre-flight checks needed
   */
  protected async runPreFlightChecks(
    _context: WorkflowContext
  ): Promise<PreFlightVerificationResult | null> {
    // Default: no pre-flight checks
    return null;
  }

  /**
   * Phase 4: Handle prompts from pre-flight checks
   * Default implementation returns options to user or auto-resolves
   * Override for custom prompt handling
   */
  protected async handlePrompts(
    preFlightResult: PreFlightVerificationResult,
    input: TInput
  ): Promise<BaseToolResult | null> {
    if (!input.auto) {
      // Return prompts to user for manual resolution
      const result: any = {
        success: true,
        message: 'Pre-flight checks need your input. Please choose an option to continue.',
        preFlightChecks: preFlightResult.checks,
        warnings: preFlightResult.warnings,
        nextSteps: [
          'Review the available options for each check',
          'Choose an action to resolve each issue',
          'Or use auto: true to automatically choose recommended options',
        ],
      };
      return result;
    }

    // auto mode: execute recommended actions
    // TODO: Implement auto-resolution logic
    // For now, continue with workflow (assumes checks can be bypassed)
    return null;
  }

  /**
   * Create error result from pre-flight failures
   */
  protected createPreFlightErrorResult(
    preFlightResult: PreFlightVerificationResult
  ): BaseToolResult {
    const result: any = {
      success: false,
      preFlightChecks: preFlightResult.checks,
      errors: preFlightResult.failures,
      warnings: preFlightResult.warnings,
    };
    return result;
  }

  /**
   * Phase 6: Execute core workflow
   * MUST OVERRIDE - this is the main tool logic
   */
  protected abstract executeWorkflow(
    context: WorkflowContext
  ): Promise<WorkflowExecutionResult>;

  /**
   * Create error result from workflow execution failure
   */
  protected createWorkflowErrorResult(
    workflowResult: WorkflowExecutionResult
  ): BaseToolResult {
    return {
      success: false,
      errors: workflowResult.errors || ['Workflow execution failed'],
      warnings: workflowResult.warnings,
    };
  }

  /**
   * Phase 7: Run post-flight verifications
   * Override to implement post-flight validation
   * Return null if no post-flight checks needed
   */
  protected async runPostFlightVerifications(
    _context: WorkflowContext,
    _workflowResult: WorkflowExecutionResult
  ): Promise<PostFlightVerificationResult | null> {
    // Default: no post-flight checks
    return null;
  }

  /**
   * Phase 8: Create final result
   * Override to customize result formatting
   */
  protected createFinalResult(
    workflowResult: WorkflowExecutionResult,
    preFlightResult: PreFlightVerificationResult | null,
    postFlightResult: PostFlightVerificationResult | null
  ): TResult {
    const result: any = {
      success: postFlightResult ? postFlightResult.failedCount === 0 : workflowResult.success,
      ...workflowResult.data,
      errors: [...(workflowResult.errors || [])],
      warnings: [...(workflowResult.warnings || [])],
    };

    // Note: Banner display is now handled by slash commands, not MCP tools

    // Merge pre-flight results
    if (preFlightResult) {
      result.preFlightChecks = preFlightResult.checks;
      result.errors.push(...preFlightResult.failures);
      result.warnings.push(...preFlightResult.warnings);
    }

    // Merge post-flight results
    if (postFlightResult) {
      result.postFlightVerifications = postFlightResult.checks;
      result.errors.push(...postFlightResult.failures);
      result.warnings.push(...postFlightResult.warnings);
    }

    return result as TResult;
  }

  /**
   * Create error result from exception
   */
  protected createErrorResult(error: unknown): TResult {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      errors: [`${this.constructor.name} failed: ${errorMessage}`],
    } as TResult;
  }

  /**
   * Get tool name for error messages
   */
  protected getToolName(): string {
    return this.constructor.name;
  }
}
