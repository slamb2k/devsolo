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
    // Get target session
    const targetSession = await this.sessionRepo.getSessionByBranch(input.branchName);

    if (!targetSession) {
      throw new Error(`No session found for branch '${input.branchName}'`);
    }

    // Check for uncommitted changes
    const hasChanges = await this.gitOps.hasUncommittedChanges();

    if (hasChanges) {
      if (input.stash) {
        // Stash changes
        const currentBranch = await this.gitOps.getCurrentBranch();
        await this.stashManager.stashChanges('swap', currentBranch);
      } else if (!input.auto) {
        throw new Error('Uncommitted changes detected. Use stash: true to stash changes, or auto: true to proceed automatically.');
      }
    }

    return { targetSession };
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
          'Use hansolo_status to check current state',
        ],
      },
    };
  }
}
