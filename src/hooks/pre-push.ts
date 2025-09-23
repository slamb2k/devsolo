#!/usr/bin/env node

import { GitOperations } from '../services/git-operations';
import { SessionRepository } from '../services/session-repository';
import { ValidationService } from '../services/validation-service';
import chalk from 'chalk';

/**
 * han-solo pre-push hook
 * Validates branch state before pushing to remote
 */
class PrePushHook {
  private gitOps: GitOperations;
  private sessionRepo: SessionRepository;
  private validator: ValidationService;

  constructor() {
    this.gitOps = new GitOperations();
    this.sessionRepo = new SessionRepository();
    this.validator = new ValidationService();
  }

  async run(): Promise<void> {
    try {
      // Get current branch
      const branch = await this.gitOps.getCurrentBranch();

      // Block direct pushes to protected branches
      if (this.isProtectedBranch(branch)) {
        this.exitWithError(
          `Direct pushes to ${branch} branch are not allowed!`,
          'Use /hansolo:ship to merge changes properly.'
        );
      }

      // Check for active session
      const session = await this.sessionRepo.getSessionByBranch(branch);

      if (session) {
        await this.validateSessionState(session);
        await this.validateBranchState(branch, session);
      } else {
        // Warn if no session
        this.printWarning(
          'No active han-solo session for this branch.',
          'Consider using /hansolo:launch to track your workflow.'
        );
      }

      // Check if branch is up to date with main
      await this.checkBranchFreshness(branch);

      // Validate commit messages
      await this.validateCommitMessages(branch);

      // Run tests if configured
      await this.runPrePushTests();

      // All checks passed
      console.log(chalk.green('✅ Pre-push validation passed'));
      process.exit(0);

    } catch (error) {
      console.error(chalk.red('Pre-push hook error:'), error);
      process.exit(1);
    }
  }

  private async validateSessionState(session: any): Promise<void> {
    // Check if session state allows pushing
    const pushAllowedStates = [
      'CHANGES_COMMITTED',
      'PUSHED',
      'PR_CREATED',
      'WAITING_APPROVAL',
      'HOTFIX_COMMITTED',
      'HOTFIX_PUSHED'
    ];

    if (!pushAllowedStates.includes(session.currentState)) {
      this.exitWithError(
        `Current workflow state (${session.currentState}) doesn't expect push.`,
        'Complete pending steps or use /hansolo:ship to progress.'
      );
    }

    // Validate session integrity
    const isValid = await this.validator.validateSession(session);
    if (!isValid) {
      this.exitWithError(
        'Session validation failed.',
        'Run /hansolo:validate to diagnose issues.'
      );
    }
  }

  private async validateBranchState(branch: string, session: any): Promise<void> {
    // Ensure branch matches session
    if (branch !== session.branchName) {
      this.exitWithError(
        'Branch name mismatch with session.',
        `Expected: ${session.branchName}`,
        `Actual: ${branch}`
      );
    }

    // Check for uncommitted changes
    const status = await this.gitOps.getStatus();
    if (!status.isClean) {
      this.exitWithError(
        'Uncommitted changes detected.',
        'Commit or stash changes before pushing.'
      );
    }
  }

  private async checkBranchFreshness(branch: string): Promise<void> {
    try {
      // Get commits behind main
      const behind = await this.gitOps.getCommitsBehindMain(branch);

      if (behind > 0) {
        const mainBranch = await this.gitOps.getMainBranch();

        if (behind > 10) {
          this.exitWithError(
            `Branch is ${behind} commits behind ${mainBranch}.`,
            'Rebase on latest main before pushing:',
            `  git rebase ${mainBranch}`
          );
        } else if (behind > 5) {
          this.printWarning(
            `Branch is ${behind} commits behind ${mainBranch}.`,
            'Consider rebasing to avoid conflicts.'
          );
        }
      }
    } catch {
      // Ignore errors if can't determine freshness
    }
  }

  private async validateCommitMessages(branch: string): Promise<void> {
    try {
      // Get commits not in main
      const mainBranch = await this.gitOps.getMainBranch();
      const commits = await this.gitOps.getCommitsSince(mainBranch);

      // Check commit message format
      const conventionalPattern = /^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?: .+/;
      const invalidCommits: string[] = [];

      for (const commit of commits) {
        const firstLine = commit.message.split('\n')[0];

        // Check length
        if (firstLine.length > 72) {
          invalidCommits.push(`Too long (${firstLine.length} chars): ${firstLine.substring(0, 50)}...`);
        }

        // Check format (optional)
        const config = await this.sessionRepo.loadConfiguration();
        if (config.preferences?.enforceConventionalCommits) {
          if (!conventionalPattern.test(firstLine)) {
            invalidCommits.push(`Invalid format: ${firstLine}`);
          }
        }

        // Check for WIP commits
        if (firstLine.toLowerCase().includes('wip') ||
            firstLine.toLowerCase().includes('work in progress')) {
          this.printWarning(
            'WIP commit detected:',
            firstLine,
            'Consider squashing commits before merging.'
          );
        }
      }

      if (invalidCommits.length > 0) {
        this.exitWithError(
          'Invalid commit messages detected:',
          ...invalidCommits,
          '',
          'Fix with: git rebase -i'
        );
      }
    } catch {
      // Ignore errors in commit validation
    }
  }

  private async runPrePushTests(): Promise<void> {
    const config = await this.sessionRepo.loadConfiguration();

    if (!config.preferences?.runTestsOnPush) {
      return;
    }

    console.log(chalk.blue('🧪 Running pre-push tests...'));

    try {
      // Check for test command in package.json
      const packageJson = await import('../../package.json');
      const testCommand = packageJson.scripts?.test;

      if (testCommand) {
        const { execSync } = await import('child_process');
        execSync('npm test', { stdio: 'inherit' });
      }
    } catch (error) {
      this.exitWithError(
        'Tests failed!',
        'Fix failing tests before pushing.',
        `Error: ${error}`
      );
    }
  }

  private isProtectedBranch(branch: string): boolean {
    const protected = ['main', 'master', 'develop', 'production'];
    return protected.includes(branch);
  }

  private exitWithError(...messages: string[]): void {
    console.log();
    console.log(chalk.red.bold('❌ Push blocked by han-solo'));
    console.log();
    messages.forEach(msg => {
      if (msg) console.log(chalk.red(`  ${msg}`));
    });
    console.log();
    process.exit(1);
  }

  private printWarning(...messages: string[]): void {
    console.log();
    console.log(chalk.yellow.bold('⚠️ han-solo warning'));
    messages.forEach(msg => console.log(chalk.yellow(`  ${msg}`)));
    console.log();
  }
}

// Run the hook if executed directly
if (require.main === module) {
  const hook = new PrePushHook();
  hook.run().catch(error => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  });
}

export { PrePushHook };