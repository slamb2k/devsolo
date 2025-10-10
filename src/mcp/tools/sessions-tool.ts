import {
  BaseMCPTool,
  WorkflowToolInput,
  WorkflowContext,
  WorkflowExecutionResult,
} from './workflow-tool-base';
import { QueryToolResult } from './base-tool';
import { SessionRepository } from '../../services/session-repository';
import { ConfigurationManager } from '../../services/configuration-manager';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

/**
 * Input for sessions tool
 */
export interface SessionsToolInput extends WorkflowToolInput {
  all?: boolean;
  cleanup?: boolean;
  verbose?: boolean;
}

/**
 * Sessions tool - Lists workflow sessions
 */
export class SessionsTool extends BaseMCPTool<SessionsToolInput, QueryToolResult> {
  constructor(
    private sessionRepo: SessionRepository,
    configManager: ConfigurationManager,
    server?: Server
  ) {
    super(configManager, server);
  }

  protected getBanner(): string {
    return `░█▀▀░█▀▀░█▀▀░█▀▀░▀█▀░█▀█░█▀█░█▀▀░
░▀▀█░█▀▀░▀▀█░▀▀█░░█░░█░█░█░█░▀▀█░
░▀▀▀░▀▀▀░▀▀▀░▀▀▀░▀▀▀░▀▀▀░▀░▀░▀▀▀░`;
  }

  protected async executeWorkflow(
    context: WorkflowContext
  ): Promise<WorkflowExecutionResult> {
    const input = context.input as SessionsToolInput;

    // Cleanup expired sessions if requested
    if (input.cleanup) {
      const cleanedCount = await this.sessionRepo.cleanupExpiredSessions();
      return {
        success: true,
        data: {
          cleanedCount,
          cleanedSessions: [],
          message: `Cleaned up ${cleanedCount} expired session(s)`,
        },
      };
    }

    let sessions;

    if (input.all) {
      sessions = await this.sessionRepo.getAllSessions();
    } else {
      const allSessions = await this.sessionRepo.listSessions();
      const activeSession = allSessions[0] || null;
      sessions = activeSession ? [activeSession] : [];
    }

    const sessionData = sessions.map(s => ({
      id: s.id,
      branchName: s.branchName,
      state: s.currentState,
      workflowType: s.workflowType,
      createdAt: s.createdAt,
      isActive: s.isActive(),
      ...(input.verbose && {
        metadata: s.metadata,
        stateHistory: s.stateHistory,
      }),
    }));

    return {
      success: true,
      data: {
        count: sessions.length,
        sessions: sessionData,
        message: `Found ${sessions.length} session(s)`,
      },
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
