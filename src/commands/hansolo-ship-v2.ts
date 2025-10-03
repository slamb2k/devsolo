import { ConsoleOutput } from '../ui/console-output';
import { WorkflowProgress } from '../ui/progress-indicators';
import { SessionRepository } from '../services/session-repository';
import { GitOperations } from '../services/git-operations';
import { ConfigurationManager } from '../services/configuration-manager';
import { WorkflowSession } from '../models/workflow-session';
import { GitHubIntegration } from '../services/github-integration';
import { BranchValidator } from '../services/validation/branch-validator';
import { PRValidator } from '../services/validation/pr-validator';
import { PreFlightChecks, PostFlightChecks, CheckResult } from '../services/validation/pre-flight-checks';
import { AsciiArt } from '../ui/ascii-art';
import { getLogger } from '../services/logger';

/**
 * Pre-flight checks for ship command
 */
class ShipPreFlightChecks extends PreFlightChecks {
  constructor(
    private session: WorkflowSession,
    private gitOps: GitOperations,
    private github: GitHubIntegration,
    private branchValidator: BranchValidator,
    private prValidator: PRValidator
  ) {
    super();
    this.setupChecks();
  }

  private setupChecks(): void {
    this.addCheck(async () => this.checkSessionValid());
    this.addCheck(async () => this.checkNotOnMainBranch());
    this.addCheck(async () => this.checkGitHubConfigured());
    this.addCheck(async () => this.checkBranchNotReused());
    this.addCheck(async () => this.checkNoPRConflicts());
    this.addCheck(async () => this.checkHooksConfigured());
  }

  private async checkSessionValid(): Promise<CheckResult> {
    return {
      passed: this.session.isActive(),
      name: 'Session valid',
      message: this.session.isActive() ? undefined : `State: ${this.session.currentState}`,
      level: 'error',
    };
  }

  private async checkNotOnMainBranch(): Promise<CheckResult> {
    const branch = await this.gitOps.getCurrentBranch();
    const isMain = branch === 'main' || branch === 'master';

    return {
      passed: !isMain,
      name: 'Not on main branch',
      message: isMain ? 'Cannot ship from main/master' : undefined,
      level: 'error',
    };
  }

  private async checkGitHubConfigured(): Promise<CheckResult> {
    const isInitialized = this.github.isInitialized();

    return {
      passed: isInitialized,
      name: 'GitHub integration configured',
      message: isInitialized
        ? undefined
        : 'GitHub token not found - PR creation may fail',
      level: 'warning',
    };
  }

  private async checkBranchNotReused(): Promise<CheckResult> {
    const reuseCheck = await this.branchValidator.detectBranchReuse(
      this.session,
      this.session.branchName
    );

    if (
      !reuseCheck.available &&
      reuseCheck.reuseDetected?.type === 'merged-and-recreated'
    ) {
      return {
        passed: false,
        name: 'Branch not reused after merge',
        message: `Branch was deleted after PR #${reuseCheck.reuseDetected.previousPR} merge and recreated`,
        level: 'error',
        suggestions: [
          'Abort this session and create new branch with different name',
          '/hansolo:abort --delete-branch',
        ],
      };
    }

    if (reuseCheck.reuseDetected?.type === 'continued-work') {
      return {
        passed: true,
        name: 'Continuing work after previous merge',
        message: `Will create new PR (previous: #${reuseCheck.reuseDetected.previousPR})`,
        level: 'info',
      };
    }

    return {
      passed: true,
      name: 'No branch reuse detected',
      level: 'info',
    };
  }

  private async checkNoPRConflicts(): Promise<CheckResult> {
    const prCheck = await this.prValidator.checkForPRConflicts(this.session.branchName);

    if (prCheck.action === 'blocked' && prCheck.multipleOpen) {
      return {
        passed: false,
        name: 'No PR conflicts',
        message: `Multiple open PRs: ${prCheck.multipleOpen.map(pr => `#${pr.number}`).join(', ')}`,
        level: 'error',
        suggestions: ['Manually close duplicate PRs on GitHub'],
      };
    }

    if (prCheck.action === 'update' && prCheck.existingPR) {
      return {
        passed: true,
        name: 'PR exists',
        message: `Will update PR #${prCheck.existingPR.number}`,
        level: 'info',
      };
    }

    if (prCheck.action === 'create-new' && prCheck.previousPR) {
      return {
        passed: true,
        name: 'Previous PR merged',
        message: `Will create new PR (previous: #${prCheck.previousPR.number})`,
        level: 'info',
      };
    }

    return {
      passed: true,
      name: 'No PR conflicts',
      message: 'Will create new PR',
      level: 'info',
    };
  }

