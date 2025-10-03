import { LaunchCommandV2 } from '../hansolo-launch-v2';
import { SessionRepository } from '../../services/session-repository';
import { GitOperations } from '../../services/git-operations';
import { ConsoleOutput } from '../../ui/console-output';
import { WorkflowProgress } from '../../ui/progress-indicators';
import { WorkflowSession } from '../../models/workflow-session';

/**
 * Adapter that wraps LaunchCommandV2 to provide v1 API compatibility
 */
export class LaunchCommand {
  private v2Command: LaunchCommandV2;
  private sessionRepo: SessionRepository;
  private gitOps: GitOperations;
  private output: ConsoleOutput;
  private progress: WorkflowProgress;

  constructor(basePath: string = '.hansolo') {
    this.v2Command = new LaunchCommandV2(basePath);
    this.sessionRepo = new SessionRepository(basePath);
    this.gitOps = new GitOperations();
    this.output = new ConsoleOutput();
    this.progress = new WorkflowProgress();
  }

  /**
   * Main execute method - Maps v1 options to v2
   */
  async execute(options: {
    description?: string;
    branchName?: string;
    force?: boolean;
    stashRef?: string;
    popStash?: boolean;
  } = {}): Promise<void> {
    return this.v2Command.execute(options);
  }

  /**
   * V1 resume method - not in v2, so we implement it here
   * This is one of the missing methods that blocked v2 replacement
   */
  async resume(branchName?: string): Promise<void> {
    this.output.header('📂 Resuming Workflow');

    try {
      // Find session
      let session: WorkflowSession | null = null;

      if (branchName) {
        session = await this.sessionRepo.getSessionByBranch(branchName);
      } else {
        const currentBranch = await this.gitOps.getCurrentBranch();
        session = await this.sessionRepo.getSessionByBranch(currentBranch);
      }

      if (!session) {
        this.output.errorMessage('No workflow session found');
        this.output.infoMessage('Use "hansolo launch" to start a new workflow');
        return;
      }

      if (!session.canResume()) {
        if (session.isExpired()) {
          this.output.errorMessage('Session has expired');
        } else {
          this.output.errorMessage('Session is not resumable');
        }
        return;
      }

      // Switch to branch if needed
      const currentBranch = await this.gitOps.getCurrentBranch();
      if (currentBranch !== session.branchName) {
        await this.progress.gitOperation('checkout', async () => {
          await this.gitOps.checkoutBranch(session.branchName);
        });
      }

      this.output.successMessage(`Resumed workflow on branch: ${session.branchName}`);
      await this.showStatus(session);
    } catch (error) {
      this.output.errorMessage(
        `Resume failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  private async showStatus(session: WorkflowSession): Promise<void> {
    const gitStatus = await this.gitOps.getBranchStatus();

    const statusData = [
      ['Session ID', session.id.substring(0, 8)],
      ['Branch', session.branchName],
      ['State', session.currentState],
      ['Age', session.getAge()],
      ['Clean', gitStatus.isClean ? '✅' : '❌'],
      ['Ahead', gitStatus.ahead.toString()],
      ['Behind', gitStatus.behind.toString()],
    ];

    this.output.table(['Property', 'Value'], statusData);

    // Show next action
    const nextActions: string[] = [];
    switch (session.currentState) {
    case 'BRANCH_READY':
      nextActions.push('ship - Commit, push, create PR, and merge automatically');
      break;
    case 'CHANGES_COMMITTED':
      nextActions.push('ship - Push, create PR, and merge automatically');
      break;
    case 'PUSHED':
      nextActions.push('ship - Create PR and merge automatically');
      break;
    case 'PR_CREATED':
      nextActions.push('ship - Merge PR and cleanup automatically');
      break;
    }

    if (nextActions.length > 0) {
      this.output.subheader('Available Actions');
      this.output.list(nextActions.map(action => `hansolo ${action}`));
    }
  }
}
