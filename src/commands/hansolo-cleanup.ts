import { CommandHandler } from './types';
import { SessionRepository } from '../services/session-repository';
import { GitOperations } from '../services/git-operations';
import { ConsoleOutput } from '../ui/console-output';
import { ProgressIndicator } from '../ui/progress-indicators';
import { BoxFormatter } from '../ui/box-formatter';
import chalk from 'chalk';

export class HansoloCleanupCommand implements CommandHandler {
  name = 'hansolo:cleanup';
  description = 'Clean up completed sessions and branches';

  private sessionRepo: SessionRepository;
  private gitOps: GitOperations;
  private console: ConsoleOutput;
  private progress: ProgressIndicator;
  private box: BoxFormatter;

  constructor() {
    this.sessionRepo = new SessionRepository();
    this.gitOps = new GitOperations();
    this.console = new ConsoleOutput();
    this.progress = new ProgressIndicator();
    this.box = new BoxFormatter();
  }

  async execute(args: string[]): Promise<void> {
    try {
      // Show banner
      this.console.printBanner('🧹 han-solo Cleanup');

      // Parse options
      const options = this.parseOptions(args);

      // Start cleanup process
      this.progress.start('Analyzing cleanup targets...');

      // Find cleanup candidates
      const candidates = await this.findCleanupCandidates(options);

      if (candidates.sessions.length === 0 && candidates.branches.length === 0) {
        this.progress.succeed('No cleanup needed - everything is tidy!');
        return;
      }

      this.progress.stop();

      // Show cleanup summary
      await this.showCleanupSummary(candidates);

      // Confirm cleanup
      if (!options.force) {
        const confirmed = await this.console.confirm(
          'Proceed with cleanup? This action cannot be undone.'
        );

        if (!confirmed) {
          this.console.info('Cleanup cancelled');
          return;
        }
      }

      // Perform cleanup
      await this.performCleanup(candidates, options);

      this.console.success('✅ Cleanup completed successfully');

    } catch (error) {
      this.progress.fail('Cleanup failed');
      this.console.error('Failed to perform cleanup', error as Error);
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
      days: 30,
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
        case '--all':
          options.all = true;
          break;
        case '--sessions-only':
          options.sessionsOnly = true;
          break;
        case '--branches-only':
          options.branchesOnly = true;
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

  private async findCleanupCandidates(options: CleanupOptions): Promise<CleanupCandidates> {
    const candidates: CleanupCandidates = {
      sessions: [],
      branches: [],
      locks: [],
    };

    if (!options.branchesOnly) {
      // Find expired sessions
      if (options.expired || options.all) {
        const sessions = await this.sessionRepo.listSessions();
        const now = new Date();

        for (const session of sessions) {
          const expiresAt = new Date(session.expiresAt);
          if (expiresAt < now) {
            candidates.sessions.push({
              session,
              reason: 'Expired',
            });
          }
        }
      }

      // Find completed sessions older than threshold
      if (options.completed || options.all) {
        const sessions = await this.sessionRepo.listSessions();
        const threshold = new Date();
        threshold.setDate(threshold.getDate() - options.days);

        for (const session of sessions) {
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
      // Find orphaned branches (branches without sessions)
      if (options.orphaned || options.all) {
        const branches = await this.gitOps.listBranches();
        const sessions = await this.sessionRepo.listSessions();
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
    }

    // Find stale lock files
    const locks = await this.findStaleLocks();
    candidates.locks = locks;

    return candidates;
  }

  private async showCleanupSummary(candidates: CleanupCandidates): Promise<void> {
    const lines: string[] = [];

    if (candidates.sessions.length > 0) {
      lines.push(chalk.yellow(`Sessions to remove: ${candidates.sessions.length}`));
      candidates.sessions.slice(0, 5).forEach(item => {
        lines.push(`  • ${item.session.branchName} (${item.reason})`);
      });
      if (candidates.sessions.length > 5) {
        lines.push(`  ... and ${candidates.sessions.length - 5} more`);
      }
    }

    if (candidates.branches.length > 0) {
      lines.push(chalk.yellow(`\nBranches to delete: ${candidates.branches.length}`));
      candidates.branches.slice(0, 5).forEach(item => {
        lines.push(`  • ${item.name} (${item.reason})`);
      });
      if (candidates.branches.length > 5) {
        lines.push(`  ... and ${candidates.branches.length - 5} more`);
      }
    }

    if (candidates.locks.length > 0) {
      lines.push(chalk.yellow(`\nLock files to remove: ${candidates.locks.length}`));
    }

    this.box.printBox('Cleanup Summary', lines.join('\n'));
  }

  private async performCleanup(candidates: CleanupCandidates, options: CleanupOptions): Promise<void> {
    if (options.dryRun) {
      this.console.info('🔍 Dry run mode - no changes will be made');
      return;
    }

    // Clean up sessions
    if (candidates.sessions.length > 0) {
      this.progress.start('Removing expired sessions...');
      for (const item of candidates.sessions) {
        if (item.session && item.session.id) {
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
        } catch (error) {
          this.console.warn(`Failed to delete branch ${item.name}: ${error}`);
        }
      }
      this.progress.succeed(`Deleted ${candidates.branches.length} branches`);
    }

    // Clean up lock files
    if (candidates.locks.length > 0) {
      this.progress.start('Removing stale locks...');
      for (const lock of candidates.locks) {
        await this.removeLockFile(lock);
      }
      this.progress.succeed(`Removed ${candidates.locks.length} lock files`);
    }

    // Clean up audit logs if requested
    if (options.all) {
      await this.cleanupAuditLogs(options.days);
    }
  }

  private async findStaleLocks(): Promise<string[]> {
    const fs = await import('fs/promises');
    const path = await import('path');

    try {
      const lockDir = '.hansolo/locks';
      const files = await fs.readdir(lockDir);
      const locks: string[] = [];

      for (const file of files) {
        if (file.endsWith('.lock')) {
          const lockPath = path.join(lockDir, file);
          const stat = await fs.stat(lockPath);
          const ageInHours = (Date.now() - stat.mtime.getTime()) / (1000 * 60 * 60);

          // Consider locks older than 24 hours as stale
          if (ageInHours > 24) {
            locks.push(lockPath);
          }
        }
      }

      return locks;
    } catch {
      return [];
    }
  }

  private async removeLockFile(lockPath: string): Promise<void> {
    const fs = await import('fs/promises');
    try {
      await fs.unlink(lockPath);
    } catch {
      // Ignore errors if file doesn't exist
    }
  }

  private async cleanupAuditLogs(daysToKeep: number): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');

    try {
      const auditDir = '.hansolo/audit';
      const threshold = new Date();
      threshold.setDate(threshold.getDate() - daysToKeep);

      const months = await fs.readdir(auditDir);
      for (const month of months) {
        const monthDir = path.join(auditDir, month);
        const stat = await fs.stat(monthDir);

        if (stat.isDirectory() && stat.mtime < threshold) {
          await fs.rm(monthDir, { recursive: true });
        }
      }
    } catch {
      // Ignore errors if audit directory doesn't exist
    }
  }

  validate(_args: string[]): boolean {
    // All arguments are optional
    return true;
  }
}

interface CleanupOptions {
  expired: boolean;
  completed: boolean;
  orphaned: boolean;
  dryRun: boolean;
  force: boolean;
  days: number;
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
  locks: string[];
}