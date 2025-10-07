import { CommandHandler } from './types';
import { SessionRepository } from '../services/session-repository';
import { GitOperations } from '../services/git-operations';
import { ConsoleOutput } from '../ui/console-output';
import { WorkflowProgress } from '../ui/progress-indicators';
import { PreFlightChecks, PostFlightChecks, CheckResult } from '../services/validation/pre-flight-checks';
import { getBanner } from '../ui/banners';
import chalk from 'chalk';

/**
 * Pre-flight checks for cleanup command
 */
class CleanupPreFlightChecks extends PreFlightChecks {
  constructor(
    private gitOps: GitOperations,
    private sessionRepo: SessionRepository
  ) {
    super();
    this.setupChecks();
  }

  private setupChecks(): void {
    this.addCheck(async () => this.checkGitRepository());
    this.addCheck(async () => this.checkHansoloInitialized());
  }

  private async checkGitRepository(): Promise<CheckResult> {
    const isGit = await this.gitOps.isInitialized();

    return {
      passed: isGit,
      name: 'Git repository',
      message: isGit ? 'Valid repository' : 'Not a git repository',
      level: isGit ? 'info' : 'error',
      suggestions: !isGit ? ['Run "git init" first'] : undefined,
    };
  }

  private async checkHansoloInitialized(): Promise<CheckResult> {
    try {
      await this.sessionRepo.listSessions();
      return {
        passed: true,
        name: 'Han-solo initialized',
        level: 'info',
      };
    } catch {
      return {
        passed: false,
        name: 'Han-solo initialized',
        message: 'Not initialized',
        level: 'error',
        suggestions: ['Run "hansolo init" first'],
      };
    }
  }
}

/**
 * Post-flight checks for cleanup command
 */
class CleanupPostFlightChecks extends PostFlightChecks {
  constructor(
    private gitOps: GitOperations,
    private sessionRepo: SessionRepository,
    private branchesDeleted: string[]
  ) {
    super();
    this.setupVerifications();
  }

  private setupVerifications(): void {
    this.addVerification(async () => this.verifyOnMainBranch());
    this.addVerification(async () => this.verifyOrphanedBranchesRemoved());
    this.addVerification(async () => this.verifyNoStaleSessions());
    this.addVerification(async () => this.verifyWorkingDirectoryClean());
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

  private async verifyOrphanedBranchesRemoved(): Promise<CheckResult> {
    const branches = await this.gitOps.listBranches();
    const stillExists = this.branchesDeleted.filter(b => branches.includes(b));

    return {
      passed: stillExists.length === 0,
      name: 'Orphaned branches removed',
      message: stillExists.length > 0
        ? `${stillExists.length} branches still exist`
        : `${this.branchesDeleted.length} branches deleted`,
      level: stillExists.length > 0 ? 'warning' : 'info',
    };
  }

  private async verifyNoStaleSessions(): Promise<CheckResult> {
    const sessions = await this.sessionRepo.listSessions({ all: true });
    const stale = sessions.filter(s =>
      s.currentState === 'COMPLETE' || s.currentState === 'ABORTED'
    );

    return {
      passed: stale.length === 0,
      name: 'No stale sessions',
      message: stale.length > 0 ? `${stale.length} stale sessions remain` : undefined,
      level: stale.length > 0 ? 'warning' : 'info',
    };
  }

  private async verifyWorkingDirectoryClean(): Promise<CheckResult> {
    const isClean = await this.gitOps.isClean();

    return {
      passed: isClean,
      name: 'Working directory clean',
      level: isClean ? 'info' : 'warning',
      message: isClean ? undefined : 'Uncommitted changes present',
    };
  }
}

export class HansoloCleanupCommandV2 implements CommandHandler {
  name = 'hansolo:cleanup';
  description = 'Clean up completed sessions and orphaned branches';

  private sessionRepo: SessionRepository;
  private gitOps: GitOperations;
  private console: ConsoleOutput;
  private progress: WorkflowProgress;
  private branchesDeleted: string[] = [];

  constructor() {
    this.sessionRepo = new SessionRepository();
    this.gitOps = new GitOperations();
    this.console = new ConsoleOutput();
    this.progress = new WorkflowProgress();
  }

