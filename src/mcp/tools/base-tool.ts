import { PreFlightCheckResult, PreFlightVerificationResult } from '../../services/validation/pre-flight-check-service';
import { PostFlightCheckResult, PostFlightVerificationResult } from '../../services/validation/post-flight-verification';

/**
 * Base result interface for all MCP tools
 */
export interface BaseToolResult {
  success: boolean;
  errors?: string[];
  warnings?: string[];
}

/**
 * Extended result with pre/post-flight checks
 */
export interface ToolResultWithValidation extends BaseToolResult {
  preFlightChecks?: PreFlightCheckResult[];
  postFlightVerifications?: PostFlightCheckResult[];
}

/**
 * Result for tools that create/modify sessions
 */
export interface SessionToolResult extends ToolResultWithValidation {
  sessionId?: string;
  branchName?: string;
  state?: string;
  nextSteps?: string[];
  message?: string;  // For prompt-based parameter collection
  data?: Record<string, unknown>;  // For providing context to Claude
}

/**
 * Result for tools that interact with GitHub
 */
export interface GitHubToolResult extends ToolResultWithValidation {
  prNumber?: number;
  prUrl?: string;
  commitSha?: string;
  merged?: boolean;
  message?: string;  // For prompt-based parameter collection
  data?: Record<string, unknown>;  // For providing context to Claude
  nextSteps?: string[];  // For guidance
}

/**
 * Result for status/query tools
 */
export interface QueryToolResult extends BaseToolResult {
  data: Record<string, unknown>;
  message?: string;
}

/**
 * Base interface for all MCP tools
 */
export interface MCPTool<TInput = unknown, TResult extends BaseToolResult = BaseToolResult> {
  /**
   * Execute the tool with given input
   */
  execute(input: TInput): Promise<TResult>;

  /**
   * Validate input before execution (optional)
   */
  validateInput?(input: TInput): Promise<{ valid: boolean; errors?: string[] }>;
}

/**
 * Error class for tool execution failures
 */
export class ToolExecutionError extends Error {
  constructor(
    message: string,
    public readonly toolName: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ToolExecutionError';
    Object.setPrototypeOf(this, ToolExecutionError.prototype);
  }
}

/**
 * Helper to create standardized error results
 */
export function createErrorResult(error: unknown, toolName: string): BaseToolResult {
  const errorMessage = error instanceof Error ? error.message : String(error);

  return {
    success: false,
    errors: [`${toolName} failed: ${errorMessage}`],
  };
}

/**
 * Helper to create success results
 */
export function createSuccessResult(
  data?: Partial<BaseToolResult>
): BaseToolResult {
  return {
    success: true,
    ...data,
  };
}

/**
 * Helper to merge pre-flight and post-flight results into tool result
 */
export function mergeValidationResults(
  baseResult: BaseToolResult,
  preFlightResult?: PreFlightVerificationResult,
  postFlightResult?: PostFlightVerificationResult
): ToolResultWithValidation {
  const result: ToolResultWithValidation = {
    ...baseResult,
    errors: [...(baseResult.errors || [])],
    warnings: [...(baseResult.warnings || [])],
  };

  if (preFlightResult) {
    result.preFlightChecks = preFlightResult.checks;
    result.errors!.push(...preFlightResult.failures);
    result.warnings!.push(...preFlightResult.warnings);
  }

  if (postFlightResult) {
    result.postFlightVerifications = postFlightResult.checks;
    result.errors!.push(...postFlightResult.failures);
    result.warnings!.push(...postFlightResult.warnings);
  }

  return result;
}
