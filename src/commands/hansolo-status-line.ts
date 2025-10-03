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
                  '{icon} {branch} {state} {context} {actions} {age} {changes} {time}';

    const branch = await this.gitOps.getCurrentBranch().catch(() => 'no-branch');
    const session = await this.sessionRepo.getSessionByBranch(branch).catch(() => null);

    const replacements: Record<string, string> = {
      '{icon}': this.getIcon(session),
      '{branch}': this.formatBranch(branch),
      '{session}': this.formatSession(session),
      '{state}': this.formatState(session?.currentState),
      '{time}': chalk.dim(new Date().toLocaleTimeString()),
      '{workflow}': session?.workflowType || '',
      '{ahead}': await this.getAheadBehind(),
      '{dirty}': await this.getDirtyIndicator(),
      '{context}': await this.getContextWindowUsage(),
      '{age}': this.formatSessionAge(session),
      '{stash}': await this.getStashIndicator(),
      '{changes}': await this.getChangesIndicator(),
      '{actions}': await this.getActionableIndicators(session, branch),
      '{conflicts}': await this.getConflictIndicator(),
      '{ci}': await this.getCIStatus(branch),
      '{pr}': await this.getPRStatus(branch),
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
    if (!session) {
      return '📁';
    }

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
    if (!session) {
      return '';
    }
    return chalk.gray(`[${session.id.substring(0, 8)}]`);
  }

  private formatState(state?: string): string {
    if (!state) {
      return '';
    }

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
      if (counts.ahead === 0 && counts.behind === 0) {
        return '';
      }
      return chalk.gray(`↑${counts.ahead} ↓${counts.behind}`);
    } catch {
      return '';
    }
  }

  private async getDirtyIndicator(): Promise<string> {
    try {
      const status = await this.gitOps.getStatus();
      if (status.isClean()) {
        return '';
      }

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

  private async getContextWindowUsage(): Promise<string> {
    try {
      // Check if we're in a Claude Code context by looking for environment variables
      const claudeContext = process.env['CLAUDE_CONTEXT_TOKENS'];
      const claudeLimit = process.env['CLAUDE_CONTEXT_LIMIT'];

      if (claudeContext && claudeLimit) {
        const used = parseInt(claudeContext);
        const limit = parseInt(claudeLimit);
        const percentage = (used / limit) * 100;

        return this.formatContextBar(used, limit, percentage);
      }

      return '';
    } catch {
      return '';
    }
  }

  private formatContextBar(used: number, limit: number, percentage: number): string {
    const barLength = 10;
    const filled = Math.round((percentage / 100) * barLength);
    const empty = barLength - filled;

    // Choose color based on usage
    let color = chalk.green;
    let icon = '📊';
    if (percentage > 80) {
      color = chalk.red;
      icon = '🔴';
    } else if (percentage > 60) {
      color = chalk.yellow;
      icon = '🟡';
    } else if (percentage > 40) {
      color = chalk.blue;
      icon = '🔵';
    } else {
      icon = '🟢';
    }

    const bar = color('█'.repeat(filled)) + chalk.dim('░'.repeat(empty));
    const usedK = (used / 1000).toFixed(1);
    const limitK = (limit / 1000).toFixed(0);

    return `${icon} ${bar} ${color(`${usedK}k`)}${chalk.dim('/')}${chalk.dim(`${limitK}k`)}`;
  }

  private formatSessionAge(session: any): string {
    if (!session?.createdAt) {
      return '';
    }

    const age = session.getAge?.() || this.calculateAge(session.createdAt);
    const ageIcon = '⏱️';

    return `${ageIcon} ${chalk.cyan(age)}`;
  }

  private calculateAge(createdAt: string): string {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now.getTime() - created.getTime();

    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d`;
    }
    if (hours > 0) {
      return `${hours}h`;
    }
    return `${minutes}m`;
  }

  private async getStashIndicator(): Promise<string> {
    try {
      const { execSync } = await import('child_process');
      const stashCount = execSync('git stash list | wc -l', { encoding: 'utf-8' }).trim();
      const count = parseInt(stashCount);

      if (count === 0) {
        return '';
      }

      return `${chalk.magenta('📦')} ${chalk.magenta(count.toString())}`;
    } catch {
      return '';
    }
  }

  private async getChangesIndicator(): Promise<string> {
    try {
      const status = await this.gitOps.getStatus();
      if (status.isClean()) {
        return chalk.green('✨');
      }

      const modified = status.modified.length + status.staged.length;
      const untracked = status.not_added.length;
      const deleted = status.deleted.length;

      const parts = [];
      if (modified > 0) {
        parts.push(`${chalk.yellow('~')}${chalk.yellow(modified.toString())}`);
      }
      if (untracked > 0) {
        parts.push(`${chalk.green('+')}${chalk.green(untracked.toString())}`);
      }
      if (deleted > 0) {
        parts.push(`${chalk.red('-')}${chalk.red(deleted.toString())}`);
      }

      return `${chalk.yellow('📝')} ${parts.join(' ')}`;
    } catch {
      return '';
    }
  }

  private async getActionableIndicators(session: any, branch: string): Promise<string> {
    const actions: string[] = [];

    // Check if needs rebase
    try {
      const { execSync } = await import('child_process');
      const behind = execSync('git rev-list --count HEAD..@{upstream} 2>/dev/null || echo 0', { encoding: 'utf-8' }).trim();
      if (parseInt(behind) > 0) {
        actions.push(`${chalk.yellow('⚡')} ${chalk.yellow('rebase')}`);
      }
    } catch {
      // ignore
    }

    // Check if has uncommitted changes and session active
    if (session?.isActive()) {
      const status = await this.gitOps.getStatus().catch(() => null);
      if (status && !status.isClean()) {
        actions.push(`${chalk.cyan('💾')} ${chalk.cyan('commit')}`);
      }
    }

    // Check if branch is ready to ship
    if (session?.currentState === 'BRANCH_READY' || session?.currentState === 'CHANGES_COMMITTED') {
      actions.push(`${chalk.green('🚢')} ${chalk.green('ship')}`);
    }

    // Check if on main with no session (should launch)
    if ((branch === 'main' || branch === 'master') && !session) {
      actions.push(`${chalk.blue('🚀')} ${chalk.blue('launch')}`);
    }

    return actions.join(' ');
  }

  private async getConflictIndicator(): Promise<string> {
    try {
      const { execSync } = await import('child_process');
      const conflicts = execSync('git diff --name-only --diff-filter=U 2>/dev/null | wc -l', { encoding: 'utf-8' }).trim();
      const count = parseInt(conflicts);

      if (count > 0) {
        return `${chalk.red('⚠️')} ${chalk.red(`${count} conflicts`)}`;
      }

      return '';
    } catch {
      return '';
    }
  }

  private async getCIStatus(branch: string): Promise<string> {
    try {
      // Check for GitHub Actions workflow status
      const { execSync } = await import('child_process');
      const result = execSync(`gh run list --branch ${branch} --limit 1 --json status,conclusion 2>/dev/null || echo "[]"`, { encoding: 'utf-8' }).trim();

      if (result && result !== '[]') {
        const runs = JSON.parse(result);
        if (runs.length > 0) {
          const run = runs[0];
          if (run.status === 'in_progress') {
            return `${chalk.blue('🔄')} ${chalk.blue('CI running')}`;
          }
          if (run.conclusion === 'success') {
            return `${chalk.green('✅')} ${chalk.green('CI passed')}`;
          }
          if (run.conclusion === 'failure') {
            return `${chalk.red('❌')} ${chalk.red('CI failed')}`;
          }
        }
      }

      return '';
    } catch {
      return '';
    }
  }

  private async getPRStatus(branch: string): Promise<string> {
    try {
      const { execSync } = await import('child_process');
      const result = execSync(`gh pr list --head ${branch} --json number,state,reviewDecision 2>/dev/null || echo "[]"`, { encoding: 'utf-8' }).trim();

      if (result && result !== '[]') {
        const prs = JSON.parse(result);
        if (prs.length > 0) {
          const pr = prs[0];
          if (pr.state === 'OPEN') {
            if (pr.reviewDecision === 'APPROVED') {
              return `${chalk.green('✓')} ${chalk.green(`PR #${pr.number} approved`)}`;
            } else if (pr.reviewDecision === 'CHANGES_REQUESTED') {
              return `${chalk.yellow('↻')} ${chalk.yellow(`PR #${pr.number} changes req`)}`;
            } else {
              return `${chalk.blue('👀')} ${chalk.blue(`PR #${pr.number} review pending`)}`;
            }
          }
        }
      }

      return '';
    } catch {
      return '';
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
      ['{context}', 'Context window usage bar'],
      ['{age}', 'Session age/duration'],
      ['{stash}', 'Git stash count'],
      ['{changes}', 'Detailed changes indicator'],
      ['{actions}', 'Actionable next steps'],
      ['{conflicts}', 'Merge conflict indicator'],
      ['{ci}', 'CI/CD status'],
      ['{pr}', 'Pull request status'],
    ];

    const content = options.map(([token, desc]) =>
      `${chalk.cyan((token || '').padEnd(15))} ${desc}`
    ).join('\n');

    this.box.printBox('Available Format Tokens', content);

    this.console.info('\nExample formats:');
    this.console.log('  Basic:     "{icon} {branch} {state}"');
    this.console.log('  Detailed:  "{icon} {branch} {state} {context} {actions} {changes}"');
    this.console.log('  Full:      "{icon} {branch} {state} {context} {age} {actions} {pr} {ci} {conflicts} {changes} {time}"');
    this.console.log('  Minimal:   "{branch} {actions}"');
    this.console.log('  Dev Focus: "{context} {branch} {changes} {actions}"');

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