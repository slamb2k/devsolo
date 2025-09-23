import { CommandHandler } from './types';
import { SessionRepository } from '../services/session-repository';
import { GitOperations } from '../services/git-operations';
import { ConsoleOutput } from '../ui/console-output';
import { TableFormatter } from '../ui/table-formatter';
import { BoxFormatter } from '../ui/box-formatter';
import { WorkflowSession } from '../models/workflow-session';
import chalk from 'chalk';

export class HansoloStatusCommand implements CommandHandler {
  name = 'hansolo:status';
  description = 'Show comprehensive workflow status';

  private sessionRepo: SessionRepository;
  private gitOps: GitOperations;
  private console: ConsoleOutput;
  private table: TableFormatter;
  private box: BoxFormatter;

  constructor() {
    this.sessionRepo = new SessionRepository();
    this.gitOps = new GitOperations();
    this.console = new ConsoleOutput();
    this.table = new TableFormatter();
    this.box = new BoxFormatter();
  }

  async execute(args: string[]): Promise<void> {
    try {
      // Show banner
      this.console.printBanner('📊 han-solo Status');

      // Get current branch and session
      const currentBranch = await this.gitOps.getCurrentBranch();
      const currentSession = await this.sessionRepo.getSessionByBranch(currentBranch);

      // Show current session status
      if (currentSession) {
        await this.showActiveSession(currentSession);
      } else {
        this.console.info(`No active session on branch: ${currentBranch}`);
      }

      // Show Git repository status
      await this.showGitStatus();

      // Show all sessions summary
      await this.showSessionsSummary();

      // Show system health
      await this.showSystemHealth();

    } catch (error) {
      this.console.error('Failed to get status', error as Error);
      throw error;
    }
  }

  private async showActiveSession(session: WorkflowSession): Promise<void> {
    const sessionInfo = [
      ['ID', session.id.substring(0, 8)],
      ['Branch', session.branchName],
      ['Type', session.workflowType],
      ['State', this.formatState(session.currentState)],
      ['Created', new Date(session.createdAt).toLocaleString()],
      ['Expires', new Date(session.expiresAt).toLocaleString()],
    ];

    const content = this.table.formatTable(
      ['Property', 'Value'],
      sessionInfo
    );

    this.box.printBox('Active Session', content);

    // Show state history
    if (session.stateHistory.length > 0) {
      this.console.info('\nState History:');
      session.stateHistory.slice(-5).forEach(transition => {
        this.console.log(
          `  ${chalk.gray(new Date(transition.timestamp).toLocaleTimeString())} ` +
          `${transition.from} → ${chalk.green(transition.to)}`
        );
      });
    }
  }

  private async showGitStatus(): Promise<void> {
    const status = await this.gitOps.getStatus();
    const branch = await this.gitOps.getCurrentBranch();
    const ahead = await this.gitOps.getAheadBehindCount();
    const hasRemote = await this.gitOps.hasRemote();

    const gitInfo = [
      ['Current Branch', branch],
      ['Tracking', hasRemote ? 'Remote configured' : 'Local only'],
      ['Ahead/Behind', `↑${ahead.ahead} ↓${ahead.behind}`],
      ['Working Tree', status.isClean ? '✅ Clean' : '⚠️ Modified'],
      ['Staged Files', status.staged.length.toString()],
      ['Modified Files', status.modified.length.toString()],
      ['Untracked Files', status.untracked.length.toString()],
    ];

    const content = this.table.formatTable(
      ['Property', 'Value'],
      gitInfo
    );

    this.box.printBox('Git Repository Status', content);

    // Show file details if working tree is dirty
    if (!status.isClean) {
      if (status.staged.length > 0) {
        this.console.info('\nStaged files:');
        status.staged.forEach(file => this.console.log(`  ${chalk.green('+')} ${file}`));
      }
      if (status.modified.length > 0) {
        this.console.info('\nModified files:');
        status.modified.forEach(file => this.console.log(`  ${chalk.yellow('M')} ${file}`));
      }
      if (status.untracked.length > 0) {
        this.console.info('\nUntracked files:');
        status.untracked.forEach(file => this.console.log(`  ${chalk.gray('?')} ${file}`));
      }
    }
  }

  private async showSessionsSummary(): Promise<void> {
    const sessions = await this.sessionRepo.listSessions();

    if (sessions.length === 0) {
      return;
    }

    const sessionsByType = {
      launch: sessions.filter(s => s.workflowType === 'launch'),
      ship: sessions.filter(s => s.workflowType === 'ship'),
      hotfix: sessions.filter(s => s.workflowType === 'hotfix'),
    };

    const summaryData = [
      ['Total Sessions', sessions.length.toString()],
      ['Launch Workflows', sessionsByType.launch.length.toString()],
      ['Ship Workflows', sessionsByType.ship.length.toString()],
      ['Hotfix Workflows', sessionsByType.hotfix.length.toString()],
    ];

    const content = this.table.formatTable(
      ['Metric', 'Count'],
      summaryData
    );

    this.box.printBox('Sessions Summary', content);
  }

  private async showSystemHealth(): Promise<void> {
    const config = await this.sessionRepo.loadConfiguration();
    const hooksInstalled = await this.checkHooksInstalled();
    const templatesAvailable = await this.checkTemplatesAvailable();

    const healthData = [
      ['Initialized', config.initialized ? '✅ Yes' : '❌ No'],
      ['Config Version', config.version],
      ['Git Hooks', hooksInstalled ? '✅ Installed' : '⚠️ Not installed'],
      ['Templates', templatesAvailable ? '✅ Available' : '⚠️ Not found'],
      ['MCP Server', config.components.mpcServer ? '✅ Enabled' : '❌ Disabled'],
      ['Status Lines', config.components.statusLines ? '✅ Enabled' : '❌ Disabled'],
    ];

    const content = this.table.formatTable(
      ['Component', 'Status'],
      healthData
    );

    this.box.printBox('System Health', content);
  }

  private formatState(state: string): string {
    const stateColors: Record<string, string> = {
      'INIT': chalk.blue(state),
      'BRANCH_READY': chalk.cyan(state),
      'CHANGES_COMMITTED': chalk.yellow(state),
      'PUSHED': chalk.magenta(state),
      'PR_CREATED': chalk.green(state),
      'WAITING_APPROVAL': chalk.yellow(state),
      'REBASING': chalk.blue(state),
      'MERGING': chalk.magenta(state),
      'COMPLETE': chalk.green(state),
      'ABORTED': chalk.red(state),
    };

    return stateColors[state] || state;
  }

  private async checkHooksInstalled(): Promise<boolean> {
    try {
      const fs = await import('fs/promises');
      await fs.access('.hansolo/hooks/pre-commit');
      return true;
    } catch {
      return false;
    }
  }

  private async checkTemplatesAvailable(): Promise<boolean> {
    try {
      const fs = await import('fs/promises');
      await fs.access('templates/commit-message.txt');
      return true;
    } catch {
      return false;
    }
  }

  validate(args: string[]): boolean {
    // No arguments required for status command
    return true;
  }
}