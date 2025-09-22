// Tool interface is now just a type structure, not an interface to implement
import { SessionRepository } from '../../services/session-repository';
import { GitOperations } from '../../services/git-operations';
import { WorkflowSession } from '../../models/workflow-session';

export interface AbortWorkflowInput {
  sessionId?: string;
  stashChanges?: boolean;
  force?: boolean;
}

export interface AbortWorkflowOutput {
  success: boolean;
  message?: string;
  error?: string;
  stashRef?: string;
}

export class AbortWorkflowTool {
  name = 'abort-workflow';
  description = 'Abort an active han-solo workflow';
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      sessionId: {
        type: 'string',
        description: 'Session ID to abort (uses current if not provided)',
      },
      stashChanges: {
        type: 'boolean',
        description: 'Stash uncommitted changes before aborting',
      },
      force: {
        type: 'boolean',
        description: 'Force abort even with uncommitted changes',
      },
    },
  };

  private sessionRepo: SessionRepository;
  private gitOps: GitOperations;

  constructor() {
    this.sessionRepo = new SessionRepository('.hansolo');
    this.gitOps = new GitOperations();
  }

  async execute(input: AbortWorkflowInput): Promise<AbortWorkflowOutput> {
    try {
      // Get session to abort
      let session;
      if (input.sessionId) {
        session = await this.sessionRepo.getSession(input.sessionId);
      } else {
        // Get current session based on current branch
        const currentBranch = await this.gitOps.getCurrentBranch();
        const sessions = await this.sessionRepo.getAllSessions();
        session = sessions.find((s: WorkflowSession) => s.branchName === currentBranch);
      }

      if (!session) {
        return {
          success: false,
          error: 'No active workflow session found',
        };
      }

      // Check for uncommitted changes
      const hasChanges = await this.gitOps.hasUncommittedChanges();
      let stashRef;

      if (hasChanges) {
        if (input.stashChanges) {
          const stashResult = await this.gitOps.stashChanges(
            `han-solo abort: ${session.id}`
          );
          stashRef = stashResult.stashRef;
        } else if (!input.force) {
          return {
            success: false,
            error: 'Uncommitted changes detected. Use stashChanges or force option',
          };
        }
      }

      // Switch back to main branch
      await this.gitOps.checkoutBranch('main');

      // Delete the feature branch if it exists
      try {
        await this.gitOps.deleteBranch(session.branchName, true);
      } catch {
        // Branch might not exist locally
      }

      // Mark session as aborted
      session.currentState = 'ABORTED';
      await this.sessionRepo.updateSession(session.id, session);

      return {
        success: true,
        message: `Workflow ${session.id} aborted successfully`,
        stashRef,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}