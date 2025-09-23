#!/usr/bin/env node

import { GitOperations } from '../services/git-operations';
import { SessionRepository } from '../services/session-repository';
import { AuditLogger } from '../services/audit-logger';
import chalk from 'chalk';

/**
 * han-solo post-merge hook
 * Performs cleanup operations after successful merge
 */
class PostMergeHook {
  private gitOps: GitOperations;
  private sessionRepo: SessionRepository;
  private auditLogger: AuditLogger;

  constructor() {
    this.gitOps = new GitOperations();
    this.sessionRepo = new SessionRepository();
    this.auditLogger = new AuditLogger();
  }

  async run(): Promise<void> {
    try {
      console.log(chalk.blue('🧹 Running post-merge cleanup...'));

      // Get current branch
      const branch = await this.gitOps.getCurrentBranch();

      // Check if this was a squash merge
      const isSquashMerge = await this.detectSquashMerge();

      // Log the merge event
      await this.auditLogger.log({
        action: 'POST_MERGE',
        details: {
          command: 'git merge',
          branch,
          isSquashMerge,
        },
        result: 'success',
      });

      // If on main/master, perform post-merge cleanup
      if (this.isMainBranch(branch)) {
        await this.cleanupAfterMerge();
      }

      // If there was an active session, update or complete it
      await this.updateSessionState(branch);

      // Check for outdated dependencies
      await this.checkDependencies();

      // Notify about branch cleanup opportunities
      await this.suggestBranchCleanup();

      console.log(chalk.green('✅ Post-merge cleanup complete'));
      process.exit(0);

    } catch (error) {
      console.error(chalk.red('Post-merge hook error:'), error);
      // Don't block on post-merge errors
      process.exit(0);
    }
  }

  private async detectSquashMerge(): Promise<boolean> {
    try {
      // Check if the last commit looks like a squash merge
      const lastCommit = await this.gitOps.getLastCommit();

      // Squash merges often have PR numbers in the message
      return lastCommit.message.includes('#') ||
             lastCommit.message.includes('Merge pull request') ||
             lastCommit.message.includes('Squashed commit');
    } catch {
      return false;
    }
  }

  private async cleanupAfterMerge(): Promise<void> {
    console.log(chalk.gray('  Cleaning up after merge to main...'));

    // Find merged branches that can be deleted
    const branches = await this.gitOps.listBranches();
    const mergedBranches: string[] = [];

    for (const branch of branches) {
      if (this.isProtectedBranch(branch)) continue;

      try {
        const isMerged = await this.gitOps.isBranchMerged(branch);
        if (isMerged) {
          mergedBranches.push(branch);
        }
      } catch {
        // Ignore errors checking individual branches
      }
    }

    if (mergedBranches.length > 0) {
      console.log(chalk.yellow(`\n  Found ${mergedBranches.length} merged branch(es) that can be deleted:`));
      mergedBranches.forEach(branch => {
        console.log(chalk.gray(`    - ${branch}`));
      });
      console.log(chalk.gray('\n  Run /hansolo:cleanup to remove them\n'));
    }

    // Clean up completed sessions
    const sessions = await this.sessionRepo.listSessions();
    const completedSessions = sessions.filter(s =>
      s.currentState === 'COMPLETE' &&
      mergedBranches.includes(s.branchName)
    );

    for (const session of completedSessions) {
      await this.sessionRepo.updateSessionState(session.id, 'ARCHIVED');
      console.log(chalk.gray(`  Archived session: ${session.id.substring(0, 8)}`));
    }
  }

  private async updateSessionState(branch: string): Promise<void> {
    try {
      const session = await this.sessionRepo.getSessionByBranch(branch);

      if (!session) return;

      // If we're on main and just merged, the workflow is complete
      if (this.isMainBranch(branch)) {
        if (session.currentState === 'MERGING') {
          await this.sessionRepo.updateSessionState(session.id, 'COMPLETE');
          console.log(chalk.green(`  ✅ Workflow ${session.id.substring(0, 8)} completed`));
        }
      } else {
        // If we merged into a feature branch, update state
        if (session.currentState === 'REBASING') {
          await this.sessionRepo.updateSessionState(session.id, 'BRANCH_READY');
          console.log(chalk.blue(`  Updated session state to BRANCH_READY`));
        }
      }
    } catch {
      // Ignore errors updating session
    }
  }

  private async checkDependencies(): Promise<void> {
    try {
      const fs = await import('fs/promises');

      // Check if package.json was modified
      const mergedFiles = await this.getMergedFiles();
      const packageJsonModified = mergedFiles.some(f =>
        f.includes('package.json') || f.includes('package-lock.json')
      );

      if (packageJsonModified) {
        console.log(chalk.yellow('\n  ⚠️ package.json was modified in this merge'));
        console.log(chalk.gray('     Run "npm install" to update dependencies\n'));
      }

      // Check for migration files
      const hasMigrations = mergedFiles.some(f =>
        f.includes('migrations/') || f.includes('migrate')
      );

      if (hasMigrations) {
        console.log(chalk.yellow('\n  ⚠️ Database migrations detected'));
        console.log(chalk.gray('     Remember to run migrations\n'));
      }

      // Check for config changes
      const hasConfigChanges = mergedFiles.some(f =>
        f.includes('config/') ||
        f.includes('.env') ||
        f.includes('hansolo.yaml')
      );

      if (hasConfigChanges) {
        console.log(chalk.yellow('\n  ⚠️ Configuration changes detected'));
        console.log(chalk.gray('     Review and update your local configuration\n'));
      }
    } catch {
      // Ignore dependency check errors
    }
  }

  private async getMergedFiles(): Promise<string[]> {
    try {
      // Get files changed in the last commit (the merge)
      return await this.gitOps.getFilesInCommit('HEAD');
    } catch {
      return [];
    }
  }

  private async suggestBranchCleanup(): Promise<void> {
    try {
      // Count local branches
      const localBranches = await this.gitOps.listBranches();
      const featureBranches = localBranches.filter(b =>
        !this.isProtectedBranch(b)
      );

      if (featureBranches.length > 10) {
        console.log(chalk.yellow(`\n  💡 You have ${featureBranches.length} feature branches`));
        console.log(chalk.gray('     Consider running /hansolo:cleanup to remove old branches\n'));
      }

      // Check for stale sessions
      const sessions = await this.sessionRepo.listSessions();
      const staleThreshold = new Date();
      staleThreshold.setDate(staleThreshold.getDate() - 7);

      const staleSessions = sessions.filter(s => {
        const updated = new Date(s.updatedAt);
        return updated < staleThreshold &&
               s.currentState !== 'COMPLETE';
      });

      if (staleSessions.length > 0) {
        console.log(chalk.yellow(`\n  💡 You have ${staleSessions.length} stale session(s)`));
        console.log(chalk.gray('     Run /hansolo:sessions to review them\n'));
      }
    } catch {
      // Ignore cleanup suggestion errors
    }
  }

  private isMainBranch(branch: string): boolean {
    return branch === 'main' || branch === 'master';
  }

  private isProtectedBranch(branch: string): boolean {
    const protected = ['main', 'master', 'develop', 'production', 'staging'];
    return protected.includes(branch);
  }
}

// Run the hook if executed directly
if (require.main === module) {
  const hook = new PostMergeHook();
  hook.run().catch(error => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(0); // Don't block on post-merge errors
  });
}

export { PostMergeHook };