import { MCPTool, SessionToolResult, createErrorResult } from './base-tool';
import { SessionRepository } from '../../services/session-repository';
import { GitOperations } from '../../services/git-operations';
import { StashManager } from '../../services/stash-manager';
import { ConfigurationManager } from '../../services/configuration-manager';

/**
 * Input for swap tool
 */
export interface SwapToolInput {
  branchName: string;
  stash?: boolean;
  force?: boolean;
}

/**
 * Swap tool - Switches between workflow sessions
 */
export class SwapTool implements MCPTool<SwapToolInput, SessionToolResult> {
  constructor(
    private sessionRepo: SessionRepository,
    private gitOps: GitOperations,
    private stashManager: StashManager,
    private configManager: ConfigurationManager
  ) {}

  async execute(input: SwapToolInput): Promise<SessionToolResult> {
    try {
      // Check initialization
      if (!(await this.configManager.isInitialized())) {
        return {
          success: false,
          errors: ['han-solo is not initialized. Run hansolo_init first.'],
        };
      }

      // Get target session
      const targetSession = await this.sessionRepo.getSessionByBranch(input.branchName);

      if (!targetSession) {
        return {
          success: false,
          errors: [`No session found for branch '${input.branchName}'`],
        };
      }

      // Check for uncommitted changes
      const hasChanges = await this.gitOps.hasUncommittedChanges();

      if (hasChanges) {
        if (input.stash) {
          // Stash changes
          const currentBranch = await this.gitOps.getCurrentBranch();
          await this.stashManager.stashChanges('swap', currentBranch);
        } else if (!input.force) {
          return {
            success: false,
            errors: ['Uncommitted changes detected'],
            warnings: ['Use stash: true to stash changes, or force: true to discard them'],
          };
        }
      }

      // Switch to target branch
      await this.gitOps.checkoutBranch(input.branchName);

      return {
        success: true,
        sessionId: targetSession.id,
        branchName: targetSession.branchName,
        state: targetSession.currentState,
        nextSteps: [
          `Switched to ${input.branchName}`,
          'Continue working on this feature',
          'Use hansolo_status to check current state',
        ],
      };
    } catch (error) {
      return createErrorResult(error, 'SwapTool');
    }
  }
}
