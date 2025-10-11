import { GitOperations } from '../git-operations';
import { SessionRepository } from '../session-repository';
import { WorkflowSession } from '../../models/workflow-session';

export interface BranchValidationResult {
  available: boolean;
  reason?: string;
  suggestions?: string[];
  previousSession?: WorkflowSession;
  reuseDetected?: {
    type: 'merged-and-deleted' | 'merged-and-recreated' | 'continued-work';
    previousPR?: number;
    deletedAt?: string;
    recreatedAt?: string;
  };
}

export class BranchValidator {
  private gitOps: GitOperations;
  private sessionRepo: SessionRepository;

  constructor(basePath: string = '.devsolo') {
    this.gitOps = new GitOperations();
    this.sessionRepo = new SessionRepository(basePath);
  }

  /**
   * Check if a branch name is available for use
   */
  async checkBranchNameAvailability(branchName: string): Promise<BranchValidationResult> {
    // Check for local branch
    const localExists = await this.gitOps.branchExists(branchName);
    if (localExists) {
      return {
        available: false,
        reason: 'Local branch already exists',
      };
    }

    // Check for remote branch
    const remoteExists = await this.gitOps.remoteBranchExists(branchName);
    if (remoteExists) {
      return {
        available: false,
        reason: 'Remote branch already exists',
      };
    }

    // Check session history for previous use
    const allSessions = await this.sessionRepo.listSessions({ all: true });
    const previousSession = allSessions.find(s => s.branchName === branchName);

    if (previousSession) {
      // Check if previous session was completed and merged
      if (
        previousSession.currentState === 'COMPLETE' &&
        previousSession.metadata?.pr?.merged
      ) {
        return {
          available: false,
          reason: 'Branch name was previously used for a merged PR',
          suggestions: this.generateBranchSuggestions(branchName),
          previousSession,
        };
      }

      // Check if previous session was aborted
      if (previousSession.currentState === 'ABORTED') {
        // This is okay - branch was never merged
        return { available: true };
      }

      // Check if session is still active
      if (previousSession.isActive()) {
        return {
          available: false,
          reason: 'Session already exists for this branch',
          suggestions: ['Use /devsolo:swap to resume this session'],
          previousSession,
        };
      }
    }

    return { available: true };
  }

  /**
   * Detect if a branch has been reused after merge/deletion
   */
  async detectBranchReuse(
    session: WorkflowSession,
    branchName: string
  ): Promise<BranchValidationResult> {
    // Check if remote branch exists
    const remoteExists = await this.gitOps.remoteBranchExists(branchName);

    if (!remoteExists) {
      return { available: true };
    }

    // Check session history for branch deletion
    const allSessions = await this.sessionRepo.listSessions({ all: true });
    const previousSessions = allSessions.filter(
      s => s.branchName === branchName && s.id !== session.id
    );

    for (const prevSession of previousSessions) {
      // Check if this session completed with merge and branch was deleted
      if (
        prevSession.metadata?.pr?.merged &&
        prevSession.metadata?.branch?.remoteDeleted
      ) {
        // Remote branch exists now but was deleted after merge = RECREATED
        return {
          available: false,
          reason: 'Branch was deleted after merge and has been recreated',
          previousSession: prevSession,
          reuseDetected: {
            type: 'merged-and-recreated',
            previousPR: prevSession.metadata.pr.number,
            deletedAt: prevSession.metadata.branch.deletedAt,
            recreatedAt: new Date().toISOString(),
          },
        };
      }

      // Check if PR was merged but branch still exists (additional commits)
      if (
        prevSession.metadata?.pr?.merged &&
        !prevSession.metadata?.branch?.remoteDeleted
      ) {
        // This is okay - continuing work after merge
        return {
          available: true,
          reason: 'Adding commits after previous PR merge - will create new PR',
          previousSession: prevSession,
          reuseDetected: {
            type: 'continued-work',
            previousPR: prevSession.metadata.pr.number,
          },
        };
      }
    }

    return { available: true };
  }

  /**
   * Generate alternative branch name suggestions
   */
  private generateBranchSuggestions(baseName: string): string[] {
    const date = new Date().toISOString().split('T')[0];
    return [
      `${baseName}-v2`,
      `${baseName}-${date}`,
      `${baseName}-continued`,
      `${baseName}-improvements`,
    ];
  }

  /**
   * Track branch deletion in session metadata
   */
  async trackBranchDeletion(session: WorkflowSession): Promise<void> {
    if (!session.metadata) {
      session.metadata = {} as any;
    }

    session.metadata.branch = {
      remoteDeleted: true,
      deletedAt: new Date().toISOString(),
      recreated: false,
    };

    await this.sessionRepo.updateSession(session.id, session);
  }
}
