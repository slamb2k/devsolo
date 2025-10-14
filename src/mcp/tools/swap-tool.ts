import {
  BaseMCPTool,
  WorkflowToolInput,
  WorkflowContext,
  WorkflowExecutionResult,
} from './workflow-tool-base';
import { SessionToolResult } from './base-tool';
import { SessionRepository } from '../../services/session-repository';
import { GitOperations } from '../../services/git-operations';
import { StashManager } from '../../services/stash-manager';
import { ConfigurationManager } from '../../services/configuration-manager';
import { WorkflowSession } from '../../models/workflow-session';
import { PreFlightVerificationResult, PreFlightCheckResult } from '../../services/validation/pre-flight-check-service';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

/**
 * Input for swap tool
 */
export interface SwapToolInput extends WorkflowToolInput {
  branchName: string;
  stash?: boolean;
}

/**
 * Swap tool - Switches between workflow sessions
 */
export class SwapTool extends BaseMCPTool<SwapToolInput, SessionToolResult> {
  constructor(
    private sessionRepo: SessionRepository,
    private gitOps: GitOperations,
    private stashManager: StashManager,
    configManager: ConfigurationManager,
    server?: Server
  ) {
    super(configManager, server);
  }

  protected getBanner(): string {
    return `░█▀▀░█░█░█▀█░█▀█░█▀█░▀█▀░█▀█░█▀▀░
░▀▀█░█▄█░█▀█░█▀▀░█▀▀░░█░░█░█░█░█░
░▀▀▀░▀░▀░▀░▀░▀░░░▀░░░▀▀▀░▀░▀░▀▀▀░`;
  }

  protected async createContext(input: SwapToolInput): Promise<Record<string, unknown>> {
    // Get target session (will be validated in pre-flight checks)
    const targetSession = await this.sessionRepo.getSessionByBranch(input.branchName);

    // Handle uncommitted changes with stash option
    const hasChanges = await this.gitOps.hasUncommittedChanges();
    if (hasChanges && input.stash) {
      const currentBranch = await this.gitOps.getCurrentBranch();
      await this.stashManager.stashChanges('swap', currentBranch);
    }

    return { targetSession };
  }

  protected async runPreFlightChecks(
    context: WorkflowContext
  ): Promise<PreFlightVerificationResult> {
    const input = context.input as SwapToolInput;
    const targetSession = context['targetSession'] as WorkflowSession | undefined;

    // Custom check: target session exists
    const targetSessionCheck: PreFlightCheckResult = targetSession
      ? {
        name: 'Target Session Exists',
        passed: true,
        message: `Session found for branch '${input.branchName}'`,
        level: 'info',
      }
      : {
        name: 'Target Session Exists',
        passed: false,
        message: `No session found for branch '${input.branchName}'`,
        level: 'error',
        suggestions: ['Use devsolo_sessions to list available sessions'],
      };

    // Build result with custom check
    const failures = !targetSessionCheck.passed && targetSessionCheck.level === 'error'
      ? [targetSessionCheck.message || 'Target session check failed']
      : [];

    return {
      allPassed: targetSessionCheck.passed,
      checks: [targetSessionCheck],
      failures,
      warnings: [],
      prompts: [],
      passedCount: targetSessionCheck.passed ? 1 : 0,
      failedCount: !targetSessionCheck.passed && targetSessionCheck.level === 'error' ? 1 : 0,
      warningCount: 0,
      promptCount: 0,
    };
  }

  protected async executeWorkflow(
    context: WorkflowContext
  ): Promise<WorkflowExecutionResult> {
    const input = context.input as SwapToolInput;
    const targetSession = context['targetSession'] as WorkflowSession;

    // Switch to target branch
    await this.gitOps.checkoutBranch(input.branchName);

    return {
      success: true,
      data: {
        sessionId: targetSession.id,
        branchName: targetSession.branchName,
        state: targetSession.currentState,
        nextSteps: [
          `Switched to ${input.branchName}`,
          'Continue working on this feature',
          'Use devsolo_info to check current state',
        ],
      },
    };
  }
}