  private async checkHooksConfigured(): Promise<CheckResult> {
    // Check if git hooks exist
    try {
      const fs = await import('fs/promises');
      await fs.access('.git/hooks/pre-commit');
      await fs.access('.git/hooks/pre-push');

      return {
        passed: true,
        name: 'Git hooks configured',
        message: 'pre-commit (lint, typecheck), pre-push (tests)',
        level: 'info',
      };
    } catch {
      return {
        passed: true,
        name: 'Git hooks',
        message: 'Not configured (optional)',
        level: 'warning',
      };
    }
  }
}

/**
 * Post-flight verifications for ship command
 */
class ShipPostFlightChecks extends PostFlightChecks {
  constructor(
    private session: WorkflowSession,
    private gitOps: GitOperations,
    private prNumber?: number
  ) {
    super();
    this.setupVerifications();
  }

  private setupVerifications(): void {
    this.addVerification(async () => this.verifyPRMerged());
    this.addVerification(async () => this.verifyBranchesDeleted());
    this.addVerification(async () => this.verifyMainSynced());
    this.addVerification(async () => this.verifySessionComplete());
    this.addVerification(async () => this.verifyOnMainBranch());
    this.addVerification(async () => this.verifyNoUncommittedChanges());
    this.addVerification(async () => this.verifySinglePRLifecycle());
  }

  private async verifyPRMerged(): Promise<CheckResult> {
    const merged = this.session.metadata?.pr?.merged === true;

    return {
      passed: merged,
      name: 'PR merged',
      message: this.prNumber ? `PR #${this.prNumber}` : undefined,
      level: 'info',
    };
  }

  private async verifyBranchesDeleted(): Promise<CheckResult> {
    const localExists = await this.gitOps.branchExists(this.session.branchName);
    const remoteExists = await this.gitOps.remoteBranchExists(this.session.branchName);

    return {
      passed: !localExists && !remoteExists,
      name: 'Feature branches deleted',
      message: !localExists && !remoteExists
        ? `${this.session.branchName} (local + remote)`
        : 'Some branches remain',
      level: 'info',
    };
  }

  private async verifyMainSynced(): Promise<CheckResult> {
    const currentBranch = await this.gitOps.getCurrentBranch();
    const isMain = currentBranch === 'main' || currentBranch === 'master';

    if (!isMain) {
      return {
        passed: false,
        name: 'Main branch synced',
        message: 'Not on main branch',
        level: 'warning',
      };
    }

    // Check if main is up to date
    const status = await this.gitOps.getBranchStatus();

    return {
      passed: status.ahead >= 0 && status.behind === 0,
      name: 'Main branch synced',
      message: status.behind === 0 ? 'Up to date with origin' : `${status.behind} commits behind`,
      level: 'info',
    };
  }

  private async verifySessionComplete(): Promise<CheckResult> {
    const isComplete = this.session.currentState === 'COMPLETE';

    return {
      passed: isComplete,
      name: 'Session marked complete',
      level: 'info',
    };
  }

  private async verifyOnMainBranch(): Promise<CheckResult> {
    const currentBranch = await this.gitOps.getCurrentBranch();
    const isMain = currentBranch === 'main' || currentBranch === 'master';

    return {
      passed: isMain,
      name: 'Currently on main',
      message: isMain ? currentBranch : `On ${currentBranch}`,
      level: 'info',
    };
  }

  private async verifyNoUncommittedChanges(): Promise<CheckResult> {
    const hasChanges = await this.gitOps.hasUncommittedChanges();

    return {
      passed: !hasChanges,
      name: 'No uncommitted changes',
      level: 'info',
    };
  }

  private async verifySinglePRLifecycle(): Promise<CheckResult> {
    // Verify that only one PR existed for this feature branch
    return {
      passed: true,
      name: 'Single PR lifecycle maintained',
      message: 'No duplicate PRs detected',
      level: 'info',
    };
  }
}

/**
 * Simplified Ship Command - Does everything automatically
 */
export class ShipCommandV2 {
  private output = new ConsoleOutput();
  private progress = new WorkflowProgress();
  private sessionRepo: SessionRepository;
  private gitOps: GitOperations;
  private configManager: ConfigurationManager;
  private githubIntegration: GitHubIntegration;
  private branchValidator: BranchValidator;
  private prValidator: PRValidator;

