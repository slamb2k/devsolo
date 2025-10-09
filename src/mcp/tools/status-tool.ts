import { MCPTool, QueryToolResult, createErrorResult } from './base-tool';
import { SessionRepository } from '../../services/session-repository';
import { GitOperations } from '../../services/git-operations';
import { ConfigurationManager } from '../../services/configuration-manager';

/**
 * Input for status tool
 */
export interface StatusToolInput {
  // No input required
}

/**
 * Status tool - Shows current workflow status
 */
export class StatusTool implements MCPTool<StatusToolInput, QueryToolResult> {
  constructor(
    private sessionRepo: SessionRepository,
    private gitOps: GitOperations,
    private configManager: ConfigurationManager
  ) {}

  async execute(_input: StatusToolInput): Promise<QueryToolResult> {
    try {
      // Check initialization
      if (!(await this.configManager.isInitialized())) {
        return {
          success: false,
          data: {},
          errors: ['han-solo is not initialized. Run hansolo_init first.'],
        };
      }

      const currentBranch = await this.gitOps.getCurrentBranch();
      const session = await this.sessionRepo.getSessionByBranch(currentBranch);
      const gitStatus = await this.gitOps.getStatus();

      const data: Record<string, unknown> = {
        currentBranch,
        hasSession: !!session,
        gitStatus: {
          staged: gitStatus.staged.length,
          unstaged: gitStatus.modified.length + gitStatus.created.length + gitStatus.deleted.length,
          untracked: gitStatus.not_added?.length || 0,
        },
      };

      if (session) {
        data['session'] = {
          id: session.id,
          branchName: session.branchName,
          state: session.currentState,
          workflowType: session.workflowType,
          createdAt: session.createdAt,
          pr: session.metadata?.pr,
        };
      }

      return {
        success: true,
        data,
        message: session
          ? `Active session on ${currentBranch} (state: ${session.currentState})`
          : `No active session on ${currentBranch}`,
      };
    } catch (error) {
      return {
        ...createErrorResult(error, 'StatusTool'),
        data: {},
      };
    }
  }
}
