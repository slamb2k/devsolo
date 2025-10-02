import { ConsoleOutput } from '../ui/console-output';
import { SessionRepository } from '../services/session-repository';
import { GitOperations } from '../services/git-operations';
import { ConfigurationManager } from '../services/configuration-manager';
import { PreFlightChecks, CheckResult } from '../services/validation/pre-flight-checks';
import { AsciiArt } from '../ui/ascii-art';
import chalk from 'chalk';

/**
 * Pre-flight checks for status command
 */
class StatusPreFlightChecks extends PreFlightChecks {
  constructor(
    private gitOps: GitOperations,
    private configManager: ConfigurationManager
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
      level: isGit ? 'info' : 'error',
    };
  }

  private async checkHansoloInitialized(): Promise<CheckResult> {
    const isInitialized = await this.configManager.isInitialized();

    return {
      passed: isInitialized,
      name: 'Han-solo initialized',
      level: isInitialized ? 'info' : 'error',
      suggestions: !isInitialized ? ['Run "hansolo init" first'] : undefined,
    };
  }
}

export class StatusCommandV2 {
  private output = new ConsoleOutput();
  private sessionRepo: SessionRepository;
  private gitOps: GitOperations;
  private configManager: ConfigurationManager;

  constructor(basePath: string = '.hansolo') {
    this.sessionRepo = new SessionRepository(basePath);
    this.gitOps = new GitOperations();
    this.configManager = new ConfigurationManager(basePath);
  }

  async execute(options: {
    verbose?: boolean;
  } = {}): Promise<void> {
    try {
      // Run pre-flight checks
      const preFlightChecks = new StatusPreFlightChecks(
        this.gitOps,
        this.configManager
      );

      const preFlightPassed = await preFlightChecks.runChecks({
        command: 'status',
        options,
      });

      if (!preFlightPassed) {
        this.output.errorMessage('\n❌ Cannot show status');
        return;
      }

      // Display ASCII art banner
      this.output.info(AsciiArt.status());

      // Get current branch and session
      const currentBranch = await this.gitOps.getCurrentBranch();
      const session = await this.sessionRepo.getSessionByBranch(currentBranch);

      // Show current status
      this.output.subheader('📍 Current Branch');
      this.output.info(`  Branch: ${chalk.cyan(currentBranch)}`);

      if (session) {
        this.output.info(`  Session: ${chalk.green('Active')}`);
        this.output.info(`  State: ${chalk.yellow(session.currentState)}`);
        this.output.info(`  Type: ${session.workflowType}`);

        if (session.metadata.pr?.number) {
          this.output.info(`  PR: #${session.metadata.pr.number}`);
        }
      } else {
        this.output.info(`  Session: ${chalk.dim('No active session')}`);
      }

      // Git status
      this.output.info('');
      this.output.subheader('📊 Git Status');

      const status = await this.gitOps.getStatus();
      const branchStatus = await this.gitOps.getBranchStatus();

      this.output.info(`  Clean: ${status.isClean() ? chalk.green('✓') : chalk.red('✗')}`);

      if (!status.isClean()) {
        if (status.modified.length > 0) {
          this.output.info(`  Modified: ${status.modified.length} file(s)`);
        }
        if (status.created.length > 0) {
          this.output.info(`  Created: ${status.created.length} file(s)`);
        }
        if (status.deleted.length > 0) {
          this.output.info(`  Deleted: ${status.deleted.length} file(s)`);
        }
      }

      if (branchStatus.hasRemote) {
        this.output.info(`  Ahead: ${branchStatus.ahead} commit(s)`);
        this.output.info(`  Behind: ${branchStatus.behind} commit(s)`);
      }

      // Show verbose details if requested
      if (options.verbose && session) {
        this.output.info('');
        this.output.subheader('📋 Session Details');
        this.output.info(`  ID: ${session.id}`);
        this.output.info(`  Created: ${new Date(session.createdAt).toLocaleString()}`);
        this.output.info(`  Updated: ${new Date(session.updatedAt).toLocaleString()}`);
        this.output.info(`  Expires: ${new Date(session.expiresAt).toLocaleString()}`);

        if (session.stateHistory.length > 0) {
          this.output.info('');
          this.output.dim('  State History:');
          session.stateHistory.slice(-5).forEach(transition => {
            this.output.dim(`    ${transition.from} → ${transition.to} (${transition.trigger})`);
          });
        }
      }

      this.output.info('');

    } catch (error) {
      this.output.errorMessage(`Status failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }
}