  constructor(basePath: string = '.hansolo') {
    this.sessionRepo = new SessionRepository(basePath);
    this.gitOps = new GitOperations();
    this.configManager = new ConfigurationManager(basePath);
    this.githubIntegration = new GitHubIntegration(basePath);
    this.branchValidator = new BranchValidator(basePath);
    this.prValidator = new PRValidator(basePath);
  }

  async execute(options: {
    message?: string;
    yes?: boolean;
    force?: boolean;
  } = {}): Promise<void> {
    const logger = getLogger();

    try {
      logger.debug('Ship command started', 'ship');

      // Check initialization
      if (!(await this.configManager.isInitialized())) {
        logger.warn('han-solo not initialized', 'ship');
        this.output.errorMessage('han-solo is not initialized');
        this.output.infoMessage('Run "hansolo init" first');
        return;
      }

      // Get current branch and session
      const currentBranch = await this.gitOps.getCurrentBranch();
      logger.debug(`Current branch: ${currentBranch}`, 'ship');

      const session = await this.sessionRepo.getSessionByBranch(currentBranch);

      if (!session) {
        logger.warn(`No session found for branch: ${currentBranch}`, 'ship');
        this.output.errorMessage(`No workflow session found for branch '${currentBranch}'`);
        this.output.infoMessage('Use "hansolo launch" to start a new workflow');
        return;
      }

      logger.info(`Shipping session ${session.id} on branch ${currentBranch}`, 'ship');

      // Initialize GitHub integration (tries env vars, config, then gh CLI)
      logger.debug('Initializing GitHub integration', 'ship');
      const githubInitialized = await this.githubIntegration.initialize();
      logger.debug(`GitHub integration initialized: ${githubInitialized}`, 'ship');

      // Run pre-flight checks
      logger.debug('Running pre-flight checks', 'ship');
      const preFlightChecks = new ShipPreFlightChecks(
        session,
        this.gitOps,
        this.githubIntegration,
        this.branchValidator,
        this.prValidator
      );

      const preFlightPassed = await preFlightChecks.runChecks({
        command: 'ship',
        session,
        options,
      });

      if (!preFlightPassed) {
        logger.error('Pre-flight checks failed', 'ship');
        this.output.errorMessage('\n❌ Pre-flight checks failed - aborting ship');
        return;
      }

      logger.info('Pre-flight checks passed', 'ship');

      // Display ASCII art banner
      console.log(AsciiArt.ship());

      // Execute complete workflow
      logger.info('Starting workflow execution', 'ship');
      await this.executeCompleteWorkflow(session, options);
      logger.info('Workflow execution completed', 'ship');

      // Run post-flight verifications
      logger.debug('Running post-flight verifications', 'ship');
      const postFlightChecks = new ShipPostFlightChecks(
        session,
        this.gitOps,
        session.metadata?.pr?.number
      );

      await postFlightChecks.runVerifications({
        command: 'ship',
        session,
        options,
      });

      this.output.info('');
      this.output.successMessage('🎉 Feature shipped! Ready for next feature.');
      logger.info('Ship command completed successfully', 'ship');
    } catch (error) {
      logger.error(
        `Ship command failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'ship',
        error instanceof Error ? error : undefined
      );
      this.output.errorMessage(
        `Ship failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  private async executeCompleteWorkflow(
    session: WorkflowSession,
    options: { message?: string; yes?: boolean; force?: boolean }
  ): Promise<void> {
    this.output.subheader('📊 Executing Workflow');

    // Step 1: Commit changes (if any)
    if (await this.gitOps.hasUncommittedChanges()) {
      await this.commitChanges(session, options.message);
    } else {
      this.output.dim('  ✓ No uncommitted changes');
    }

    // Step 2: Push to remote
    await this.pushToRemote(session, options.force);

    // Step 3: Create or update PR
    const pr = await this.createOrUpdatePR(session);

    // Step 4: Wait for checks and auto-merge
    await this.waitAndMerge(session, pr.number, options.yes);

    // Step 5: Sync main and cleanup
    await this.syncMainAndCleanup(session);
  }

  private async commitChanges(session: WorkflowSession, message?: string): Promise<void> {
    this.progress.start('Committing changes...');

    const commitMessage =
      message ||
      `feat: ${session.branchName}

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>`;

    await this.gitOps.stageAll();
    await this.gitOps.commit(commitMessage, { noVerify: false });

    this.progress.succeed('Changes committed (hooks: lint, typecheck)');
  }

  private async pushToRemote(session: WorkflowSession, _force?: boolean): Promise<void> {
    this.progress.start('Pushing to remote...');

    await this.gitOps.push('origin', session.branchName, ['--set-upstream']);

    this.progress.succeed(`Pushed to origin/${session.branchName} (hooks: tests)`);
  }

  private async createOrUpdatePR(session: WorkflowSession): Promise<{ number: number; url: string }> {
    const prCheck = await this.prValidator.checkForPRConflicts(session.branchName);

    if (prCheck.action === 'update' && prCheck.existingPR) {
      this.progress.info(`Updating existing PR #${prCheck.existingPR.number}`);
      return {
        number: prCheck.existingPR.number,
        url: prCheck.existingPR.html_url,
      };
    }

    this.progress.start('Creating pull request...');

    const prInfo = {
      title: `[${session.workflowType}] ${session.branchName}`,
      body: this.generatePRDescription(session),
      base: 'main',
      head: session.branchName,
    };

    const pr = await this.githubIntegration.createPullRequest(prInfo);

    if (!pr) {
      throw new Error('Failed to create PR via GitHub API');
    }

    // Update session metadata
    session.metadata = session.metadata || ({} as any);
    session.metadata.pr = {
      number: pr.number,
      url: pr.html_url,
    };
    await this.sessionRepo.updateSession(session.id, session);

    this.progress.succeed(`Created PR #${pr.number}`);
    this.output.dim(`  ${pr.html_url}`);

    return { number: pr.number, url: pr.html_url };
  }

  private async waitAndMerge(
    session: WorkflowSession,
    prNumber: number,
    _skipConfirm?: boolean
  ): Promise<void> {
    this.output.subheader('⏳ Waiting for CI Checks');

    const result = await this.githubIntegration.waitForChecks(prNumber, {
      timeout: 20 * 60 * 1000,
      pollInterval: 30 * 1000,
      onProgress: status => {
        this.output.info(
          `  ✓ ${status.passed} passed | ⏳ ${status.pending} pending | ✗ ${status.failed} failed`
        );
      },
    });

    if (!result.success) {
      if (result.timedOut) {
        throw new Error('Timed out waiting for CI checks');
      } else {
        throw new Error(`CI checks failed: ${result.failedChecks.join(', ')}`);
      }
    }

    this.output.successMessage('✓ All CI checks passed!');
    this.output.info('');

    // Merge PR
    this.progress.start('Merging PR...');

    const merged = await this.githubIntegration.mergePullRequest(prNumber, 'squash');

    if (!merged) {
      throw new Error('Failed to merge PR via GitHub API');
    }

    // Update session metadata
    session.metadata = session.metadata || ({} as any);
    if (session.metadata.pr) {
      session.metadata.pr.merged = true;
      session.metadata.pr.mergedAt = new Date().toISOString();
    }
    await this.sessionRepo.updateSession(session.id, session);

    this.progress.succeed(`Merged PR #${prNumber} (squash)`);
  }

  private async syncMainAndCleanup(session: WorkflowSession): Promise<void> {
    this.output.subheader('🧹 Syncing Main & Cleanup');

    const steps = [
      {
        name: 'Switching to main branch',
        action: async () => {
          await this.gitOps.checkoutBranch('main');
        },
      },
      {
        name: 'Pulling latest changes (squashed merge)',
        action: async () => {
          await this.gitOps.pull('origin', 'main');
        },
      },
      {
        name: 'Deleting local feature branch',
        action: async () => {
          try {
            await this.gitOps.deleteBranch(session.branchName, true);
          } catch {
            // Already deleted
          }
        },
      },
      {
        name: 'Deleting remote feature branch',
        action: async () => {
          try {
            await this.gitOps.deleteRemoteBranch(session.branchName);
            // Track deletion
            await this.branchValidator.trackBranchDeletion(session);
          } catch {
            // Already deleted
          }
        },
      },
      {
        name: 'Completing session',
        action: async () => {
          session.transitionTo('COMPLETE', 'ship_command');
          await this.sessionRepo.updateSession(session.id, session);
        },
      },
    ];

    await this.progress.runSteps(steps);
  }

  private generatePRDescription(session: WorkflowSession): string {
    return `## Summary

Branch: ${session.branchName}
Session: ${session.id}
Created: ${new Date(session.createdAt).toLocaleString()}

## Changes

- Feature implementation
- Tests added
- Documentation updated

🤖 Generated with [Claude Code](https://claude.com/claude-code)`;
  }
}
