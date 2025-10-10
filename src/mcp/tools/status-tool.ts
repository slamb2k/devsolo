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

/**
 * Input for status tool
 */
export interface StatusToolInput extends WorkflowToolInput {
  // No additional input required
}

/**
 * Status tool - Shows current workflow status
 */
export class StatusTool extends BaseMCPTool<StatusToolInput, QueryToolResult> {
  constructor(
    private sessionRepo: SessionRepository,
    private gitOps: GitOperations,
    configManager: ConfigurationManager
  ) {
    super(configManager);
  }

  protected getBanner(): string {
    return `░█▀▀░▀█▀░█▀█░▀█▀░█░█░█▀▀░
░▀▀█░░█░░█▀█░░█░░█░█░▀▀█░
░▀▀▀░░▀░░▀░▀░░▀░░▀▀▀░▀▀▀░`;
  }

  protected async executeWorkflow(
    _context: WorkflowContext
  ): Promise<WorkflowExecutionResult> {
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
      data['message'] = `Active session on ${currentBranch} (state: ${session.currentState})`;
    } else {
      data['message'] = `No active session on ${currentBranch}`;
    }

    return {
      success: true,
      data,
    };
  }

  // Override to return QueryToolResult format
  protected createFinalResult(
    workflowResult: WorkflowExecutionResult
  ): QueryToolResult {
    return {
      success: workflowResult.success,
      data: workflowResult.data || {},
      message: (workflowResult.data?.['message'] as string) || undefined,
      errors: workflowResult.errors,
      warnings: workflowResult.warnings,
    };
  }
}
