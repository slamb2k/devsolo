import {
  BaseMCPTool,
  WorkflowToolInput,
  WorkflowContext,
  WorkflowExecutionResult,
} from './workflow-tool-base';
import { QueryToolResult } from './base-tool';
import { SessionRepository } from '../../services/session-repository';
import { GitOperations } from '../../services/git-operations';
import { ConfigurationManager } from '../../services/configuration-manager';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

/**
 * Input for cleanup tool
 */
export interface CleanupToolInput extends WorkflowToolInput {
  deleteBranches?: boolean;
}

/**
 * Cleanup tool - Cleans up expired sessions and stale branches
 */
export class CleanupTool extends BaseMCPTool<CleanupToolInput, QueryToolResult> {
  constructor(
    private sessionRepo: SessionRepository,
    private gitOps: GitOperations,
    configManager: ConfigurationManager,
    server?: Server
  ) {
    super(configManager, server);
  }

  protected getBanner(): string {
    return `░█▀▀░█░░░█▀▀░█▀█░█▀█░█░█░█▀█░
░█░░░█░░░█▀▀░█▀█░█░█░█░█░█▀▀░
░▀▀▀░▀▀▀░▀▀▀░▀░▀░▀░▀░▀▀▀░▀░░░`;
  }

  protected async executeWorkflow(
    context: WorkflowContext
  ): Promise<WorkflowExecutionResult> {
    const input = context.input as CleanupToolInput;

    // Cleanup expired sessions
    const expiredSessionCount = await this.sessionRepo.cleanupExpiredSessions();

    // Cleanup completed/aborted sessions to prevent accumulation
    const completedSessionCount = await this.sessionRepo.cleanupCompletedSessions();

    const totalCleaned = expiredSessionCount + completedSessionCount;

    const result: Record<string, unknown> = {
      sessionsRemoved: totalCleaned,
      expiredSessions: expiredSessionCount,
      completedSessions: completedSessionCount,
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
            await this.gitOps.deleteBranch(branch, true);
            staleBranches.push(branch);
          } catch {
            // Branch might be in use or have unmerged changes
          }
        }
      }

      result['branchesRemoved'] = staleBranches.length;
      result['branches'] = staleBranches;
    }

    // Prune stale remote-tracking refs
    // This removes references to remote branches that have been deleted on GitHub
    try {
      await this.gitOps.pruneRemoteRefs();
      result['remoteRefsPruned'] = true;
    } catch (error) {
      // Non-fatal - log but don't fail cleanup
      console.warn('Failed to prune remote refs:', error);
      result['remoteRefsPruned'] = false;
    }

    result['message'] = `Cleaned up ${totalCleaned} session(s) (${expiredSessionCount} expired, ${completedSessionCount} completed)${
      input.deleteBranches ? ` and ${result['branchesRemoved']} branch(es)` : ''
    }. Remote refs pruned: ${result['remoteRefsPruned'] ? 'yes' : 'no'}`;

    return {
      success: true,
      data: result,
    };
  }

  // Override to return QueryToolResult format
  protected createFinalResult(
    workflowResult: WorkflowExecutionResult,
    _preFlightResult: any = null,
    _postFlightResult: any = null
  ): QueryToolResult {
    const result: QueryToolResult = {
      success: workflowResult.success,
      data: workflowResult.data || {},
      message: (workflowResult.data?.['message'] as string) || undefined,
      errors: workflowResult.errors || [],
      warnings: workflowResult.warnings || [],
    };

    // Note: Banner display is now handled by slash commands

    return result;
  }
}
