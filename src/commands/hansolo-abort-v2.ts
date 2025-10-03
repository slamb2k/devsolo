import { ConsoleOutput } from '../ui/console-output';
import { WorkflowProgress } from '../ui/progress-indicators';
import { SessionRepository } from '../services/session-repository';
import { GitOperations } from '../services/git-operations';
import { ConfigurationManager } from '../services/configuration-manager';
import { WorkflowSession } from '../models/workflow-session';
import { PreFlightChecks, PostFlightChecks, CheckResult } from '../services/validation/pre-flight-checks';
import { AsciiArt } from '../ui/ascii-art';

/**
 * Pre-flight checks for abort command
 */
class AbortPreFlightChecks extends PreFlightChecks {
  constructor(
    private gitOps: GitOperations,
    private sessionRepo: SessionRepository,
    private branchName: string
  ) {
    super();
    this.setupChecks();
  }

  private setupChecks(): void {
    this.addCheck(async () => this.checkSessionExists());
    this.addCheck(async () => this.checkGitRepository());
  }

  private async checkSessionExists(): Promise<CheckResult> {
    const session = await this.sessionRepo.getSessionByBranch(this.branchName);

    return {
      passed: !!session,
      name: 'Session exists',
      message: session ? `Session ID: ${session.id.substring(0, 8)}...` : 'No session found',
      level: session ? 'info' : 'error',
      suggestions: !session ? ['Check branch name or use /hansolo:sessions to list active sessions'] : undefined,
    };
  }

  private async checkGitRepository(): Promise<CheckResult> {
    const isGit = await this.gitOps.isInitialized();

    return {
      passed: isGit,
      name: 'Git repository',
      level: isGit ? 'info' : 'error',
    };
  }
}

/**
 * Post-flight checks for abort command
 */
class AbortPostFlightChecks extends PostFlightChecks {
  constructor(
    private session: WorkflowSession,
    private gitOps: GitOperations,
    private branchDeleted: boolean
  ) {
    super();
    this.setupVerifications();
  }

  private setupVerifications(): void {
    this.addVerification(async () => this.verifySessionAborted());
    this.addVerification(async () => this.verifyOnMainBranch());
    if (this.branchDeleted) {
      this.addVerification(async () => this.verifyBranchDeleted());
    }
    this.addVerification(async () => this.verifyNoUncommittedChanges());
  }

  private async verifySessionAborted(): Promise<CheckResult> {
    return {
      passed: this.session.currentState === 'ABORTED',
      name: 'Session marked as aborted',
      message: this.session.currentState,
      level: 'info',
    };
  }

  private async verifyOnMainBranch(): Promise<CheckResult> {
    const currentBranch = await this.gitOps.getCurrentBranch();
    const isMain = currentBranch === 'main' || currentBranch === 'master';

    return {
      passed: isMain,
      name: 'On main branch',
      message: currentBranch,
      level: isMain ? 'info' : 'warning',
    };
  }

  private async verifyBranchDeleted(): Promise<CheckResult> {
    const exists = await this.gitOps.branchExists(this.session.branchName);

    return {
      passed: !exists,
      name: 'Feature branch deleted',
      message: exists ? 'Branch still exists' : this.session.branchName,
      level: exists ? 'warning' : 'info',
    };
  }

  private async verifyNoUncommittedChanges(): Promise<CheckResult> {
    const hasChanges = await this.gitOps.hasUncommittedChanges();

    return {
      passed: !hasChanges,
      name: 'No uncommitted changes',
      level: hasChanges ? 'warning' : 'info',
    };
  }
}

export class AbortCommandV2 {
  private output = new ConsoleOutput();
  private progress = new WorkflowProgress();
  private sessionRepo: SessionRepository;
  private gitOps: GitOperations;
  private configManager: ConfigurationManager;

  constructor(basePath: string = '.hansolo') {
    this.sessionRepo = new SessionRepository(basePath);
    this.gitOps = new GitOperations();
    this.configManager = new ConfigurationManager(basePath);
  }

