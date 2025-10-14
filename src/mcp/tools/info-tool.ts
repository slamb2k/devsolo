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
 * Input for info tool
 */
export interface InfoToolInput extends WorkflowToolInput {
  // No additional input required
}

/**
 * Info tool - Shows current workflow information
 */
export class InfoTool extends BaseMCPTool<InfoToolInput, QueryToolResult> {
  constructor(
    private sessionRepo: SessionRepository,
    private gitOps: GitOperations,
    configManager: ConfigurationManager,
    server?: Server
  ) {
    super(configManager, server);
  }

  protected getBanner(): string {
    return `░▀█▀░█▀█░█▀▀░█▀█░
░░█░░█░█░█▀▀░█░█░
░▀▀▀░▀░▀░▀░░░▀▀▀░`;
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
