import { CommandHandler } from './types';
import {
  InitCommandAdapter,
  LaunchCommandAdapter,
  ShipCommandAdapter,
  HotfixCommandAdapter,
  SessionsCommandAdapter,
  SwapCommandAdapter,
  AbortCommandAdapter,
  HansoloStatusCommand,
  CleanupCommand,
} from './command-adapters';
import { ValidateCommand } from './hansolo-validate';
import { ConfigCommand } from './hansolo-config';
import { StatusLineCommand } from './hansolo-status-line';

export class CommandRegistry {
  private static instance: CommandRegistry;
  private commands: Map<string, CommandHandler>;

  private constructor() {
    this.commands = new Map();
    this.registerCommands();
  }

  static getInstance(): CommandRegistry {
    if (!CommandRegistry.instance) {
      CommandRegistry.instance = new CommandRegistry();
    }
    return CommandRegistry.instance;
  }

  private registerCommands(): void {
    // Core workflow commands
    this.register(new InitCommandAdapter());
    this.register(new LaunchCommandAdapter());
    this.register(new ShipCommandAdapter());
    this.register(new HotfixCommandAdapter());

    // Status and session management
    this.register(new HansoloStatusCommand());
    this.register(new SessionsCommandAdapter());
    this.register(new SwapCommandAdapter());
    this.register(new AbortCommandAdapter());

    // Maintenance commands
    this.register(new CleanupCommand());
    this.register(new ValidateCommand());

    // Configuration commands
    this.register(new ConfigCommand());
    this.register(new StatusLineCommand());
  }

  register(handler: CommandHandler): void {
    this.commands.set(handler.name, handler);

    // Also register without the hansolo: prefix for convenience
    const shortName = handler.name.replace('hansolo:', '');
    this.commands.set(shortName, handler);
  }

  get(commandName: string): CommandHandler | undefined {
    // Normalize command name
    const normalizedName = commandName.toLowerCase().replace(/^\//, '');

    // Try exact match first
    let handler = this.commands.get(normalizedName);

    // Try with hansolo: prefix
    if (!handler && !normalizedName.startsWith('hansolo:')) {
      handler = this.commands.get(`hansolo:${normalizedName}`);
    }

    return handler;
  }

  list(): CommandHandler[] {
    // Return unique handlers (avoiding duplicates from short names)
    const uniqueHandlers = new Map<string, CommandHandler>();

    for (const [name, handler] of this.commands) {
      if (name.startsWith('hansolo:')) {
        uniqueHandlers.set(handler.name, handler);
      }
    }

    return Array.from(uniqueHandlers.values());
  }

  getCommandNames(): string[] {
    return this.list().map(handler => handler.name);
  }

  getCommandDescriptions(): Map<string, string> {
    const descriptions = new Map<string, string>();

    for (const handler of this.list()) {
      descriptions.set(handler.name, handler.description);
    }

    return descriptions;
  }

  async executeCommand(commandName: string, args: string[]): Promise<void> {
    const handler = this.get(commandName);

    if (!handler) {
      throw new Error(`Unknown command: ${commandName}`);
    }

    // Validate arguments
    if (!handler.validate(args)) {
      throw new Error(`Invalid arguments for command: ${commandName}`);
    }

    // Execute command
    await handler.execute(args);
  }

  getHelp(commandName?: string): string {
    if (commandName) {
      const handler = this.get(commandName);
      if (!handler) {
        return `Unknown command: ${commandName}`;
      }

      return this.getCommandHelp(handler);
    }

    // General help
    const lines: string[] = [
      '🚀 han-solo Commands',
      '',
      'Core Workflow Commands:',
      '  /hansolo:init      - Initialize han-solo in current repository',
      '  /hansolo:launch    - Create feature branch and start workflow',
      '  /hansolo:ship      - Complete workflow: commit, push, PR, merge',
      '  /hansolo:hotfix    - Emergency production fix workflow',
      '',
      'Session Management:',
      '  /hansolo:status    - Show comprehensive workflow status',
      '  /hansolo:sessions  - List all active workflow sessions',
      '  /hansolo:swap      - Switch between concurrent sessions',
      '  /hansolo:abort     - Cancel current workflow',
      '',
      'Maintenance:',
      '  /hansolo:cleanup   - Clean up completed sessions and branches',
      '  /hansolo:validate  - Validate environment and configuration',
      '',
      'Configuration:',
      '  /hansolo:config    - Manage han-solo configuration',
      '  /hansolo:status-line - Configure terminal status line',
      '',
      'For detailed help on a specific command, use:',
      '  /hansolo:help <command>',
    ];

    return lines.join('\n');
  }

  private getCommandHelp(handler: CommandHandler): string {
    const lines: string[] = [
      `Command: ${handler.name}`,
      `Description: ${handler.description}`,
      '',
    ];

    // Add command-specific help if available
    if (handler.name === 'hansolo:config') {
      lines.push(
        'Usage:',
        '  /hansolo:config                    - Show current configuration',
        '  /hansolo:config set <key> <value>  - Set configuration value',
        '  /hansolo:config get <key>          - Get configuration value',
        '  /hansolo:config reset              - Reset to defaults',
        '  /hansolo:config --team             - Configure team settings',
        '  /hansolo:config --reinstall-hooks  - Reinstall Git hooks',
        '',
        'Options:',
        '  --global    - Use global configuration',
        '  --project   - Use project configuration (default)',
        '  --verbose   - Show detailed configuration',
      );
    } else if (handler.name === 'hansolo:cleanup') {
      lines.push(
        'Usage:',
        '  /hansolo:cleanup              - Clean up expired and completed sessions',
        '  /hansolo:cleanup --all        - Clean up everything',
        '  /hansolo:cleanup --dry-run    - Preview what would be cleaned',
        '',
        'Options:',
        '  --force           - Skip confirmation',
        '  --sessions-only   - Only clean sessions',
        '  --branches-only   - Only clean branches',
        '  --days <n>        - Sessions older than n days (default: 30)',
      );
    } else if (handler.name === 'hansolo:status-line') {
      lines.push(
        'Usage:',
        '  /hansolo:status-line              - Show current status line',
        '  /hansolo:status-line enable       - Enable status line',
        '  /hansolo:status-line disable      - Disable status line',
        '  /hansolo:status-line format <fmt> - Set custom format',
        '  /hansolo:status-line watch        - Watch status line updates',
        '  /hansolo:status-line test         - Test status line scenarios',
      );
    }

    return lines.join('\n');
  }
}

// Export singleton instance
export const commandRegistry = CommandRegistry.getInstance();