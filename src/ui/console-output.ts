import chalk from 'chalk';
import boxen from 'boxen';
import Table from 'cli-table3';

export class ConsoleOutput {
  private readonly useColor: boolean;

  constructor() {
    this.useColor = process.env['NO_COLOR'] ? false : true;
  }

  // Status icons
  readonly icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    pending: '⏳',
    running: '🔄',
    complete: '✨',
    rocket: '🚀',
    fire: '🔥',
    sparkles: '✨',
    check: '✓',
    cross: '✗',
    arrow: '→',
    bullet: '•',
  };

  // Color formatting methods - return formatted strings
  success(text: string): string {
    return this.useColor ? chalk.green(text) : text;
  }

  error(text: string, err?: Error): string | void {
    // Handle two-parameter version for logging
    if (err) {
      console.error(this.useColor ? chalk.red(text) : text);
      console.error(err);
      return;
    }
    return this.useColor ? chalk.red(text) : text;
  }

  warning(text: string): string {
    return this.useColor ? chalk.yellow(text) : text;
  }

  info(text: string): string {
    return this.useColor ? chalk.blue(text) : text;
  }

  dim(text: string): string {
    return this.useColor ? chalk.dim(text) : text;
  }

  bold(text: string): string {
    return this.useColor ? chalk.bold(text) : text;
  }

  italic(text: string): string {
    return this.useColor ? chalk.italic(text) : text;
  }

  underline(text: string): string {
    return this.useColor ? chalk.underline(text) : text;
  }

  // Formatted output methods
  header(text: string): void {
    console.log('\n' + this.bold(this.underline(text)));
  }

  subheader(text: string): void {
    console.log('\n' + this.bold(text));
  }

  successMessage(message: string, icon: boolean = true): void {
    const output = icon ? `${this.icons.success} ${message}` : message;
    console.log(this.success(output));
  }

  errorMessage(message: string, icon: boolean = true): void {
    const output = icon ? `${this.icons.error} ${message}` : message;
    console.log(this.error(output));
  }

  warningMessage(message: string, icon: boolean = true): void {
    const output = icon ? `${this.icons.warning} ${message}` : message;
    console.log(this.warning(output));
  }

  infoMessage(message: string, icon: boolean = true): void {
    const output = icon ? `${this.icons.info} ${message}` : message;
    console.log(this.info(output));
  }

  // List output
  list(items: string[], ordered: boolean = false): void {
    items.forEach((item, index) => {
      const prefix = ordered ? `${index + 1}.` : this.icons.bullet;
      console.log(`  ${prefix} ${item}`);
    });
  }

  // Tree output
  tree(items: Array<{ name: string; children?: string[] }>, indent: number = 0): void {
    items.forEach((item, index) => {
      const isLast = index === items.length - 1;
      const prefix = indent === 0 ? '' : '  '.repeat(indent - 1) + (isLast ? '└─ ' : '├─ ');
      console.log(prefix + item.name);

      if (item.children) {
        item.children.forEach((child, childIndex) => {
          const childIsLast = childIndex === item.children!.length - 1;
          const childPrefix = '  '.repeat(indent) + (isLast ? '  ' : '│ ') + (childIsLast ? '└─ ' : '├─ ');
          console.log(childPrefix + child);
        });
      }
    });
  }

  // Box output
  box(content: string, title?: string): void {
    const options: any = {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: this.useColor ? 'cyan' : undefined,
    };

    if (title) {
      options.title = title;
      options.titleAlignment = 'center';
    }

    console.log(boxen(content, options));
  }

  // Table output
  table(headers: string[], rows: string[][], options?: { title?: string }): void {
    const table = new Table({
      head: this.useColor ? headers.map(h => chalk.cyan(h)) : headers,
      style: this.useColor ? { head: [], border: [] } : undefined,
    });

    rows.forEach(row => table.push(row));

    if (options?.title) {
      console.log('\n' + this.bold(options.title));
    }

    console.log(table.toString());
  }

  // Progress steps
  step(current: number, total: number, description: string): void {
    const progress = `[${current}/${total}]`;
    console.log(this.dim(progress) + ' ' + description);
  }

  // Divider
  divider(char: string = '─', length: number = 40): void {
    console.log(this.dim(char.repeat(length)));
  }

  // Empty line
  newline(): void {
    console.log();
  }

  // Banner
  banner(text: string): void {
    const banner = `
╔${'═'.repeat(text.length + 2)}╗
║ ${text} ║
╚${'═'.repeat(text.length + 2)}╝`;
    console.log(this.info(banner));
  }

  // Status line (for updating in place)
  statusLine(text: string): void {
    if (process.stdout.isTTY) {
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      process.stdout.write(text);
    } else {
      console.log(text);
    }
  }

  // Clear status line
  clearStatusLine(): void {
    if (process.stdout.isTTY) {
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
    }
  }

  // Format workflow state
  formatState(state: string): string {
    const stateColors: Record<string, (text: string) => string> = {
      INIT: this.dim.bind(this),
      BRANCH_READY: this.info.bind(this),
      CHANGES_COMMITTED: this.warning.bind(this),
      PUSHED: this.success.bind(this),
      PR_CREATED: this.success.bind(this),
      COMPLETE: this.success.bind(this),
      ABORTED: this.error.bind(this),
      HOTFIX_INIT: this.warning.bind(this),
      HOTFIX_COMPLETE: this.success.bind(this),
    };

    const colorFn = stateColors[state] || this.info.bind(this);
    return colorFn(state);
  }

  // Format branch name
  formatBranch(branch: string): string {
    if (branch === 'main' || branch === 'master') {
      return this.bold(this.error(branch));
    }
    if (branch.startsWith('hotfix/')) {
      return this.warning(branch);
    }
    return this.info(branch);
  }

  // Format session info
  formatSession(session: {
    id: string;
    branchName: string;
    workflowType: string;
    currentState: string;
    age?: string;
    isCurrent?: boolean;
  }): string {
    const parts = [
      this.dim(session.id.substring(0, 8)),
      this.formatBranch(session.branchName),
      this.dim(`[${session.workflowType}]`),
      this.formatState(session.currentState),
    ];

    if (session.age) {
      parts.push(this.dim(`(${session.age})`));
    }

    if (session.isCurrent) {
      parts.push(this.success('← current'));
    }

    return parts.join(' ');
  }

  // ASCII Art
  readonly logo = `
  ██╗  ██╗ █████╗ ███╗   ██╗    ███████╗ ██████╗ ██╗      ██████╗
  ██║  ██║██╔══██╗████╗  ██║    ██╔════╝██╔═══██╗██║     ██╔═══██╗
  ███████║███████║██╔██╗ ██║    ███████╗██║   ██║██║     ██║   ██║
  ██╔══██║██╔══██║██║╚██╗██║    ╚════██║██║   ██║██║     ██║   ██║
  ██║  ██║██║  ██║██║ ╚████║    ███████║╚██████╔╝███████╗╚██████╔╝
  ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝    ╚══════╝ ╚═════╝ ╚══════╝ ╚═════╝`;

  printLogo(): void {
    console.log(this.info(this.logo));
  }

  // Additional utility methods for commands
  log(text: string): void {
    console.log(text);
  }

  warn(text: string): void {
    console.warn(this.warning(text));
  }

  printBanner(text: string): void {
    console.log('\n' + boxen(chalk.bold(text), {
      padding: 1,
      borderStyle: 'double',
      borderColor: 'cyan',
      textAlignment: 'center',
    }) + '\n');
  }

  async confirm(message: string, defaultValue: boolean = false): Promise<boolean> {
    // Simple implementation - in production would use inquirer or similar
    console.log(this.warning(message + ` (${defaultValue ? 'Y/n' : 'y/N'}): `));

    // For now, return default since we can't actually prompt in this context
    return defaultValue;
  }

  async prompt(message: string, defaultValue?: string): Promise<string> {
    console.log(this.info(message));
    if (defaultValue) {
      console.log(this.dim(`Default: ${defaultValue}`));
    }
    // Return default value for now
    return defaultValue || '';
  }

  async promptSecret(message: string): Promise<string> {
    console.log(this.info(message));
    console.log(this.dim('(input hidden)'));
    // Return empty string for now
    return '';
  }

  async select(message: string, choices: string[], defaultChoice?: string): Promise<string> {
    console.log(this.info(message));
    choices.forEach((choice, index) => {
      const prefix = choice === defaultChoice ? this.success('→') : '  ';
      console.log(`${prefix} ${choice}`);
    });
    return defaultChoice || choices[0];
  }
}