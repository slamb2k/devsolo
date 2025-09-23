import { CommandHandler } from './types';
import { SessionRepository } from '../services/session-repository';
import { GitOperations } from '../services/git-operations';
import { ConsoleOutput } from '../ui/console-output';
import { BoxFormatter } from '../ui/box-formatter';
import chalk from 'chalk';

export class HansoloStatusLineCommand implements CommandHandler {
  name = 'hansolo:status-line';
  description = 'Manage terminal status line display';

  private sessionRepo: SessionRepository;
  private gitOps: GitOperations;
  private console: ConsoleOutput;
  private box: BoxFormatter;
  private statusLineInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.sessionRepo = new SessionRepository();
    this.gitOps = new GitOperations();
    this.console = new ConsoleOutput();
    this.box = new BoxFormatter();
  }

  async execute(args: string[]): Promise<void> {
    try {
      const action = args[0] || 'show';

      switch (action) {
        case 'show':
          await this.showStatusLine();
          break;
        case 'enable':
          await this.enableStatusLine();
          break;
        case 'disable':
          await this.disableStatusLine();
          break;
        case 'format':
          await this.configureFormat(args.slice(1));
          break;
        case 'watch':
          await this.watchStatusLine();
          break;
        case 'test':
          await this.testStatusLine();
          break;
        default:
          this.console.error(`Unknown action: ${action}`);
          this.console.info('Available actions: show, enable, disable, format, watch, test');
      }

    } catch (error) {
      this.console.error('Status line operation failed', error as Error);
      throw error;
    }
  }

  private async showStatusLine(): Promise<void> {
    const statusLine = await this.generateStatusLine();
    this.console.log(statusLine);
  }

  private async enableStatusLine(): Promise<void> {
    const config = await this.sessionRepo.loadConfiguration();
    config.components.statusLines = true;
    await this.sessionRepo.saveConfiguration(config);

    // Set up shell integration
    await this.setupShellIntegration();

    this.console.success('✅ Status line enabled');
    this.console.info('Restart your terminal or source your shell config to see changes');
  }

  private async disableStatusLine(): Promise<void> {
    const config = await this.sessionRepo.loadConfiguration();
    config.components.statusLines = false;
    await this.sessionRepo.saveConfiguration(config);

    this.console.success('✅ Status line disabled');
    this.console.info('Restart your terminal to apply changes');
  }

  private async configureFormat(args: string[]): Promise<void> {
    if (args.length === 0) {
      await this.showFormatOptions();
      return;
    }

    const format = args.join(' ');
    const config = await this.sessionRepo.loadConfiguration();

    if (!config.preferences.statusLineFormat) {
      config.preferences.statusLineFormat = {};
    }

    config.preferences.statusLineFormat.template = format;
    await this.sessionRepo.saveConfiguration(config);

    this.console.success('✅ Status line format updated');

    // Show preview
    const preview = await this.generateStatusLine(format);
    this.box.printBox('Preview', preview);
  }

  private async watchStatusLine(): Promise<void> {
    this.console.info('Watching status line... Press Ctrl+C to stop\n');

    // Clear any existing interval
    if (this.statusLineInterval) {
      clearInterval(this.statusLineInterval);
    }

    // Update status line every second
    const updateStatus = async () => {
      const statusLine = await this.generateStatusLine();

      // Clear current line and write status
      process.stdout.write('\r' + ' '.repeat(process.stdout.columns || 80) + '\r');
      process.stdout.write(statusLine);
    };

    await updateStatus();
    this.statusLineInterval = setInterval(updateStatus, 1000);

    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
      if (this.statusLineInterval) {
        clearInterval(this.statusLineInterval);
      }
      process.stdout.write('\n');
      process.exit(0);
    });

    // Keep the process running
    await new Promise(() => {});
  }

  private async testStatusLine(): Promise<void> {
    this.console.info('Testing status line components...\n');

    const testScenarios = [
      { branch: 'main', session: null, state: null },
      { branch: 'feature/test', session: 'active', state: 'BRANCH_READY' },
      { branch: 'hotfix/urgent', session: 'active', state: 'WAITING_APPROVAL' },
      { branch: 'feature/done', session: 'active', state: 'COMPLETE' },
    ];

    for (const scenario of testScenarios) {
      const statusLine = await this.generateTestStatusLine(scenario);
      this.console.log(`${scenario.branch}: ${statusLine}`);
    }
  }

  private async generateStatusLine(customFormat?: string): Promise<string> {
    const config = await this.sessionRepo.loadConfiguration();
    const format = customFormat || config.preferences?.statusLineFormat?.template ||
                  '{icon} {branch} {session} {state} {time}';

    const branch = await this.gitOps.getCurrentBranch().catch(() => 'no-branch');
    const session = await this.sessionRepo.getSessionByBranch(branch).catch(() => null);

    const replacements: Record<string, string> = {
      '{icon}': this.getIcon(session),
      '{branch}': this.formatBranch(branch),
      '{session}': this.formatSession(session),
      '{state}': this.formatState(session?.currentState),
      '{time}': new Date().toLocaleTimeString(),
      '{workflow}': session?.workflowType || '',
      '{ahead}': await this.getAheadBehind(),
      '{dirty}': await this.getDirtyIndicator(),
    };

    let statusLine = format;
    for (const [key, value] of Object.entries(replacements)) {
      statusLine = statusLine.replace(new RegExp(key, 'g'), value);
    }

    // Clean up extra spaces
    return statusLine.replace(/\s+/g, ' ').trim();
  }

  private async generateTestStatusLine(scenario: any): Promise<string> {
    const format = '{icon} {branch} {session} {state}';

    const replacements: Record<string, string> = {
      '{icon}': scenario.session ? '🚀' : '📁',
      '{branch}': chalk.cyan(scenario.branch),
      '{session}': scenario.session ? chalk.green('[session]') : '',
      '{state}': this.formatState(scenario.state),
    };

    let statusLine = format;
    for (const [key, value] of Object.entries(replacements)) {
      statusLine = statusLine.replace(new RegExp(key, 'g'), value);
    }

    return statusLine.replace(/\s+/g, ' ').trim();
  }

  private getIcon(session: any): string {
    if (!session) return '📁';

    switch (session.workflowType) {
      case 'launch': return '🚀';
      case 'ship': return '🚢';
      case 'hotfix': return '🔥';
      default: return '📦';
    }
  }

  private formatBranch(branch: string): string {
    if (branch === 'main' || branch === 'master') {
      return chalk.bold.green(branch);
    }
    if (branch.startsWith('feature/')) {
      return chalk.cyan(branch);
    }
    if (branch.startsWith('hotfix/')) {
      return chalk.red(branch);
    }
    return chalk.yellow(branch);
  }

  private formatSession(session: any): string {
    if (!session) return '';
    return chalk.gray(`[${session.id.substring(0, 8)}]`);
  }

  private formatState(state?: string): string {
    if (!state) return '';

    const stateEmojis: Record<string, string> = {
      'INIT': '🌱',
      'BRANCH_READY': '✏️',
      'CHANGES_COMMITTED': '📝',
      'PUSHED': '⬆️',
      'PR_CREATED': '🔀',
      'WAITING_APPROVAL': '⏳',
      'REBASING': '🔄',
      'MERGING': '🔗',
      'COMPLETE': '✅',
      'ABORTED': '❌',
    };

    const emoji = stateEmojis[state] || '❓';
    const color = this.getStateColor(state);

    return `${emoji} ${color(state)}`;
  }

  private getStateColor(state: string): (str: string) => string {
    switch (state) {
      case 'COMPLETE': return chalk.green;
      case 'ABORTED': return chalk.red;
      case 'WAITING_APPROVAL': return chalk.yellow;
      case 'REBASING':
      case 'MERGING': return chalk.blue;
      default: return chalk.gray;
    }
  }

  private async getAheadBehind(): Promise<string> {
    try {
      const counts = await this.gitOps.getAheadBehindCount();
      if (counts.ahead === 0 && counts.behind === 0) return '';
      return chalk.gray(`↑${counts.ahead} ↓${counts.behind}`);
    } catch {
      return '';
    }
  }

  private async getDirtyIndicator(): Promise<string> {
    try {
      const status = await this.gitOps.getStatus();
      if (status.isClean()) return '';

      const modified = status.modified.length + status.staged.length;
      const untracked = status.not_added.length;

      return chalk.yellow(`*${modified}+${untracked}`);
    } catch {
      return '';
    }
  }

  private async setupShellIntegration(): Promise<void> {
    const fs = await import('fs/promises');
    const os = await import('os');
    const path = await import('path');

    const homeDir = os.homedir();
    const shells = [
      { file: '.bashrc', type: 'bash' },
      { file: '.zshrc', type: 'zsh' },
      { file: '.config/fish/config.fish', type: 'fish' },
    ];

    for (const shell of shells) {
      const configPath = path.join(homeDir, shell.file);

      try {
        await fs.access(configPath);

        const content = await fs.readFile(configPath, 'utf-8');
        if (content.includes('hansolo-status-line')) {
          continue; // Already configured
        }

        let integration = '';

        if (shell.type === 'bash' || shell.type === 'zsh') {
          integration = `
# han-solo status line integration
hansolo_status() {
  hansolo status-line show 2>/dev/null || echo ""
}

# Add to prompt (customize as needed)
# PS1="\\$(hansolo_status) $PS1"
`;
        } else if (shell.type === 'fish') {
          integration = `
# han-solo status line integration
function hansolo_status
  hansolo status-line show 2>/dev/null; or echo ""
end

# Add to fish prompt (customize as needed)
# function fish_prompt
#   echo (hansolo_status) (prompt_pwd) '> '
# end
`;
        }

        await fs.appendFile(configPath, integration);
        this.console.info(`Updated ${shell.file}`);

      } catch {
        // Shell config doesn't exist, skip
      }
    }
  }

  private async showFormatOptions(): Promise<void> {
    const options = [
      ['{icon}', 'Workflow type icon'],
      ['{branch}', 'Current Git branch'],
      ['{session}', 'Session ID (if active)'],
      ['{state}', 'Current workflow state'],
      ['{time}', 'Current time'],
      ['{workflow}', 'Workflow type name'],
      ['{ahead}', 'Commits ahead/behind'],
      ['{dirty}', 'Working tree status'],
    ];

    const content = options.map(([token, desc]) =>
      `${chalk.cyan((token || '').padEnd(15))} ${desc}`
    ).join('\n');

    this.box.printBox('Available Format Tokens', content);

    this.console.info('\nExample formats:');
    this.console.log('  Basic:    "{icon} {branch} {state}"');
    this.console.log('  Detailed: "{icon} {branch} [{session}] {state} {ahead} {dirty}"');
    this.console.log('  Minimal:  "{branch} {dirty}"');

    this.console.info('\nUsage: /hansolo:status-line format <template>');
  }

  validate(args: string[]): boolean {
    const validActions = ['show', 'enable', 'disable', 'format', 'watch', 'test'];

    if (args.length === 0) {
      return true; // Default to 'show'
    }

    const firstArg = args[0];
    if (!firstArg || !validActions.includes(firstArg)) {
      this.console.error(`Invalid action: ${firstArg || 'none'}`);
      this.console.info(`Valid actions: ${validActions.join(', ')}`);
      return false;
    }

    return true;
  }
}