#!/usr/bin/env node

import { GitOperations } from '../services/git-operations';
import { SessionRepository } from '../services/session-repository';
import chalk from 'chalk';

/**
 * han-solo pre-commit hook
 * Blocks direct commits to main/master branch
 */
class PreCommitHook {
  private gitOps: GitOperations;
  private sessionRepo: SessionRepository;

  constructor() {
    this.gitOps = new GitOperations();
    this.sessionRepo = new SessionRepository();
  }

  async run(): Promise<void> {
    try {
      // Get current branch
      const branch = await this.gitOps.getCurrentBranch();

      // Check if on protected branch
      if (this.isProtectedBranch(branch)) {
        this.exitWithError(
          `Direct commits to ${branch} branch are not allowed!`,
          'Use /hansolo:launch to create a feature branch'
        );
      }

      // Check if there's an active session for this branch
      const session = await this.sessionRepo.getSessionByBranch(branch);

      if (session) {
        // Validate session state allows commits
        const allowedStates = [
          'BRANCH_READY',
          'CHANGES_COMMITTED',
          'HOTFIX_READY',
          'HOTFIX_COMMITTED',
        ];

        if (!allowedStates.includes(session.currentState)) {
          this.exitWithWarning(
            `Current workflow state (${session.currentState}) may not expect commits.`,
            'Consider using /hansolo:ship to progress the workflow.'
          );
        }
      } else if (!this.isLocalBranch(branch)) {
        // Warn if no session exists for a feature branch
        this.exitWithWarning(
          'No active han-solo session for this branch.',
          'Consider using /hansolo:launch to track your workflow.'
        );
      }

      // Check for common issues
      await this.checkForIssues();

      // All checks passed
      process.exit(0);

    } catch (error) {
      console.error(chalk.red('Pre-commit hook error:'), error);
      process.exit(1);
    }
  }

  private isProtectedBranch(branch: string): boolean {
    const protectedBranches = ['main', 'master', 'develop', 'production'];
    return protectedBranches.includes(branch);
  }

  private isLocalBranch(branch: string): boolean {
    // Branches without prefixes are considered local/experimental
    return !branch.includes('/');
  }

  private async checkForIssues(): Promise<void> {
    const status = await this.gitOps.getStatus();

    // Check for large files
    const largeFiles = status.staged.filter(file => {
      // This is a placeholder - in a real implementation,
      // you'd check actual file sizes
      return file.includes('.zip') ||
             file.includes('.tar') ||
             file.includes('.exe');
    });

    if (largeFiles.length > 0) {
      this.exitWithWarning(
        'Large files detected in commit:',
        largeFiles.join(', ')
      );
    }

    // Check for sensitive files
    const sensitivePatterns = [
      '.env',
      'secrets',
      'credentials',
      'password',
      'token',
      'key',
      '.pem',
      '.pfx',
    ];

    const sensitiveFiles = status.staged.filter(file => {
      const lowerFile = file.toLowerCase();
      return sensitivePatterns.some(pattern => lowerFile.includes(pattern));
    });

    if (sensitiveFiles.length > 0) {
      this.exitWithError(
        'Potentially sensitive files detected:',
        sensitiveFiles.join(', '),
        'Remove sensitive data before committing.'
      );
    }

    // Check for merge conflict markers
    for (const file of status.staged) {
      if (await this.hasConflictMarkers(file)) {
        this.exitWithError(
          `Merge conflict markers found in ${file}`,
          'Resolve all conflicts before committing.'
        );
      }
    }
  }

  private async hasConflictMarkers(file: string): Promise<boolean> {
    try {
      const fs = await import('fs/promises');
      const content = await fs.readFile(file, 'utf-8');

      return content.includes('<<<<<<<') ||
             content.includes('>>>>>>>') ||
             content.includes('=======');
    } catch {
      return false;
    }
  }

  private exitWithError(...messages: string[]): void {
    console.log();
    console.log(chalk.red.bold('❌ Commit blocked by han-solo'));
    console.log();
    messages.forEach(msg => console.log(chalk.red(`  ${msg}`)));
    console.log();
    process.exit(1);
  }

  private exitWithWarning(...messages: string[]): void {
    console.log();
    console.log(chalk.yellow.bold('⚠️ han-solo warning'));
    console.log();
    messages.forEach(msg => console.log(chalk.yellow(`  ${msg}`)));
    console.log();

    // Warnings don't block commits, but give user a chance to cancel
    console.log(chalk.gray('  Press Ctrl+C to cancel, or wait 3 seconds to continue...'));

    setTimeout(() => {
      process.exit(0);
    }, 3000);
  }
}

// Run the hook if executed directly
if (require.main === module) {
  const hook = new PreCommitHook();
  hook.run().catch(error => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  });
}

export { PreCommitHook };