import { WorkflowSession } from '../../models/workflow-session';
import { GitOperations } from '../git-operations';
import { SessionRepository } from '../session-repository';

/**
 * Result of a single pre-flight check
 */
export interface PreFlightCheckResult {
  name: string;
  passed: boolean;
  message?: string;
  level: 'info' | 'warning' | 'error';
  suggestions?: string[];
  details?: Record<string, unknown>;
}

/**
 * Aggregated result of all pre-flight checks
 */
export interface PreFlightVerificationResult {
  allPassed: boolean;
  checks: PreFlightCheckResult[];
  failures: string[];
  warnings: string[];
  passedCount: number;
  failedCount: number;
  warningCount: number;
}

/**
 * Context for pre-flight checks
 */
export interface PreFlightContext {
  command?: string;
  session?: WorkflowSession;
  branchName?: string;
  force?: boolean;
  [key: string]: unknown;
}

/**
 * Available pre-flight check types
 */
export type PreFlightCheckType =
  | 'onMainBranch'
  | 'workingDirectoryClean'
  | 'mainUpToDate'
  | 'noExistingSession'
  | 'branchNameAvailable'
  | 'sessionExists'
  | 'onFeatureBranch'
  | 'hasUncommittedChanges'
  | 'hasCommitsToShip'
  | 'remoteBranchExists'
  | 'ciChecksPassed'
  | 'prExists'
  | 'prApproved'
  | 'noMergeConflicts';

/**
 * Service for running pre-flight checks before workflow operations
 * Returns structured results without terminal/UI dependencies for MCP tools
 */
export class PreFlightCheckService {
  constructor(
    private gitOps: GitOperations,
    private sessionRepo: SessionRepository
  ) {}