  async execute(options: {
    branchName?: string;
    force?: boolean;
    deleteBranch?: boolean;
    yes?: boolean;
  } = {}): Promise<{ stashRef?: string; branchAborted: string }> {
    try {
      // Check initialization
      if (!await this.configManager.isInitialized()) {
        this.output.errorMessage('han-solo is not initialized');
        this.output.infoMessage('Run "hansolo init" first');
        throw new Error('han-solo is not initialized');
      }

      // Determine branch name
      const branchName = options.branchName || await this.gitOps.getCurrentBranch();

      // Run pre-flight checks
      const preFlightChecks = new AbortPreFlightChecks(
        this.gitOps,
        this.sessionRepo,
        branchName
      );

      const preFlightPassed = await preFlightChecks.runChecks({
        command: 'abort',
        options,
      });

      if (!preFlightPassed) {
        this.output.errorMessage('\n❌ Pre-flight checks failed - aborting abort operation');
        throw new Error('Pre-flight checks failed');
      }

      // Display ASCII art banner
      this.output.info(AsciiArt.abort());

      // Get session
      const session = await this.sessionRepo.getSessionByBranch(branchName);
      if (!session) {
        this.output.errorMessage(`No session found for branch '${branchName}'`);
        throw new Error(`No session found for branch '${branchName}'`);
      }

      // Check if session can be aborted
      if (!session.isActive() && !options.force) {
        this.output.errorMessage(`Session is not active (state: ${session.currentState})`);
        this.output.infoMessage('Use --force to abort anyway');
        throw new Error(`Session is not active (state: ${session.currentState})`);
      }

      // Check for uncommitted changes
      const currentBranch = await this.gitOps.getCurrentBranch();
      const isCurrentBranch = currentBranch === branchName;
      let stashRef: string | undefined;

      if (isCurrentBranch) {
        const hasChanges = await this.gitOps.hasUncommittedChanges();
        if (hasChanges) {
          if (options.force) {
            // Force flag explicitly discards - user knows what they're doing
            this.output.warningMessage('⚠️  Discarding uncommitted changes (--force)');
          } else if (options.yes) {
            // Non-interactive: auto-stash to preserve work
            this.output.infoMessage('📦 Auto-stashing uncommitted changes...');
            const stashResult = await this.stashChanges(branchName);
            stashRef = stashResult.stashRef;
          } else {
            // Interactive: prompt user for choice
            this.output.warningMessage('⚠️  Uncommitted changes detected');
            const shouldStash = await this.output.confirm('Stash changes before aborting?');

            if (shouldStash) {
              const stashResult = await this.stashChanges(branchName);
              stashRef = stashResult.stashRef;
            } else if (!await this.output.confirm('Discard uncommitted changes?')) {
              this.output.infoMessage('Abort cancelled');
              return { branchAborted: branchName };
            }
          }
        }
      }

      // Confirm abort action
      if (!options.yes) {
        this.output.warningMessage('\n⚠️  This will abort the workflow and mark the session as cancelled');

        if (options.deleteBranch) {
          this.output.warningMessage(`⚠️  This will also DELETE the branch '${branchName}'`);
        }

        const confirmed = await this.output.confirm(
          `\nAre you sure you want to abort the workflow on '${branchName}'?`
        );

        if (!confirmed) {
          this.output.infoMessage('Abort cancelled');
          return { branchAborted: branchName };
        }
      }

      // Perform abort
      let branchDeleted = false;
      await this.performAbort(session, branchName, isCurrentBranch, options.deleteBranch);

      if (options.deleteBranch) {
        branchDeleted = true;
      }

      // Run post-flight verifications
      const postFlightChecks = new AbortPostFlightChecks(
        session,
        this.gitOps,
        branchDeleted
      );

      this.output.info('');
      await postFlightChecks.runVerifications({
        command: 'abort',
        session,
        options,
      });

      this.output.info('');
      this.output.successMessage('✅ Workflow aborted successfully');
      this.showAbortSummary(session, options.deleteBranch, stashRef);

      return {
        stashRef,
        branchAborted: branchName
      };

    } catch (error) {
      this.output.errorMessage(`Abort failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  private async stashChanges(branchName: string): Promise<{ stashRef: string }> {
    const stashResult = await this.gitOps.stashChanges(`han-solo abort stash for ${branchName}`);
    this.output.successMessage(`Changes stashed: ${stashResult.stashRef}`);
    return stashResult;
  }

  private async performAbort(
    session: WorkflowSession,
    branchName: string,
    isCurrentBranch: boolean,
    deleteBranch?: boolean
  ): Promise<void> {
    const steps: Array<{ name: string; action: () => Promise<void> }> = [];

    // Mark session as aborted
    steps.push({
      name: 'Marking session as aborted',
      action: async () => {
        session.transitionTo('ABORTED', 'abort_command', {
          reason: 'User requested abort',
          timestamp: new Date().toISOString(),
        });
        await this.sessionRepo.updateSession(session.id, session);
      },
    });

    // Switch to main if needed
    if (isCurrentBranch) {
      steps.push({
        name: 'Switching to main branch',
        action: async () => {
          await this.gitOps.checkoutBranch('main');
        },
      });
    }

    // Delete branch if requested
    if (deleteBranch) {
      steps.push({
        name: `Deleting branch ${branchName}`,
        action: async () => {
          await this.gitOps.deleteBranch(branchName, true);
        },
      });
    }

    this.output.info('');
    await this.progress.runSteps(steps);
  }

  private showAbortSummary(session: WorkflowSession, branchDeleted?: boolean, stashRef?: string): void {
    this.output.info('');
    this.output.subheader('📊 Abort Summary');
    this.output.dim(`  Session ID: ${session.id}`);
    this.output.dim(`  Branch: ${session.branchName}`);
    this.output.dim(`  State: ${session.currentState}`);
    if (branchDeleted) {
      this.output.dim('  Branch deleted: Yes');
    }
    if (stashRef) {
      this.output.dim(`  Work stashed: ${stashRef}`);
      this.output.infoMessage('💡 Pass stashRef to /hansolo:launch to restore your work');
    } else {
      this.output.infoMessage('💡 You can start a new feature with /hansolo:launch');
    }
  }
}