  async execute(args: string[]): Promise<void> {
    try {
      const options = this.parseOptions(args);

      // Run pre-flight checks
      const preFlightChecks = new CleanupPreFlightChecks(
        this.gitOps,
        this.sessionRepo
      );

      const preFlightPassed = await preFlightChecks.runChecks({
        command: 'cleanup',
        options,
      });

      if (!preFlightPassed) {
        this.console.errorMessage('\n❌ Pre-flight checks failed - aborting cleanup');
        return;
      }

      // Display ASCII art banner
      this.console.info(getBanner('cleanup'));

      // Sync main branch first
      if (!options.noSync) {
        await this.syncMainBranch(options);
      }

      // Find cleanup candidates
      const steps = [
        {
          name: 'Analyzing cleanup targets',
          action: async () => {},
        },
      ];

      await this.progress.runSteps(steps);

      const candidates = await this.findCleanupCandidates(options);

      if (candidates.sessions.length === 0 && candidates.branches.length === 0) {
        this.console.successMessage('✨ No cleanup needed - everything is tidy!');

        // Run post-flight even if nothing to clean
        const postFlightChecks = new CleanupPostFlightChecks(
          this.gitOps,
          this.sessionRepo,
          []
        );
        await postFlightChecks.runVerifications({
          command: 'cleanup',
          options,
        });

        return;
      }

      // Show cleanup summary
      this.showCleanupSummary(candidates);

      // Confirm cleanup
      if (!options.force && !options.yes) {
        const confirmed = await this.console.confirm(
          '\nProceed with cleanup? This action cannot be undone.'
        );

        if (!confirmed) {
          this.console.info('Cleanup cancelled');
          return;
        }
      }

      // Perform cleanup
      await this.performCleanup(candidates, options);

      // Run post-flight verifications
      const postFlightChecks = new CleanupPostFlightChecks(
        this.gitOps,
        this.sessionRepo,
        this.branchesDeleted
      );

      this.console.info('');
      await postFlightChecks.runVerifications({
        command: 'cleanup',
        options,
      });

      this.console.info('');
      this.console.successMessage('✅ Cleanup completed successfully');
      this.console.infoMessage('🎉 Repository is clean and ready for the next feature!');

    } catch (error) {
      this.console.errorMessage(
        `Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  private parseOptions(args: string[]): CleanupOptions {
    const options: CleanupOptions = {
      expired: true,
      completed: true,
      orphaned: true,
      dryRun: false,
      force: false,
      yes: false,
      days: 30,
      noSync: false,
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      switch (arg) {
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--force':
      case '-f':
        options.force = true;
        break;
      case '--yes':
      case '-y':
        options.yes = true;
        break;
      case '--all':
        options.all = true;
        break;
      case '--sessions-only':
        options.sessionsOnly = true;
        break;
      case '--branches-only':
        options.branchesOnly = true;
        break;
      case '--no-sync':
        options.noSync = true;
        break;
      case '--days':
        if (i + 1 < args.length) {
          const nextArg = args[++i];
          if (nextArg) {
            options.days = parseInt(nextArg, 10);
          }
        }
        break;
      }
    }

    return options;
  }

  private async syncMainBranch(options: CleanupOptions): Promise<void> {
    try {
      this.console.subheader('📥 Syncing Main Branch');

      const currentBranch = await this.gitOps.getCurrentBranch();
      const status = await this.gitOps.getStatus();
      const hasUncommittedChanges = !status.isClean;

      let didStash = false;
      let wasOnFeatureBranch = false;

      if (hasUncommittedChanges) {
        this.progress.start('Stashing uncommitted changes...');
        await this.gitOps.stash('han-solo cleanup: auto-stash');
        didStash = true;
        this.progress.succeed('Changes stashed');
      }

      if (currentBranch !== 'main' && currentBranch !== 'master') {
        wasOnFeatureBranch = true;
        this.progress.start('Switching to main branch...');
        await this.gitOps.checkoutBranch('main');
        this.progress.succeed('Switched to main');
      }

      this.progress.start('Fetching latest from origin...');
      await this.gitOps.fetch('origin', 'main');
      this.progress.succeed('Fetched latest');

      this.progress.start('Pulling latest changes...');
      try {
        await this.gitOps.pull('origin', 'main');
        this.progress.succeed('Main branch synced ✓');
      } catch (_error) {
        this.progress.fail('Pull failed - may need manual rebase');
        this.console.warn('Unable to fast-forward main. You may need to manually sync.');
      }

      if (wasOnFeatureBranch && !options.branchesOnly) {
        this.progress.start(`Returning to ${currentBranch}...`);
        try {
          await this.gitOps.checkoutBranch(currentBranch);
          this.progress.succeed(`Back on ${currentBranch}`);
        } catch (_error) {
          this.console.warn(`Could not return to ${currentBranch} - branch may have been merged`);
          this.console.info('Staying on main branch');
        }
      }

      if (didStash) {
        this.progress.start('Restoring stashed changes...');
        try {
          await this.gitOps.stashPop();
          this.progress.succeed('Changes restored');
        } catch (_error) {
          this.console.warn('Could not auto-restore stashed changes');
          this.console.info('Run "git stash pop" manually to restore your changes');
        }
      }

      this.console.info('');

    } catch (error) {
      this.console.error('Failed to sync main branch', error as Error);
      this.console.warn('Continuing with cleanup anyway...\n');
    }
  }

  private async findCleanupCandidates(options: CleanupOptions): Promise<CleanupCandidates> {
    const candidates: CleanupCandidates = {
      sessions: [],
      branches: [],
    };

    if (!options.branchesOnly) {
      const sessions = await this.sessionRepo.listSessions({ all: true });
      const now = new Date();
      const threshold = new Date();
      threshold.setDate(threshold.getDate() - options.days);

      for (const session of sessions) {
        // Expired sessions
        if (options.expired || options.all) {
          const expiresAt = new Date(session.expiresAt);
          if (expiresAt < now) {
            candidates.sessions.push({
              session,
              reason: 'Expired',
            });
            continue;
          }
        }

        // Completed/aborted sessions
        if (options.completed || options.all) {
          if (session.currentState === 'COMPLETE' || session.currentState === 'ABORTED') {
            const updatedAt = new Date(session.updatedAt);
            if (updatedAt < threshold) {
              candidates.sessions.push({
                session,
                reason: `Completed ${options.days}+ days ago`,
              });
            }
          }
        }
      }
    }

    if (!options.sessionsOnly) {
      const branches = await this.gitOps.listBranches();
      const sessions = await this.sessionRepo.listSessions({ all: true });
      const sessionBranches = new Set(sessions.map(s => s.branchName));

      for (const branch of branches) {
        if (!sessionBranches.has(branch) && branch !== 'main' && branch !== 'master') {
          candidates.branches.push({
            name: branch,
            reason: 'No associated session',
          });
        }
      }
    }

    return candidates;
  }

  private showCleanupSummary(candidates: CleanupCandidates): void {
    this.console.subheader('📋 Cleanup Summary');

    if (candidates.sessions.length > 0) {
      this.console.info(chalk.yellow(`\nSessions to remove: ${candidates.sessions.length}`));
      candidates.sessions.slice(0, 5).forEach(item => {
        this.console.dim(`  • ${item.session.branchName} (${item.reason})`);
      });
      if (candidates.sessions.length > 5) {
        this.console.dim(`  ... and ${candidates.sessions.length - 5} more`);
      }
    }

    if (candidates.branches.length > 0) {
      this.console.info(chalk.yellow(`\nBranches to delete: ${candidates.branches.length}`));
      candidates.branches.slice(0, 5).forEach(item => {
        this.console.dim(`  • ${item.name} (${item.reason})`);
      });
      if (candidates.branches.length > 5) {
        this.console.dim(`  ... and ${candidates.branches.length - 5} more`);
      }
    }
  }

  private async performCleanup(candidates: CleanupCandidates, options: CleanupOptions): Promise<void> {
    if (options.dryRun) {
      this.console.info('\n🔍 Dry run mode - no changes will be made');
      return;
    }

    this.console.info('');

    // Clean up sessions
    if (candidates.sessions.length > 0) {
      this.progress.start('Removing stale sessions...');
      for (const item of candidates.sessions) {
        if (item.session?.id) {
          await this.sessionRepo.deleteSession(item.session.id);
        }
      }
      this.progress.succeed(`Removed ${candidates.sessions.length} sessions`);
    }

    // Clean up branches
    if (candidates.branches.length > 0) {
      this.progress.start('Deleting orphaned branches...');
      for (const item of candidates.branches) {
        try {
          await this.gitOps.deleteBranch(item.name, options.force);
          this.branchesDeleted.push(item.name);
        } catch (error) {
          this.console.warn(`Failed to delete branch ${item.name}: ${error}`);
        }
      }
      this.progress.succeed(`Deleted ${this.branchesDeleted.length} branches`);
    }

    // Switch to main if we deleted current branch
    const currentBranch = await this.gitOps.getCurrentBranch();
    if (this.branchesDeleted.includes(currentBranch)) {
      this.progress.start('Switching to main branch...');
      await this.gitOps.checkoutBranch('main');
      this.progress.succeed('Switched to main');
    }
  }

  validate(_args: string[]): boolean {
    return true;
  }
}

interface CleanupOptions {
  expired: boolean;
  completed: boolean;
  orphaned: boolean;
  dryRun: boolean;
  force: boolean;
  yes: boolean;
  days: number;
  noSync: boolean;
  all?: boolean;
  sessionsOnly?: boolean;
  branchesOnly?: boolean;
}

interface CleanupCandidates {
  sessions: Array<{
    session: any;
    reason: string;
  }>;
  branches: Array<{
    name: string;
    reason: string;
  }>;
}
