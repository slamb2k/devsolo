import { ConsoleOutput } from '../ui/console-output';
import { SessionRepository } from '../services/session-repository';
import { GitOperations } from '../services/git-operations';
import { ConfigurationManager } from '../services/configuration-manager';
import { WorkflowSession } from '../models/workflow-session';

export class SessionsCommand {
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
    all?: boolean;
    verbose?: boolean;
    cleanup?: boolean;
  } = {}): Promise<void> {
    this.output.header('📋 Workflow Sessions');

    try {
      // Check initialization
      if (!await this.configManager.isInitialized()) {
        this.output.errorMessage('han-solo is not initialized');
        this.output.infoMessage('Run "hansolo init" first');
        return;
      }

      // Get current branch for comparison
      const currentBranch = await this.gitOps.getCurrentBranch();

      // Clean up expired sessions if requested
      if (options.cleanup) {
        const cleaned = await this.sessionRepo.cleanupExpiredSessions();
        if (cleaned > 0) {
          this.output.successMessage(`Cleaned up ${cleaned} expired session(s)`);
        }
      }

      // Get sessions
      const sessions = await this.sessionRepo.listSessions(options.all);

      if (sessions.length === 0) {
        this.output.dim('No active sessions found');
        this.output.infoMessage('Use "hansolo launch" to start a new workflow');
        return;
      }

      // Group sessions by status
      const activeSessions = sessions.filter(s => s.isActive());
      const completedSessions = sessions.filter(s => !s.isActive() && s.currentState === 'COMPLETE');
      const abortedSessions = sessions.filter(s => s.currentState === 'ABORTED');

      // Display summary
      this.output.subheader('Summary');
      const summaryData = [
        ['Total Sessions', sessions.length.toString()],
        ['Active', activeSessions.length.toString()],
        ['Completed', completedSessions.length.toString()],
        ['Aborted', abortedSessions.length.toString()],
      ];
      this.output.table(['Status', 'Count'], summaryData);

      // Display active sessions
      if (activeSessions.length > 0) {
        this.output.subheader('Active Sessions');

        if (options.verbose) {
          // Detailed view
          for (const session of activeSessions) {
            await this.displayDetailedSession(session, currentBranch);
          }
        } else {
          // Table view
          await this.displaySessionTable(activeSessions, currentBranch);
        }
      }

      // Display completed sessions if --all flag is used
      if (options.all && completedSessions.length > 0) {
        this.output.subheader('Completed Sessions');
        await this.displaySessionTable(completedSessions, currentBranch);
      }

      // Display aborted sessions if --all flag is used
      if (options.all && abortedSessions.length > 0) {
        this.output.subheader('Aborted Sessions');
        await this.displaySessionTable(abortedSessions, currentBranch);
      }

      // Show tips
      this.output.newline();
      this.output.dim('Tips:');
      this.output.dim('• Use "hansolo swap <branch>" to switch between sessions');
      this.output.dim('• Use "hansolo resume" to continue current branch workflow');
      this.output.dim('• Use "hansolo abort" to cancel an active session');

    } catch (error) {
      this.output.errorMessage(`Failed to list sessions: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  private async displaySessionTable(sessions: WorkflowSession[], currentBranch: string): Promise<void> {
    const headers = ['ID', 'Branch', 'Type', 'State', 'Age', 'Current'];

    const rows = await Promise.all(sessions.map(async session => {
      const isCurrent = session.branchName === currentBranch;

      return [
        session.id.substring(0, 8),
        this.output.formatBranch(session.branchName),
        session.workflowType,
        this.output.formatState(session.currentState),
        session.getAge(),
        isCurrent ? '✅' : '',
      ];
    }));

    this.output.table(headers, rows);
  }

  private async displayDetailedSession(session: WorkflowSession, currentBranch: string): Promise<void> {
    const isCurrent = session.branchName === currentBranch;
    const branchStatus = await this.getBranchStatus(session.branchName);

    this.output.box(
      `Session: ${session.id}\n` +
      `Branch: ${session.branchName} ${isCurrent ? '(current)' : ''}\n` +
      `Type: ${session.workflowType}\n` +
      `State: ${session.currentState}\n` +
      `Created: ${new Date(session.createdAt).toLocaleString()}\n` +
      `Updated: ${new Date(session.updatedAt).toLocaleString()}\n` +
      `Age: ${session.getAge()}\n` +
      `Expires: ${session.getTimeRemaining()}\n` +
      `\nGit Status:\n` +
      `  Ahead: ${branchStatus.ahead}\n` +
      `  Behind: ${branchStatus.behind}\n` +
      `  Clean: ${branchStatus.isClean ? '✅' : '❌'}\n` +
      `  Remote: ${branchStatus.hasRemote ? '✅' : '❌'}\n` +
      `\nState History: ${session.stateHistory.length} transition(s)\n` +
      session.stateHistory.map(t =>
        `  • ${t.from} → ${t.to} (${new Date(t.timestamp).toLocaleTimeString()})`
      ).join('\n'),
      session.branchName
    );
  }

  private async getBranchStatus(branchName: string): Promise<{
    ahead: number;
    behind: number;
    isClean: boolean;
    hasRemote: boolean;
  }> {
    try {
      return await this.gitOps.getBranchStatus(branchName);
    } catch {
      // Branch might not exist anymore
      return {
        ahead: 0,
        behind: 0,
        isClean: true,
        hasRemote: false,
      };
    }
  }

  async getActiveCount(): Promise<number> {
    const sessions = await this.sessionRepo.listSessions(false);
    return sessions.filter(s => s.isActive()).length;
  }

  async getCurrentSession(): Promise<WorkflowSession | null> {
    const currentBranch = await this.gitOps.getCurrentBranch();
    return await this.sessionRepo.getSessionByBranch(currentBranch);
  }

  async listBranchesWithSessions(): Promise<string[]> {
    const sessions = await this.sessionRepo.listSessions(false);
    return sessions
      .filter(s => s.isActive())
      .map(s => s.branchName);
  }
}