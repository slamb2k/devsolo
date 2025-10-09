import { MCPTool, QueryToolResult, createErrorResult } from './base-tool';
import { SessionRepository } from '../../services/session-repository';
import { GitOperations } from '../../services/git-operations';
import { ConfigurationManager } from '../../services/configuration-manager';

/**
 * Input for cleanup tool
 */
export interface CleanupToolInput {
  deleteBranches?: boolean;
  force?: boolean;
}

/**
 * Cleanup tool - Cleans up expired sessions and stale branches
 */
export class CleanupTool implements MCPTool<CleanupToolInput, QueryToolResult> {
  constructor(
    private sessionRepo: SessionRepository,
    private gitOps: GitOperations,
    private configManager: ConfigurationManager
  ) {}

  async execute(input: CleanupToolInput): Promise<QueryToolResult> {
    try {
      // Check initialization
      if (!(await this.configManager.isInitialized())) {
        return {
          success: false,
          data: {},
          errors: ['han-solo is not initialized. Run hansolo_init first.'],
        };
      }

      // Cleanup expired sessions
      const expiredSessionCount = await this.sessionRepo.cleanupExpiredSessions();

      const result: Record<string, unknown> = {
        sessionsRemoved: expiredSessionCount,
        sessions: [],
      };

      // Delete stale branches if requested
      if (input.deleteBranches) {
        const branches = await this.gitOps.listBranches();
        const staleBranches: string[] = [];

        for (const branch of branches) {
          // Skip main/master branches
          if (branch === 'main' || branch === 'master') {
            continue;
          }

          // Check if branch has a session
          const session = await this.sessionRepo.getSessionByBranch(branch);

          // Delete if no session or session is complete/aborted
          if (!session || !session.isActive()) {
            try {
              await this.gitOps.deleteBranch(branch, input.force);
              staleBranches.push(branch);
            } catch {
              // Branch might be in use or have unmerged changes
            }
          }
        }

        result['branchesRemoved'] = staleBranches.length;
        result['branches'] = staleBranches;
      }

      return {
        success: true,
        data: result,
        message: `Cleaned up ${expiredSessionCount} session(s)${
          input.deleteBranches ? ` and ${result['branchesRemoved']} branch(es)` : ''
        }`,
      };
    } catch (error) {
      return {
        ...createErrorResult(error, 'CleanupTool'),
        data: {},
      };
    }
  }
}
