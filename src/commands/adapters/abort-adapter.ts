import { AbortCommandV2 } from '../hansolo-abort-v2';
import { SessionRepository } from '../../services/session-repository';
import { ConsoleOutput } from '../../ui/console-output';
import readline from 'readline';

/**
 * Adapter that wraps AbortCommandV2 to provide v1 API compatibility
 */
export class AbortCommand {
  private v2Command: AbortCommandV2;
  private sessionRepo: SessionRepository;
  private output: ConsoleOutput;

  constructor(basePath: string = '.hansolo') {
    this.v2Command = new AbortCommandV2(basePath);
    this.sessionRepo = new SessionRepository(basePath);
    this.output = new ConsoleOutput();
  }

  /**
   * Main execute method - Maps v1 options to v2
   */
  async execute(options: {
    branchName?: string;
    force?: boolean;
    deleteBranch?: boolean;
    yes?: boolean;
  } = {}): Promise<void> {
    return this.v2Command.execute(options);
  }

  /**
   * V1 abortAll method - not in v2, so we implement it here
   * This is one of the missing methods that blocked v2 replacement
   */
  async abortAll(options: { force?: boolean; yes?: boolean } = {}): Promise<void> {
    this.output.header('❌ Aborting All Workflows');

    const sessions = await this.sessionRepo.listSessions(false);
    const activeSessions = sessions.filter(s => s.isActive());

    if (activeSessions.length === 0) {
      this.output.dim('No active sessions to abort');
      return;
    }

    this.output.warningMessage(`This will abort ${activeSessions.length} active workflow(s)`);

    if (!options.yes) {
      const confirmed = await this.confirmAction('Are you sure you want to abort ALL workflows?', true);
      if (!confirmed) {
        this.output.infoMessage('Abort cancelled');
        return;
      }
    }

    let aborted = 0;
    for (const session of activeSessions) {
      try {
        await this.execute({
          branchName: session.branchName,
          force: options.force,
          yes: true,
        });
        aborted++;
      } catch (error) {
        this.output.errorMessage(
          `Failed to abort '${session.branchName}': ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    this.output.successMessage(`Aborted ${aborted} workflow(s)`);
  }

  private async confirmAction(message: string, ask: boolean = true): Promise<boolean> {
    if (!ask) {
      return true;
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise(resolve => {
      rl.question(`${message} (y/n): `, answer => {
        rl.close();
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      });
    });
  }
}
