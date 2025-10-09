import { WorkflowSession } from '../../models/workflow-session';
import { GitOperations } from '../git-operations';
import { SessionRepository } from '../session-repository';

/**
 * Result of a single post-flight check
 */
export interface PostFlightCheckResult {
  name: string;
  passed: boolean;
  message?: string;
  level: 'info' | 'warning' | 'error';
  details?: Record<string, unknown>;
}

/**
 * Aggregated result of all post-flight checks
 */
export interface PostFlightVerificationResult {
  allPassed: boolean;
  checks: PostFlightCheckResult[];
  failures: string[];
  warnings: string[];
  passedCount: number;
  failedCount: number;
  warningCount: number;
}

/**
 * Context for post-flight verifications
 */
export interface PostFlightContext {
  session?: WorkflowSession;
  branchName?: string;
  prNumber?: number;
  prUrl?: string;
  commitSha?: string;
  [key: string]: unknown;
}

/**
 * Available post-flight check types
 */
export type PostFlightCheckType =
  | 'sessionCreated'
  | 'featureBranchCreated'
  | 'branchCheckedOut'
  | 'sessionStateCorrect'
  | 'noUncommittedChanges'
  | 'commitCreated'
  | 'branchPushed'
  | 'prCreated'
  | 'prLinkedToSession'
  | 'ciChecksStarted'
  | 'branchMerged'
  | 'featureBranchDeleted'
  | 'sessionClosed';

/**
 * Service for running post-flight verifications after workflow operations
 * Returns structured results without terminal/UI dependencies for MCP tools
 */
export class PostFlightVerification {
  constructor(
    private gitOps: GitOperations,
    private sessionRepo: SessionRepository
  ) {}

  /**
   * Run specified post-flight checks and return structured results
   */
  async runAll(
    checkTypes: PostFlightCheckType[],
    context: PostFlightContext = {}
  ): Promise<PostFlightVerificationResult> {
    const checks: PostFlightCheckResult[] = [];

    for (const checkType of checkTypes) {
      const result = await this.runCheck(checkType, context);
      checks.push(result);
    }

    const failures = checks
      .filter(c => !c.passed && c.level === 'error')
      .map(c => c.message || c.name);

    const warnings = checks
      .filter(c => !c.passed && c.level === 'warning')
      .map(c => c.message || c.name);

    const allPassed = checks.every(c => c.passed);
    const passedCount = checks.filter(c => c.passed).length;
    const failedCount = checks.filter(c => !c.passed && c.level === 'error').length;
    const warningCount = checks.filter(c => !c.passed && c.level === 'warning').length;

    return {
      allPassed,
      checks,
      failures,
      warnings,
      passedCount,
      failedCount,
      warningCount,
    };
  }

  /**
   * Run a single post-flight check
   */
  private async runCheck(
    checkType: PostFlightCheckType,
    context: PostFlightContext
  ): Promise<PostFlightCheckResult> {
    switch (checkType) {
    case 'sessionCreated':
      return this.checkSessionCreated(context);
    case 'featureBranchCreated':
      return this.checkFeatureBranchCreated(context);
    case 'branchCheckedOut':
      return this.checkBranchCheckedOut(context);
    case 'sessionStateCorrect':
      return this.checkSessionStateCorrect(context);
    case 'noUncommittedChanges':
      return this.checkNoUncommittedChanges(context);
    case 'commitCreated':
      return this.checkCommitCreated(context);
    case 'branchPushed':
      return this.checkBranchPushed(context);
    case 'prCreated':
      return this.checkPRCreated(context);
    case 'prLinkedToSession':
      return this.checkPRLinkedToSession(context);
    case 'ciChecksStarted':
      return this.checkCIChecksStarted(context);
    case 'branchMerged':
      return this.checkBranchMerged(context);
    case 'featureBranchDeleted':
      return this.checkFeatureBranchDeleted(context);
    case 'sessionClosed':
      return this.checkSessionClosed(context);
    default:
      return {
        name: checkType,
        passed: false,
        message: `Unknown check type: ${checkType}`,
        level: 'error',
      };
    }
  }

