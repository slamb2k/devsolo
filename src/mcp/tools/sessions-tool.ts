import { MCPTool, QueryToolResult, createErrorResult } from './base-tool';
import { SessionRepository } from '../../services/session-repository';
import { ConfigurationManager } from '../../services/configuration-manager';

/**
 * Input for sessions tool
 */
export interface SessionsToolInput {
  all?: boolean;
  cleanup?: boolean;
  verbose?: boolean;
}

/**
 * Sessions tool - Lists workflow sessions
 */
export class SessionsTool implements MCPTool<SessionsToolInput, QueryToolResult> {
  constructor(
    private sessionRepo: SessionRepository,
    private configManager: ConfigurationManager
  ) {}

  async execute(input: SessionsToolInput): Promise<QueryToolResult> {
    try {
      // Check initialization
      if (!(await this.configManager.isInitialized())) {
        return {
          success: false,
          data: {},
          errors: ['han-solo is not initialized. Run hansolo_init first.'],
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

      // Cleanup expired sessions if requested
      if (input.cleanup) {
        const cleanedCount = await this.sessionRepo.cleanupExpiredSessions();
        return {
          success: true,
          data: {
            cleanedCount,
            cleanedSessions: [],
          },
          message: `Cleaned up ${cleanedCount} expired session(s)`,
        };
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
        },
        message: `Found ${sessions.length} session(s)`,
      };
    } catch (error) {
      return {
        ...createErrorResult(error, 'SessionsTool'),
        data: {},
      };
    }
  }
}
