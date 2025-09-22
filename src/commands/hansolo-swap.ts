import { ConsoleOutput } from '../ui/console-output';
import { WorkflowProgress } from '../ui/progress-indicators';
import { SessionRepository } from '../services/session-repository';
import { GitOperations } from '../services/git-operations';
import { ConfigurationManager } from '../services/configuration-manager';
import { WorkflowSession } from '../models/workflow-session';

export class SwapCommand {
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

  async execute(branchName?: string, options: {
    force?: boolean;
    stash?: boolean;
  } = {}): Promise<void> {
    this.output.header('🔄 Swapping Workflow Session');

    try {
      // Check initialization
      if (!await this.configManager.isInitialized()) {
        this.output.errorMessage('han-solo is not initialized');
        this.output.infoMessage('Run "hansolo init" first');
        return;
      }

      // Get current branch
      const currentBranch = await this.gitOps.getCurrentBranch();
      const currentSession = await this.sessionRepo.getSessionByBranch(currentBranch);

      // If no branch specified, show available sessions to swap to
      if (!branchName) {
        await this.showAvailableSessions(currentBranch);
        return;
      }

      // Check if trying to swap to current branch
      if (branchName === currentBranch) {
        this.output.warningMessage(`Already on branch '${branchName}'`);
        return;
      }

      // Find target session
      const targetSession = await this.sessionRepo.getSessionByBranch(branchName);
      if (!targetSession) {
        this.output.errorMessage(`No session found for branch '${branchName}'`);
        this.output.infoMessage('Use "hansolo sessions" to see available sessions');
        return;
      }

      // Check if target session is active
      if (!targetSession.isActive() && !options.force) {
        this.output.errorMessage(`Session on branch '${branchName}' is not active`);
        this.output.infoMessage(`State: ${targetSession.currentState}`);
        this.output.infoMessage('Use --force to swap anyway');
        return;
      }

      // Check for uncommitted changes
      const hasChanges = await this.gitOps.hasUncommittedChanges();
      if (hasChanges) {
        if (options.stash) {
          await this.stashChanges();
        } else if (!options.force) {
          this.output.errorMessage('Uncommitted changes detected');
          this.output.infoMessage('Use --stash to save changes or --force to discard');
          return;
        }
      }

      // Perform the swap
      await this.performSwap(currentBranch, branchName, currentSession, targetSession);

      // Show new status
      await this.showNewStatus(targetSession);

    } catch (error) {
      this.output.errorMessage(`Swap failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  private async showAvailableSessions(currentBranch: string): Promise<void> {
    const sessions = await this.sessionRepo.listSessions(false);
    const activeSessions = sessions.filter(s =>
      s.isActive() && s.branchName !== currentBranch
    );

    if (activeSessions.length === 0) {
      this.output.dim('No other active sessions to swap to');
      this.output.infoMessage('Use "hansolo launch" to create a new workflow');
      return;
    }

    this.output.subheader('Available Sessions to Swap To');

    const headers = ['Branch', 'Type', 'State', 'Age'];
    const rows = activeSessions.map(session => [
      this.output.formatBranch(session.branchName),
      session.workflowType,
      this.output.formatState(session.currentState),
      session.getAge(),
    ]);

    this.output.table(headers, rows);
    this.output.newline();
    this.output.infoMessage('Use "hansolo swap <branch-name>" to switch');
  }

  private async stashChanges(): Promise<void> {
    const stashResult = await this.gitOps.stashChanges('han-solo swap stash');
    this.output.successMessage(`Changes stashed: ${stashResult.stashRef}`);
    this.output.dim('Use "git stash pop" to restore after swapping');
  }

  private async performSwap(
    fromBranch: string,
    toBranch: string,
    fromSession: WorkflowSession | null,
    toSession: WorkflowSession
  ): Promise<void> {
    const steps = [
      {
        name: `Switching from ${fromBranch} to ${toBranch}`,
        action: async () => {
          await this.gitOps.checkoutBranch(toBranch);
        },
      },
    ];

    // If there's a session on the current branch, update its last activity
    if (fromSession) {
      steps.push({
        name: 'Updating session metadata',
        action: async () => {
          fromSession.updatedAt = new Date().toISOString();
          await this.sessionRepo.updateSession(fromSession.id, fromSession);
        },
      });
    }

    // Acquire lock on target session
    steps.push({
      name: 'Acquiring session lock',
      action: async () => {
        const locked = await this.sessionRepo.acquireLock(toSession.id);
        if (!locked) {
          throw new Error('Could not acquire lock on target session');
        }
      },
    });

    await this.progress.runSteps(steps);

    this.output.successMessage(`Swapped to branch '${toBranch}'`);
  }

  private async showNewStatus(session: WorkflowSession): Promise<void> {
    this.output.subheader('Current Session Status');

    const gitStatus = await this.gitOps.getBranchStatus();
    const statusData = [
      ['Session ID', session.id.substring(0, 8)],
      ['Branch', session.branchName],
      ['Type', session.workflowType],
      ['State', session.currentState],
      ['Age', session.getAge()],
      ['Clean', gitStatus.isClean ? '✅' : '❌'],
      ['Ahead', gitStatus.ahead.toString()],
      ['Behind', gitStatus.behind.toString()],
    ];

    this.output.table(['Property', 'Value'], statusData);

    // Show state history if available
    if (session.stateHistory.length > 0) {
      this.output.subheader('Recent Activity');
      const recentTransitions = session.stateHistory.slice(-3);
      recentTransitions.forEach(transition => {
        const time = new Date(transition.timestamp).toLocaleTimeString();
        this.output.dim(`  ${transition.from} → ${transition.to} at ${time}`);
      });
    }

    // Show next recommended action based on state
    this.showRecommendedAction(session);
  }

  private showRecommendedAction(session: WorkflowSession): void {
    this.output.subheader('Recommended Next Step');

    switch (session.currentState) {
    case 'INIT':
    case 'BRANCH_READY':
      this.output.infoMessage('Make your changes and run "hansolo ship" when ready');
      break;
    case 'CHANGES_COMMITTED':
      this.output.infoMessage('Push changes with "hansolo ship --push"');
      break;
    case 'PUSHED':
      this.output.infoMessage('Create PR with "hansolo ship --create-pr"');
      break;
    case 'PR_CREATED':
      this.output.infoMessage('Wait for PR approval or run "hansolo ship --merge"');
      break;
    case 'WAITING_APPROVAL':
      this.output.infoMessage('PR is waiting for approval');
      break;
    case 'COMPLETE':
      this.output.successMessage('Workflow is complete!');
      break;
    case 'ABORTED':
      this.output.warningMessage('This workflow was aborted');
      break;
    default:
      this.output.infoMessage('Continue with your workflow');
    }
  }

  async listSwappableSessions(): Promise<string[]> {
    const sessions = await this.sessionRepo.listSessions(false);
    const currentBranch = await this.gitOps.getCurrentBranch();

    return sessions
      .filter(s => s.isActive() && s.branchName !== currentBranch)
      .map(s => s.branchName);
  }

  async quickSwap(index: number): Promise<void> {
    const swappable = await this.listSwappableSessions();

    if (index < 1 || index > swappable.length) {
      this.output.errorMessage(`Invalid session index: ${index}`);
      this.output.infoMessage(`Valid range: 1-${swappable.length}`);
      return;
    }

    const targetBranch = swappable[index - 1];
    await this.execute(targetBranch, { stash: true });
  }
}