  /**
   * Run specified pre-flight checks and return structured results
   */
  async runAll(
    checkTypes: PreFlightCheckType[],
    context: PreFlightContext = {}
  ): Promise<PreFlightVerificationResult> {
    const checks: PreFlightCheckResult[] = [];

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
   * Run a single pre-flight check
   */
  private async runCheck(
    checkType: PreFlightCheckType,
    context: PreFlightContext
  ): Promise<PreFlightCheckResult> {
    switch (checkType) {
    case 'onMainBranch':
      return this.checkOnMainBranch(context);
    case 'workingDirectoryClean':
      return this.checkWorkingDirectoryClean(context);
    case 'mainUpToDate':
      return this.checkMainUpToDate(context);
    case 'noExistingSession':
      return this.checkNoExistingSession(context);
    case 'branchNameAvailable':
      return this.checkBranchNameAvailable(context);
    case 'sessionExists':
      return this.checkSessionExists(context);
    case 'onFeatureBranch':
      return this.checkOnFeatureBranch(context);
    case 'hasUncommittedChanges':
      return this.checkHasUncommittedChanges(context);
    case 'hasCommitsToShip':
      return this.checkHasCommitsToShip(context);
    case 'remoteBranchExists':
      return this.checkRemoteBranchExists(context);
    case 'ciChecksPassed':
      return this.checkCIChecksPassed(context);
    case 'prExists':
      return this.checkPRExists(context);
    case 'prApproved':
      return this.checkPRApproved(context);
    case 'noMergeConflicts':
      return this.checkNoMergeConflicts(context);
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
   * Check if on main branch
   */
  private async checkOnMainBranch(_context: PreFlightContext): Promise<PreFlightCheckResult> {
    try {
      const currentBranch = await this.gitOps.getCurrentBranch();
      const mainBranch = 'main';

      if (currentBranch === mainBranch) {
        return {
          name: 'On Main Branch',
          passed: true,
          message: `Currently on ${mainBranch}`,
          level: 'info',
          details: { currentBranch, mainBranch },
        };
      }

      return {
        name: 'On Main Branch',
        passed: false,
        message: `On branch '${currentBranch}', expected '${mainBranch}'`,
        level: 'error',
        suggestions: [`git checkout ${mainBranch}`],
        details: { currentBranch, mainBranch },
      };
    } catch (error) {
      return {
        name: 'On Main Branch',
        passed: false,
        message: `Failed to check branch: ${error instanceof Error ? error.message : String(error)}`,
        level: 'error',
      };
    }
  }

  /**
   * Check if working directory is clean
   */
  private async checkWorkingDirectoryClean(_context: PreFlightContext): Promise<PreFlightCheckResult> {
    try {
      const status = await this.gitOps.getStatus();
      const hasChanges = status.staged.length > 0 || status.modified.length > 0 || status.created.length > 0 || status.deleted.length > 0;

      if (!hasChanges) {
        return {
          name: 'Working Directory Clean',
          passed: true,
          message: 'No uncommitted changes',
          level: 'info',
        };
      }

      return {
        name: 'Working Directory Clean',
        passed: false,
        message: `${status.staged.length} staged, ${status.modified.length + status.created.length + status.deleted.length} unstaged changes`,
        level: 'error',
        suggestions: [
          'Commit or stash your changes',
          'Use force: true to override (will stash changes)',
        ],
        details: {
          stagedCount: status.staged.length,
          unstagedCount: status.modified.length + status.created.length + status.deleted.length,
        },
      };
    } catch (error) {
      return {
        name: 'Working Directory Clean',
        passed: false,
        message: `Failed to check status: ${error instanceof Error ? error.message : String(error)}`,
        level: 'error',
      };
    }
  }

  /**
   * Check if main branch is up to date with remote
   */
  private async checkMainUpToDate(_context: PreFlightContext): Promise<PreFlightCheckResult> {
    try {
      const mainBranch = 'main';
      const currentBranch = await this.gitOps.getCurrentBranch();

      // Only check if we're on main branch
      if (currentBranch !== mainBranch) {
        return {
          name: 'Main Branch Up To Date',
          passed: true,
          message: 'Not on main branch, skipping check',
          level: 'info',
        };
      }

      await this.gitOps.fetch();
      const status = await this.gitOps.getBranchStatus(mainBranch);

      if (status.ahead === 0 && status.behind === 0) {
        return {
          name: 'Main Branch Up To Date',
          passed: true,
          message: `${mainBranch} is up to date with remote`,
          level: 'info',
        };
      }

      if (status.behind > 0) {
        return {
          name: 'Main Branch Up To Date',
          passed: false,
          message: `${mainBranch} is ${status.behind} commit(s) behind remote`,
          level: 'error',
          suggestions: [`git pull origin ${mainBranch}`],
          details: { ahead: status.ahead, behind: status.behind },
        };
      }

      return {
        name: 'Main Branch Up To Date',
        passed: true,
        message: `${mainBranch} is ${status.ahead} commit(s) ahead of remote`,
        level: 'warning',
        details: { ahead: status.ahead, behind: status.behind },
      };
    } catch (error) {
      return {
        name: 'Main Branch Up To Date',
        passed: false,
        message: `Failed to check remote status: ${error instanceof Error ? error.message : String(error)}`,
        level: 'warning', // Downgrade to warning since fetch might fail in offline scenarios
      };
    }
  }

  /**
   * Check if no existing session
   */
  private async checkNoExistingSession(_context: PreFlightContext): Promise<PreFlightCheckResult> {
    try {
      const sessions = await this.sessionRepo.listSessions();
      const session = sessions[0] || null;

      if (!session) {
        return {
          name: 'No Existing Session',
          passed: true,
          message: 'No active session found',
          level: 'info',
        };
      }

      return {
        name: 'No Existing Session',
        passed: false,
        message: `Active session exists: ${session.id} (branch: ${session.branchName})`,
        level: 'error',
        suggestions: [
          'Complete or abort the current session first',
          'Use hansolo_swap to switch sessions',
          'Use force: true to override',
        ],
        details: { sessionId: session.id, branchName: session.branchName },
      };
    } catch (error) {
      return {
        name: 'No Existing Session',
        passed: false,
        message: `Failed to check sessions: ${error instanceof Error ? error.message : String(error)}`,
        level: 'error',
      };
    }
  }

  /**
   * Check if branch name is available
   */
  private async checkBranchNameAvailable(context: PreFlightContext): Promise<PreFlightCheckResult> {
    const { branchName } = context;

    if (!branchName) {
      return {
        name: 'Branch Name Available',
        passed: true,
        message: 'Branch name will be generated',
        level: 'info',
      };
    }

    try {
      const branches = await this.gitOps.listBranches();
      const exists = branches.includes(branchName);

      if (!exists) {
        return {
          name: 'Branch Name Available',
          passed: true,
          message: `Branch name '${branchName}' is available`,
          level: 'info',
          details: { branchName },
        };
      }

      return {
        name: 'Branch Name Available',
        passed: false,
        message: `Branch '${branchName}' already exists`,
        level: 'error',
        suggestions: [
          'Choose a different branch name',
          'Delete the existing branch first',
        ],
        details: { branchName },
      };
    } catch (error) {
      return {
        name: 'Branch Name Available',
        passed: false,
        message: `Failed to check branches: ${error instanceof Error ? error.message : String(error)}`,
        level: 'error',
      };
    }
  }

  /**
   * Check if session exists (for operations that require a session)
   */
  private async checkSessionExists(_context: PreFlightContext): Promise<PreFlightCheckResult> {
    try {
      const sessions = await this.sessionRepo.listSessions();
      const session = sessions[0] || null;

      if (session) {
        return {
          name: 'Session Exists',
          passed: true,
          message: `Active session: ${session.id}`,
          level: 'info',
          details: { sessionId: session.id, branchName: session.branchName },
        };
      }

      return {
        name: 'Session Exists',
        passed: false,
        message: 'No active session found',
        level: 'error',
        suggestions: ['Start a new session with hansolo_launch'],
      };
    } catch (error) {
      return {
        name: 'Session Exists',
        passed: false,
        message: `Failed to check session: ${error instanceof Error ? error.message : String(error)}`,
        level: 'error',
      };
    }
  }

  /**
   * Check if on feature branch (not main)
   */
  private async checkOnFeatureBranch(_context: PreFlightContext): Promise<PreFlightCheckResult> {
    try {
      const currentBranch = await this.gitOps.getCurrentBranch();
      const mainBranch = 'main';

      if (currentBranch !== mainBranch) {
        return {
          name: 'On Feature Branch',
          passed: true,
          message: `On feature branch '${currentBranch}'`,
          level: 'info',
          details: { currentBranch, mainBranch },
        };
      }

      return {
        name: 'On Feature Branch',
        passed: false,
        message: `On main branch '${mainBranch}'`,
        level: 'error',
        suggestions: ['Create a feature branch with hansolo_launch'],
        details: { currentBranch, mainBranch },
      };
    } catch (error) {
      return {
        name: 'On Feature Branch',
        passed: false,
        message: `Failed to check branch: ${error instanceof Error ? error.message : String(error)}`,
        level: 'error',
      };
    }
  }

  /**
   * Check if has uncommitted changes (for commit operation)
   */
  private async checkHasUncommittedChanges(_context: PreFlightContext): Promise<PreFlightCheckResult> {
    try {
      const status = await this.gitOps.getStatus();
      const hasChanges = status.staged.length > 0 || status.modified.length > 0 || status.created.length > 0 || status.deleted.length > 0;

      if (hasChanges) {
        return {
          name: 'Has Uncommitted Changes',
          passed: true,
          message: `${status.staged.length + status.modified.length + status.created.length + status.deleted.length} file(s) to commit`,
          level: 'info',
          details: {
            stagedCount: status.staged.length,
            unstagedCount: status.modified.length + status.created.length + status.deleted.length,
          },
        };
      }

      return {
        name: 'Has Uncommitted Changes',
        passed: false,
        message: 'No changes to commit',
        level: 'warning',
        suggestions: ['Make changes before committing'],
      };
    } catch (error) {
      return {
        name: 'Has Uncommitted Changes',
        passed: false,
        message: `Failed to check status: ${error instanceof Error ? error.message : String(error)}`,
        level: 'error',
      };
    }
  }

  /**
   * Check if has commits to ship (for push operation)
   */
  private async checkHasCommitsToShip(_context: PreFlightContext): Promise<PreFlightCheckResult> {
    try {
      const currentBranch = await this.gitOps.getCurrentBranch();
      const mainBranch = 'main';
      const log = await this.gitOps.getLog(100);

      // Count commits not in main
      const commits = log.filter(commit => !commit.includes(`Merge branch '${mainBranch}'`));

      if (commits.length > 0) {
        return {
          name: 'Has Commits To Ship',
          passed: true,
          message: `${commits.length} commit(s) ready to ship`,
          level: 'info',
          details: { commitCount: commits.length, currentBranch },
        };
      }

      return {
        name: 'Has Commits To Ship',
        passed: false,
        message: 'No commits to ship',
        level: 'warning',
        suggestions: ['Make commits before shipping'],
      };
    } catch (error) {
      return {
        name: 'Has Commits To Ship',
        passed: false,
        message: `Failed to check commits: ${error instanceof Error ? error.message : String(error)}`,
        level: 'error',
      };
    }
  }

  /**
   * Check if remote branch exists (for PR/merge operations)
   */
  private async checkRemoteBranchExists(context: PreFlightContext): Promise<PreFlightCheckResult> {
    const { branchName } = context;

    if (!branchName) {
      const currentBranch = await this.gitOps.getCurrentBranch();
      return this.checkRemoteBranchExists({ ...context, branchName: currentBranch });
    }

    try {
      const branches = await this.gitOps.listBranches(true);
      const remoteBranch = branches.find(b => b === `origin/${branchName}`);

      if (remoteBranch) {
        return {
          name: 'Remote Branch Exists',
          passed: true,
          message: `Branch '${branchName}' exists on remote`,
          level: 'info',
          details: { branchName },
        };
      }

      return {
        name: 'Remote Branch Exists',
        passed: false,
        message: `Branch '${branchName}' not found on remote`,
        level: 'error',
        suggestions: ['Push branch to remote first'],
        details: { branchName },
      };
    } catch (error) {
      return {
        name: 'Remote Branch Exists',
        passed: false,
        message: `Failed to check remote branch: ${error instanceof Error ? error.message : String(error)}`,
        level: 'error',
      };
    }
  }

  /**
   * Check if CI checks have passed (placeholder - requires GitHub integration)
   */
  private async checkCIChecksPassed(_context: PreFlightContext): Promise<PreFlightCheckResult> {
    // TODO: Implement with GitHub API integration
    return {
      name: 'CI Checks Passed',
      passed: true,
      message: 'CI check verification not implemented',
      level: 'info',
    };
  }

  /**
   * Check if PR exists (placeholder - requires GitHub integration)
   */
  private async checkPRExists(_context: PreFlightContext): Promise<PreFlightCheckResult> {
    // TODO: Implement with GitHub API integration
    return {
      name: 'PR Exists',
      passed: true,
      message: 'PR check not implemented',
      level: 'info',
    };
  }

  /**
   * Check if PR is approved (placeholder - requires GitHub integration)
   */
  private async checkPRApproved(_context: PreFlightContext): Promise<PreFlightCheckResult> {
    // TODO: Implement with GitHub API integration
    return {
      name: 'PR Approved',
      passed: true,
      message: 'PR approval check not implemented',
      level: 'info',
    };
  }

  /**
   * Check if there are no merge conflicts
   */
  private async checkNoMergeConflicts(_context: PreFlightContext): Promise<PreFlightCheckResult> {
    try {
      const status = await this.gitOps.getStatus();
      const hasConflicts = status.conflicted && status.conflicted.length > 0;

      if (!hasConflicts) {
        return {
          name: 'No Merge Conflicts',
          passed: true,
          message: 'No merge conflicts detected',
          level: 'info',
        };
      }

      return {
        name: 'No Merge Conflicts',
        passed: false,
        message: `${status.conflicted?.length || 0} file(s) with conflicts`,
        level: 'error',
        suggestions: ['Resolve merge conflicts before continuing'],
        details: { conflictedFiles: status.conflicted },
      };
    } catch (error) {
      return {
        name: 'No Merge Conflicts',
        passed: false,
        message: `Failed to check conflicts: ${error instanceof Error ? error.message : String(error)}`,
        level: 'warning',
      };
    }
  }
}
