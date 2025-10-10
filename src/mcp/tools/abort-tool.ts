import {
  BaseMCPTool,
  WorkflowToolInput,
  WorkflowContext,
  WorkflowExecutionResult,
} from './workflow-tool-base';
import { SessionToolResult } from './base-tool';
import { SessionRepository } from '../../services/session-repository';
import { GitOperations } from '../../services/git-operations';
import { ConfigurationManager } from '../../services/configuration-manager';
import { WorkflowSession } from '../../models/workflow-session';

/**
 * Input for abort tool
 */
export interface AbortToolInput extends WorkflowToolInput {
  branchName?: string;
  deleteBranch?: boolean;
}

/**
 * Abort tool - Aborts a workflow session
 */
export class AbortTool extends BaseMCPTool<AbortToolInput, SessionToolResult> {
  constructor(
    private sessionRepo: SessionRepository,
    private gitOps: GitOperations,
    configManager: ConfigurationManager
  ) {
    super(configManager);
  }

  protected getBanner(): string {
    return `░█▀█░█▀▄░█▀█░█▀▄░▀█▀░▀█▀░█▀█░█▀▀░
░█▀█░█▀▄░█░█░█▀▄░░█░░░█░░█░█░█░█░
░▀░▀░▀▀░░▀▀▀░▀░▀░░▀░░▀▀▀░▀░▀░▀▀▀░`;
  }

  protected async createContext(input: AbortToolInput): Promise<Record<string, unknown>> {
    // Get session to abort
    const targetBranch = input.branchName || (await this.gitOps.getCurrentBranch());
    const session = await this.sessionRepo.getSessionByBranch(targetBranch);

    if (!session) {
      throw new Error(`No session found for branch '${targetBranch}'`);
    }

    // Check if already aborted/complete (only if not in auto mode)
    if (!session.isActive() && !input.auto) {
      throw new Error(`Session already in terminal state: ${session.currentState}`);
    }

    return { session, targetBranch };
  }

  protected async executeWorkflow(
    context: WorkflowContext
  ): Promise<WorkflowExecutionResult> {
    const input = context.input as AbortToolInput;
    const session = context['session'] as WorkflowSession;
    const targetBranch = context['targetBranch'] as string;

    // Transition session to aborted
    session.transitionTo('ABORTED', 'user_action');
    await this.sessionRepo.updateSession(session.id, session);

    // Clean up aborted session to prevent accumulation
    try {
      await this.sessionRepo.deleteSession(session.id);
    } catch (error) {
      // Non-fatal - session marked aborted even if cleanup fails
      console.error('Failed to cleanup session:', error);
    }

    const warnings: string[] = [];

    // Delete branch if requested
    if (input.deleteBranch) {
      try {
        const currentBranch = await this.gitOps.getCurrentBranch();

        // Switch to main if currently on the target branch
        if (currentBranch === targetBranch) {
          const mainBranch = 'main';
          await this.gitOps.checkoutBranch(mainBranch);
        }

        // Delete local branch
        await this.gitOps.deleteBranch(targetBranch, true);

        // Delete remote branch if exists
        try {
          await this.gitOps.deleteRemoteBranch(targetBranch);
        } catch {
          // Remote branch might not exist
        }
      } catch (error) {
        warnings.push(`Branch deletion failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return {
      success: true,
      data: {
        sessionId: session.id,
        branchName: session.branchName,
        state: session.currentState,
        nextSteps: [
          'Session has been aborted',
          input.deleteBranch ? 'Branch has been deleted' : 'Branch still exists (use --delete-branch to remove it)',
          'Use hansolo_launch to start a new workflow',
        ],
      },
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }
}