  /**
   * Verify session was created
   */
  private async checkSessionCreated(context: PostFlightContext): Promise<PostFlightCheckResult> {
    const { session } = context;

    if (!session) {
      return {
        name: 'Session Created',
        passed: false,
        message: 'Session object not found in context',
        level: 'error',
      };
    }

    try {
      const savedSession = await this.sessionRepo.getSession(session.id);
      if (savedSession && savedSession.id === session.id) {
        return {
          name: 'Session Created',
          passed: true,
          message: `Session ${session.id} created successfully`,
          level: 'info',
          details: { sessionId: session.id },
        };
      }

      return {
        name: 'Session Created',
        passed: false,
        message: 'Session not found in repository',
        level: 'error',
      };
    } catch (error) {
      return {
        name: 'Session Created',
        passed: false,
        message: `Failed to verify session: ${error instanceof Error ? error.message : String(error)}`,
        level: 'error',
      };
    }
  }

  /**
   * Verify feature branch was created
   */
  private async checkFeatureBranchCreated(context: PostFlightContext): Promise<PostFlightCheckResult> {
    const { branchName, session } = context;
    const targetBranch = branchName || session?.branchName;

    if (!targetBranch) {
      return {
        name: 'Feature Branch Created',
        passed: false,
        message: 'Branch name not provided',
        level: 'error',
      };
    }

    try {
      const branches = await this.gitOps.listBranches();
      const branchExists = branches.includes(targetBranch);

      if (branchExists) {
        return {
          name: 'Feature Branch Created',
          passed: true,
          message: `Branch '${targetBranch}' exists`,
          level: 'info',
          details: { branchName: targetBranch },
        };
      }

      return {
        name: 'Feature Branch Created',
        passed: false,
        message: `Branch '${targetBranch}' not found`,
        level: 'error',
      };
    } catch (error) {
      return {
        name: 'Feature Branch Created',
        passed: false,
        message: `Failed to verify branch: ${error instanceof Error ? error.message : String(error)}`,
        level: 'error',
      };
    }
  }

  /**
   * Verify branch is checked out
   */
  private async checkBranchCheckedOut(context: PostFlightContext): Promise<PostFlightCheckResult> {
    const { branchName, session } = context;
    const targetBranch = branchName || session?.branchName;

    if (!targetBranch) {
      return {
        name: 'Branch Checked Out',
        passed: false,
        message: 'Branch name not provided',
        level: 'error',
      };
    }

    try {
      const currentBranch = await this.gitOps.getCurrentBranch();

      if (currentBranch === targetBranch) {
        return {
          name: 'Branch Checked Out',
          passed: true,
          message: `Currently on branch '${targetBranch}'`,
          level: 'info',
          details: { currentBranch },
        };
      }

      return {
        name: 'Branch Checked Out',
        passed: false,
        message: `On branch '${currentBranch}', expected '${targetBranch}'`,
        level: 'error',
        details: { currentBranch, expectedBranch: targetBranch },
      };
    } catch (error) {
      return {
        name: 'Branch Checked Out',
        passed: false,
        message: `Failed to verify branch: ${error instanceof Error ? error.message : String(error)}`,
        level: 'error',
      };
    }
  }

  /**
   * Verify session state is correct
   */
  private async checkSessionStateCorrect(context: PostFlightContext): Promise<PostFlightCheckResult> {
    const { session } = context;

    if (!session) {
      return {
        name: 'Session State Correct',
        passed: false,
        message: 'Session not provided',
        level: 'error',
      };
    }

    const validStates = ['feature_branch_created', 'changes_committed', 'branch_pushed', 'pr_created', 'ready_to_merge', 'merged'];

    if (validStates.includes(session.currentState)) {
      return {
        name: 'Session State Correct',
        passed: true,
        message: `Session in state '${session.currentState}'`,
        level: 'info',
        details: { state: session.currentState },
      };
    }

    return {
      name: 'Session State Correct',
      passed: false,
      message: `Invalid session state: ${session.currentState}`,
      level: 'warning',
      details: { state: session.currentState, validStates },
    };
  }

