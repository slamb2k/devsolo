import { ConsoleOutput } from '../ui/console-output';
import { WorkflowProgress } from '../ui/progress-indicators';
import { SessionRepository } from '../services/session-repository';
import { GitOperations } from '../services/git-operations';
import { ConfigurationManager } from '../services/configuration-manager';
import { PreFlightChecks, PostFlightChecks, CheckResult } from '../services/validation/pre-flight-checks';
import { AsciiArt } from '../ui/ascii-art';

/**
 * Pre-flight checks for swap command
 */
class SwapPreFlightChecks extends PreFlightChecks {
  constructor(
    private gitOps: GitOperations,
    private sessionRepo: SessionRepository,
    private targetBranch: string
  ) {
    super();
    this.setupChecks();
  }

  private setupChecks(): void {
    this.addCheck(async () => this.checkTargetSessionExists());
    this.addCheck(async () => this.checkNotAlreadyOnBranch());
  }

  private async checkTargetSessionExists(): Promise<CheckResult> {
    const session = await this.sessionRepo.getSessionByBranch(this.targetBranch);

    return {
      passed: !!session,
      name: 'Target session exists',
      message: session ? `Session for ${this.targetBranch}` : 'No session found',
      level: session ? 'info' : 'error',
      suggestions: !session ? ['Use /hansolo:sessions to list available sessions'] : undefined,
    };
  }

  private async checkNotAlreadyOnBranch(): Promise<CheckResult> {
    const currentBranch = await this.gitOps.getCurrentBranch();
    const alreadyOn = currentBranch === this.targetBranch;

    return {
      passed: !alreadyOn,
      name: 'Not already on target branch',
      message: alreadyOn ? `Already on ${this.targetBranch}` : undefined,
      level: alreadyOn ? 'error' : 'info',
    };
  }
}

/**
 * Post-flight checks for swap command
 */
class SwapPostFlightChecks extends PostFlightChecks {
  constructor(
    private gitOps: GitOperations,
    private sessionRepo: SessionRepository,
    private targetBranch: string,
    private changesStashed: boolean
  ) {
    super();
    this.setupVerifications();
  }

  private setupVerifications(): void {
    this.addVerification(async () => this.verifyOnTargetBranch());
    this.addVerification(async () => this.verifySessionActive());
    if (this.changesStashed) {
      this.addVerification(async () => this.verifyChangesStashed());
    }
  }

  private async verifyOnTargetBranch(): Promise<CheckResult> {
    const currentBranch = await this.gitOps.getCurrentBranch();
    const isCorrect = currentBranch === this.targetBranch;

    return {
      passed: isCorrect,
      name: 'On target branch',
      message: currentBranch,
      level: isCorrect ? 'info' : 'error',
    };
  }

  private async verifySessionActive(): Promise<CheckResult> {
    const session = await this.sessionRepo.getSessionByBranch(this.targetBranch);

    return {
      passed: !!session?.isActive(),
      name: 'Session active',
      message: session ? `State: ${session.currentState}` : 'No session',
      level: 'info',
    };
  }

  private async verifyChangesStashed(): Promise<CheckResult> {
    const stashList = await this.gitOps.stashList();

    return {
      passed: stashList.length > 0,
      name: 'Changes stashed',
      message: stashList.length > 0 ? `${stashList.length} stash(es)` : undefined,
      level: 'info',
    };
  }
}

export class SwapCommandV2 {
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
    stash?: boolean;
  } = {}): Promise<void> {
    try {
      // Check initialization
      if (!await this.configManager.isInitialized()) {
        this.output.errorMessage('han-solo is not initialized');
        this.output.infoMessage('Run "hansolo init" first');
        return;
      }

      // Determine target branch
      if (!options.branchName) {
        this.output.errorMessage('Branch name is required');
        this.output.infoMessage('Usage: /hansolo:swap <branch-name>');
        return;
      }

      const targetBranch = options.branchName;

      // Run pre-flight checks
      const preFlightChecks = new SwapPreFlightChecks(
        this.gitOps,
        this.sessionRepo,
        targetBranch
      );

      const preFlightPassed = await preFlightChecks.runChecks({
        command: 'swap',
        options,
      });

      if (!preFlightPassed) {
        this.output.errorMessage('\n❌ Pre-flight checks failed - aborting swap');
        return;
      }

      // Display ASCII art banner
      console.log(AsciiArt.swap());

      // Handle uncommitted changes
      let changesStashed = false;
      const hasChanges = await this.gitOps.hasUncommittedChanges();

      if (hasChanges) {
        if (options.stash) {
          await this.stashChanges();
          changesStashed = true;
        } else if (!options.force) {
          this.output.warningMessage('⚠️  Uncommitted changes detected');
          const shouldStash = await this.output.confirm('Stash changes before swapping?');

          if (shouldStash) {
            await this.stashChanges();
            changesStashed = true;
          } else {
            this.output.errorMessage('Cannot swap with uncommitted changes');
            this.output.infoMessage('Use --stash to automatically stash changes, or --force to override');
            return;
          }
        }
      }

      // Perform swap
      await this.performSwap(targetBranch);

      // Run post-flight verifications
      const postFlightChecks = new SwapPostFlightChecks(
        this.gitOps,
        this.sessionRepo,
        targetBranch,
        changesStashed
      );

      this.output.info('');
      await postFlightChecks.runVerifications({
        command: 'swap',
        options,
      });

      this.output.info('');
      this.output.successMessage(`✅ Swapped to session on branch: ${targetBranch}`);

      if (changesStashed) {
        this.output.infoMessage('💡 Run "git stash pop" to restore your stashed changes');
      }

    } catch (error) {
      this.output.errorMessage(`Swap failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  private async stashChanges(): Promise<void> {
    const currentBranch = await this.gitOps.getCurrentBranch();
    const stashResult = await this.gitOps.stashChanges(`han-solo swap from ${currentBranch}`);
    this.output.successMessage(`Changes stashed: ${stashResult.stashRef}`);
  }

  private async performSwap(targetBranch: string): Promise<void> {
    const steps = [
      {
        name: `Switching to branch ${targetBranch}`,
        action: async () => {
          await this.gitOps.checkoutBranch(targetBranch);
        },
      },
    ];

    this.output.info('');
    await this.progress.runSteps(steps);
  }
}
