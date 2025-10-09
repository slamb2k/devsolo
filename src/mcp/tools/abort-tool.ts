import { MCPTool, SessionToolResult, createErrorResult } from './base-tool';
import { SessionRepository } from '../../services/session-repository';
import { GitOperations } from '../../services/git-operations';
import { ConfigurationManager } from '../../services/configuration-manager';

/**
 * Input for abort tool
 */
export interface AbortToolInput {
  branchName?: string;
  deleteBranch?: boolean;
  force?: boolean;
  yes?: boolean;
}

/**
 * Abort tool - Aborts a workflow session
 */
export class AbortTool implements MCPTool<AbortToolInput, SessionToolResult> {
  constructor(
    private sessionRepo: SessionRepository,
    private gitOps: GitOperations,
    private configManager: ConfigurationManager
  ) {}

  async execute(input: AbortToolInput): Promise<SessionToolResult> {
    try {
      // Check initialization
      if (!(await this.configManager.isInitialized())) {
        return {
          success: false,
          errors: ['han-solo is not initialized. Run hansolo_init first.'],
        };
      }

      // Get session to abort
      const targetBranch = input.branchName || (await this.gitOps.getCurrentBranch());
      const session = await this.sessionRepo.getSessionByBranch(targetBranch);

      if (!session) {
        return {
          success: false,
          errors: [`No session found for branch '${targetBranch}'`],
        };
      }

      // Check if already aborted/complete
      if (!session.isActive() && !input.force) {
        return {
          success: false,
          warnings: [`Session already in terminal state: ${session.currentState}`],
        };
      }

      // Transition session to aborted
      session.transitionTo('ABORTED', 'user_action');
      await this.sessionRepo.updateSession(session.id, session);

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
          return {
            success: true,
            sessionId: session.id,
            branchName: session.branchName,
            state: session.currentState,
            warnings: [`Session aborted but branch deletion failed: ${error instanceof Error ? error.message : String(error)}`],
          };
        }
      }

      return {
        success: true,
        sessionId: session.id,
        branchName: session.branchName,
        state: session.currentState,
        nextSteps: [
          'Session has been aborted',
          input.deleteBranch ? 'Branch has been deleted' : 'Branch still exists (use --delete-branch to remove it)',
          'Use hansolo_launch to start a new workflow',
        ],
      };
    } catch (error) {
      return createErrorResult(error, 'AbortTool');
    }
  }
}
