import { ConsoleOutput } from '../ui/console-output';
import { SessionRepository } from '../services/session-repository';
import { ConfigurationManager } from '../services/configuration-manager';
import { PreFlightChecks, CheckResult } from '../services/validation/pre-flight-checks';
import { AsciiArt } from '../ui/ascii-art';
import chalk from 'chalk';

/**
 * Pre-flight checks for sessions command
 */
class SessionsPreFlightChecks extends PreFlightChecks {
  constructor(
    private configManager: ConfigurationManager
  ) {
    super();
    this.setupChecks();
  }

  private setupChecks(): void {
    this.addCheck(async () => this.checkHansoloInitialized());
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

export class SessionsCommandV2 {
  private output = new ConsoleOutput();
  private sessionRepo: SessionRepository;
  private configManager: ConfigurationManager;

  constructor(basePath: string = '.hansolo') {
    this.sessionRepo = new SessionRepository(basePath);
    this.configManager = new ConfigurationManager(basePath);
  }

  async execute(options: {
    all?: boolean;
    verbose?: boolean;
    cleanup?: boolean;
  } = {}): Promise<void> {
    try {
      // Run pre-flight checks
      const preFlightChecks = new SessionsPreFlightChecks(
        this.configManager
      );

      const preFlightPassed = await preFlightChecks.runChecks({
        command: 'sessions',
        options,
      });

      if (!preFlightPassed) {
        this.output.errorMessage('\n❌ Cannot list sessions');
        return;
      }

      // Display ASCII art banner
      console.log(AsciiArt.sessions());

      // Cleanup if requested
      if (options.cleanup) {
        const cleaned = await this.sessionRepo.cleanupExpiredSessions();
        this.output.successMessage(`Cleaned up ${cleaned} expired session(s)`);
        this.output.info('');
      }

      // Get sessions
      const sessions = await this.sessionRepo.listSessions({ all: options.all });

      if (sessions.length === 0) {
        this.output.info('No active sessions found');
        this.output.infoMessage('💡 Start a new session with /hansolo:launch');
        return;
      }

      // Show sessions
      this.output.subheader(`📋 Sessions (${sessions.length} total)`);
      this.output.info('');

      for (const session of sessions) {
        const isActive = session.isActive();
        const isExpired = session.isExpired();

        const statusIcon = isActive ? chalk.green('●') : chalk.gray('○');
        const branchName = chalk.cyan(session.branchName);
        const state = isActive ? chalk.yellow(session.currentState) : chalk.dim(session.currentState);

        this.output.info(`${statusIcon} ${branchName} - ${state}`);

        if (options.verbose) {
          this.output.dim(`  ID: ${session.id}`);
          this.output.dim(`  Type: ${session.workflowType}`);
          this.output.dim(`  Updated: ${new Date(session.updatedAt).toLocaleString()}`);

          if (isExpired) {
            this.output.dim(`  ${chalk.red('⚠️  Expired')}`);
          }

          if (session.metadata.pr?.number) {
            this.output.dim(`  PR: #${session.metadata.pr.number}`);
          }

          this.output.info('');
        }
      }

      if (!options.verbose) {
        this.output.info('');
        this.output.dim('💡 Use --verbose for more details');
      }

      // Show summary
      const activeSessions = sessions.filter(s => s.isActive());
      const completedSessions = sessions.filter(s => s.currentState === 'COMPLETE');
      const abortedSessions = sessions.filter(s => s.currentState === 'ABORTED');

      this.output.info('');
      this.output.subheader('📊 Summary');
      this.output.info(`  Active: ${chalk.green(activeSessions.length)}`);
      this.output.info(`  Completed: ${chalk.blue(completedSessions.length)}`);
      this.output.info(`  Aborted: ${chalk.red(abortedSessions.length)}`);
      this.output.info('');

    } catch (error) {
      this.output.errorMessage(`Sessions failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }
}
