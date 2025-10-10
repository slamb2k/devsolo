import { WorkflowSession } from '../../models/workflow-session';
import { GitOperations } from '../git-operations';
import { SessionRepository } from '../session-repository';

/**
 * Option for resolving a failed check
 */
export interface CheckOption {
  id: string;           // Machine-readable ID (e.g., 'stash_changes', 'abort_session')
  label: string;        // Human-readable label (e.g., 'Stash changes and continue')
  description?: string; // Detailed explanation
  action: string;       // What would be executed (e.g., 'git stash && git checkout main')
  autoRecommended?: boolean; // Whether this is the recommended option for --auto
  risk?: 'low' | 'medium' | 'high'; // Risk level
}

/**
 * Result of a single pre-flight check
 */
export interface PreFlightCheckResult {
  name: string;
  passed: boolean;
  message?: string;
  level: 'info' | 'warning' | 'error' | 'prompt'; // 'prompt' = recoverable issue with options
  suggestions?: string[];
  details?: Record<string, unknown>;
  options?: CheckOption[]; // Available options when level is 'prompt'
}

/**
 * Aggregated result of all pre-flight checks
 */
export interface PreFlightVerificationResult {
  allPassed: boolean;
  checks: PreFlightCheckResult[];
  failures: string[];
  warnings: string[];
  prompts: string[]; // Messages for checks that need user input (level='prompt')
  passedCount: number;
  failedCount: number; // Only counts 'error' level checks
  warningCount: number;
  promptCount: number; // Count of checks needing user input
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

    const prompts = checks
      .filter(c => !c.passed && c.level === 'prompt')
      .map(c => c.message || c.name);

    const allPassed = checks.every(c => c.passed);
    const passedCount = checks.filter(c => c.passed).length;
    const failedCount = checks.filter(c => !c.passed && c.level === 'error').length;
    const warningCount = checks.filter(c => !c.passed && c.level === 'warning').length;
    const promptCount = checks.filter(c => !c.passed && c.level === 'prompt').length;

    return {
      allPassed,
      checks,
      failures,
      warnings,
      prompts,
      passedCount,
      failedCount,
      warningCount,
      promptCount,
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

      // Check if there are uncommitted changes
      const hasChanges = await this.gitOps.hasUncommittedChanges();

      // Check if there's an active session on current branch
      const session = await this.sessionRepo.getSessionByBranch(currentBranch);

      const options: CheckOption[] = [];

      if (hasChanges) {
        // Has changes - offer to stash
        options.push({
          id: 'stash_and_switch',
          label: 'Stash changes and switch to main',
          description: 'Safely stash your current changes and switch to main branch',
          action: `git stash push -m "auto-stash before switching to ${mainBranch}" && git checkout ${mainBranch}`,
          autoRecommended: true,
          risk: 'low',
        });
      } else {
        // No changes - safe to switch directly
        options.push({
          id: 'switch_to_main',
          label: 'Switch to main branch',
          description: 'Switch to main branch (working directory is clean)',
          action: `git checkout ${mainBranch}`,
          autoRecommended: true,
          risk: 'low',
        });
      }

      if (session) {
        options.push({
          id: 'abort_session',
          label: 'Abort current session and switch to main',
          description: `Abort session on '${currentBranch}' and switch to main`,
          action: `abort session ${session.id} && git checkout ${mainBranch}`,
          autoRecommended: false,
          risk: 'medium',
        });
      }

      return {
        name: 'On Main Branch',
        passed: false,
        message: `On branch '${currentBranch}', expected '${mainBranch}'`,
        level: 'prompt',
        details: { currentBranch, mainBranch, hasUncommittedChanges: hasChanges },
        options,
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

      const currentBranch = await this.gitOps.getCurrentBranch();
      const stagedCount = status.staged.length;
      const unstagedCount = status.modified.length + status.created.length + status.deleted.length;

      const options: CheckOption[] = [
        {
          id: 'stash_changes',
          label: 'Stash uncommitted changes',
          description: 'Safely stash all uncommitted changes to restore later',
          action: `git stash push -m "auto-stash on ${currentBranch}"`,
          autoRecommended: true,
          risk: 'low',
        },
        {
          id: 'commit_changes',
          label: 'Commit changes first',
          description: 'Create a commit with these changes before continuing',
          action: 'Use hansolo_commit to commit changes',
          autoRecommended: false,
          risk: 'low',
        },
      ];

      return {
        name: 'Working Directory Clean',
        passed: false,
        message: `${stagedCount} staged, ${unstagedCount} unstaged changes`,
        level: 'prompt',
        details: {
          stagedCount,
          unstagedCount,
          changedFiles: [...status.staged, ...status.modified, ...status.created, ...status.deleted],
        },
        options,
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

      // Filter out completed and aborted sessions - only check for active ones
      const activeSessions = sessions.filter(s =>
        s.currentState !== 'COMPLETE' &&
        s.currentState !== 'ABORTED'
      );
      const session = activeSessions[0] || null;

      if (!session) {
        return {
          name: 'No Existing Session',
          passed: true,
          message: 'No active session found',
          level: 'info',
        };
      }

      const options: CheckOption[] = [
        {
          id: 'abort_session',
          label: 'Abort current session',
          description: `Abort the active session on '${session.branchName}' and continue`,
          action: `abort session ${session.id}`,
          autoRecommended: true,
          risk: 'medium',
        },
        {
          id: 'swap_session',
          label: 'Switch to existing session',
          description: 'Work on the existing session instead of creating a new one',
          action: `git checkout ${session.branchName}`,
          autoRecommended: false,
          risk: 'low',
        },
        {
          id: 'complete_session',
          label: 'Complete current session first',
          description: 'Ship the current session before starting a new one',
          action: 'Use hansolo_ship to complete current session',
          autoRecommended: false,
          risk: 'low',
        },
      ];

      return {
        name: 'No Existing Session',
        passed: false,
        message: `Active session exists: ${session.id} (branch: ${session.branchName})`,
        level: 'prompt',
        details: {
          sessionId: session.id,
          branchName: session.branchName,
          state: session.currentState,
          workflowType: session.workflowType,
        },
        options,
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