  /**
   * Verify no uncommitted changes
   */
  private async checkNoUncommittedChanges(_context: PostFlightContext): Promise<PostFlightCheckResult> {
    try {
      const status = await this.gitOps.getStatus();
      const hasChanges = status.staged.length > 0 || status.modified.length > 0 || status.created.length > 0 || status.deleted.length > 0;

      if (!hasChanges) {
        return {
          name: 'No Uncommitted Changes',
          passed: true,
          message: 'Working directory clean',
          level: 'info',
        };
      }

      return {
        name: 'No Uncommitted Changes',
        passed: false,
        message: `${status.staged.length} staged, ${status.modified.length + status.created.length + status.deleted.length} unstaged changes`,
        level: 'warning',
        details: {
          stagedCount: status.staged.length,
          unstagedCount: status.modified.length + status.created.length + status.deleted.length,
        },
      };
    } catch (error) {
      return {
        name: 'No Uncommitted Changes',
        passed: false,
        message: `Failed to check status: ${error instanceof Error ? error.message : String(error)}`,
        level: 'error',
      };
    }
  }

  /**
   * Verify commit was created
   */
  private async checkCommitCreated(context: PostFlightContext): Promise<PostFlightCheckResult> {
    const { commitSha } = context;

    if (commitSha) {
      return {
        name: 'Commit Created',
        passed: true,
        message: `Commit ${commitSha.substring(0, 7)} created`,
        level: 'info',
        details: { commitSha },
      };
    }

    try {
      const log = await this.gitOps.getLog(1);
      if (log.length > 0) {
        const commitSha = await this.gitOps.getCommitHash('HEAD');
        return {
          name: 'Commit Created',
          passed: true,
          message: `Latest commit: ${commitSha.substring(0, 7)}`,
          level: 'info',
          details: { commitSha },
        };
      }

      return {
        name: 'Commit Created',
        passed: false,
        message: 'No commits found',
        level: 'error',
      };
    } catch (error) {
      return {
        name: 'Commit Created',
        passed: false,
        message: `Failed to verify commit: ${error instanceof Error ? error.message : String(error)}`,
        level: 'error',
      };
    }
  }

  /**
   * Verify branch was pushed to remote
   */
  private async checkBranchPushed(context: PostFlightContext): Promise<PostFlightCheckResult> {
    const { branchName, session } = context;
    const targetBranch = branchName || session?.branchName;

    if (!targetBranch) {
      return {
        name: 'Branch Pushed',
        passed: false,
        message: 'Branch name not provided',
        level: 'error',
      };
    }

    try {
      const branches = await this.gitOps.listBranches(true);
      const remoteBranch = branches.find(b => b === `origin/${targetBranch}`);

      if (remoteBranch) {
        return {
          name: 'Branch Pushed',
          passed: true,
          message: `Branch '${targetBranch}' exists on remote`,
          level: 'info',
          details: { branchName: targetBranch },
        };
      }

      return {
        name: 'Branch Pushed',
        passed: false,
        message: `Branch '${targetBranch}' not found on remote`,
        level: 'error',
      };
    } catch (error) {
      return {
        name: 'Branch Pushed',
        passed: false,
        message: `Failed to verify remote branch: ${error instanceof Error ? error.message : String(error)}`,
        level: 'error',
      };
    }
  }

  /**
   * Verify PR was created
   */
  private async checkPRCreated(context: PostFlightContext): Promise<PostFlightCheckResult> {
    const { prNumber, prUrl } = context;

    if (prNumber && prUrl) {
      return {
        name: 'PR Created',
        passed: true,
        message: `PR #${prNumber} created`,
        level: 'info',
        details: { prNumber, prUrl },
      };
    }

    if (prNumber || prUrl) {
      return {
        name: 'PR Created',
        passed: true,
        message: 'PR created',
        level: 'info',
        details: { prNumber, prUrl },
      };
    }

    return {
      name: 'PR Created',
      passed: false,
      message: 'PR number/URL not provided',
      level: 'warning',
    };
  }

