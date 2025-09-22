// Tool interface is now just a type structure, not an interface to implement
import { SessionRepository } from '../../services/session-repository';
import { GitOperations } from '../../services/git-operations';
import { WorkflowSession } from '../../models/workflow-session';

export interface GetSessionsStatusInput {
  includeCompleted?: boolean;
  includeAborted?: boolean;
}

export interface SessionStatus {
  id: string;
  branchName: string;
  workflowType: string;
  currentState: string;
  isActive: boolean;
  isCurrent: boolean;
  createdAt: string;
  branchStatus?: {
    ahead: number;
    behind: number;
    hasRemote: boolean;
    isClean: boolean;
  };
}

export interface GetSessionsStatusOutput {
  success: boolean;
  sessions: SessionStatus[];
  currentSessionId?: string;
  error?: string;
}

export class GetSessionsStatusTool {
  name = 'get-sessions-status';
  description = 'Get status of all workflow sessions';
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      includeCompleted: {
        type: 'boolean',
        description: 'Include completed sessions',
        default: false
      },
      includeAborted: {
        type: 'boolean',
        description: 'Include aborted sessions',
        default: false
      }
    }
  };

  private sessionRepo: SessionRepository;
  private gitOps: GitOperations;

  constructor() {
    this.sessionRepo = new SessionRepository('.hansolo');
    this.gitOps = new GitOperations();
  }

  async execute(input: GetSessionsStatusInput): Promise<GetSessionsStatusOutput> {
    try {
      // Get all sessions
      const allSessions = await this.sessionRepo.getAllSessions();
      const currentBranch = await this.gitOps.getCurrentBranch();
      
      // Filter sessions based on input
      const filteredSessions = allSessions.filter((session: WorkflowSession) => {
        if (session.currentState === 'COMPLETE' && !input.includeCompleted) {
          return false;
        }
        if (session.currentState === 'ABORTED' && !input.includeAborted) {
          return false;
        }
        return true;
      });

      // Get status for each session
      const sessionStatuses: SessionStatus[] = [];
      let currentSessionId: string | undefined;

      for (const session of filteredSessions) {
        const isCurrent = session.branchName === currentBranch;
        if (isCurrent) {
          currentSessionId = session.id;
        }

        let branchStatus;
        try {
          // Get branch status if branch exists
          branchStatus = await this.gitOps.getBranchStatus(session.branchName);
        } catch {
          // Branch might not exist
        }

        sessionStatuses.push({
          id: session.id,
          branchName: session.branchName,
          workflowType: session.workflowType,
          currentState: session.currentState,
          isActive: this.isActiveState(session.currentState),
          isCurrent,
          createdAt: session.createdAt,
          branchStatus
        });
      }

      return {
        success: true,
        sessions: sessionStatuses,
        currentSessionId
      };
    } catch (error) {
      return {
        success: false,
        sessions: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private isActiveState(state: string): boolean {
    const terminalStates = ['COMPLETE', 'ABORTED', 'MERGED'];
    return !terminalStates.includes(state);
  }
}