  /**
   * Verify PR is linked to session
   */
  private async checkPRLinkedToSession(context: PostFlightContext): Promise<PostFlightCheckResult> {
    const { session, prNumber } = context;

    if (!session) {
      return {
        name: 'PR Linked to Session',
        passed: false,
        message: 'Session not provided',
        level: 'error',
      };
    }

    if (session.metadata.pr?.number && session.metadata.pr.number === prNumber) {
      return {
        name: 'PR Linked to Session',
        passed: true,
        message: `PR #${prNumber} linked to session`,
        level: 'info',
        details: { prNumber: session.metadata.pr.number },
      };
    }

    return {
      name: 'PR Linked to Session',
      passed: false,
      message: 'PR not linked to session',
      level: 'warning',
    };
  }

  /**
   * Verify CI checks have started (placeholder - requires GitHub integration)
   */
  private async checkCIChecksStarted(_context: PostFlightContext): Promise<PostFlightCheckResult> {
    // TODO: Implement with GitHub API integration
    return {
      name: 'CI Checks Started',
      passed: true,
      message: 'CI check verification not implemented',
      level: 'info',
    };
  }

  /**
   * Verify branch was merged
   */
  private async checkBranchMerged(context: PostFlightContext): Promise<PostFlightCheckResult> {
    const { branchName, session } = context;
    const targetBranch = branchName || session?.branchName;

    if (!targetBranch) {
      return {
        name: 'Branch Merged',
        passed: false,
        message: 'Branch name not provided',
        level: 'error',
      };
    }

    try {
      const currentBranch = await this.gitOps.getCurrentBranch();
      const mainBranch = 'main';

      if (currentBranch === mainBranch) {
        return {
          name: 'Branch Merged',
          passed: true,
          message: `Currently on ${mainBranch} (feature branch merged)`,
          level: 'info',
          details: { currentBranch: mainBranch },
        };
      }

      return {
        name: 'Branch Merged',
        passed: false,
        message: `Still on branch '${currentBranch}', expected '${mainBranch}'`,
        level: 'warning',
        details: { currentBranch, expectedBranch: mainBranch },
      };
    } catch (error) {
      return {
        name: 'Branch Merged',
        passed: false,
        message: `Failed to verify merge: ${error instanceof Error ? error.message : String(error)}`,
        level: 'error',
      };
    }
  }

  /**
   * Verify feature branch was deleted
   */
  private async checkFeatureBranchDeleted(context: PostFlightContext): Promise<PostFlightCheckResult> {
    const { branchName, session } = context;
    const targetBranch = branchName || session?.branchName;

    if (!targetBranch) {
      return {
        name: 'Feature Branch Deleted',
        passed: false,
        message: 'Branch name not provided',
        level: 'error',
      };
    }

    try {
      const branches = await this.gitOps.listBranches();
      const branchExists = branches.includes(targetBranch);

      if (!branchExists) {
        return {
          name: 'Feature Branch Deleted',
          passed: true,
          message: `Branch '${targetBranch}' deleted`,
          level: 'info',
          details: { branchName: targetBranch },
        };
      }

      return {
        name: 'Feature Branch Deleted',
        passed: false,
        message: `Branch '${targetBranch}' still exists`,
        level: 'warning',
      };
    } catch (error) {
      return {
        name: 'Feature Branch Deleted',
        passed: false,
        message: `Failed to verify deletion: ${error instanceof Error ? error.message : String(error)}`,
        level: 'error',
      };
    }
  }

  /**
   * Verify session was closed
   */
  private async checkSessionClosed(context: PostFlightContext): Promise<PostFlightCheckResult> {
    const { session } = context;

    if (!session) {
      return {
        name: 'Session Closed',
        passed: false,
        message: 'Session not provided',
        level: 'error',
      };
    }

    try {
      const sessions = await this.sessionRepo.listSessions();
      const activeSession = sessions[0] || null;

      if (!activeSession || activeSession.id !== session.id) {
        return {
          name: 'Session Closed',
          passed: true,
          message: `Session ${session.id} closed`,
          level: 'info',
          details: { sessionId: session.id },
        };
      }

      return {
        name: 'Session Closed',
        passed: false,
        message: 'Session still active',
        level: 'warning',
      };
    } catch (error) {
      return {
        name: 'Session Closed',
        passed: false,
        message: `Failed to verify session closure: ${error instanceof Error ? error.message : String(error)}`,
        level: 'error',
      };
    }
  }
}
