import { CommandHandler } from './types';
import { InitCommand } from './hansolo-init';
// Import v2 adapter commands that provide v1 API compatibility
import { LaunchCommand } from './adapters/launch-adapter';
import { ShipCommand } from './adapters/ship-adapter';
import { SessionsCommand } from './adapters/sessions-adapter';
import { SwapCommand } from './adapters/swap-adapter';
import { AbortCommand } from './adapters/abort-adapter';
import { HotfixCommand } from './hansolo-hotfix';

// Adapter classes to wrap existing commands in CommandHandler interface

export class InitCommandAdapter implements CommandHandler {
  name = 'hansolo:init';
  description = 'Initialize han-solo in current repository';
  private command = new InitCommand();

  async execute(args: string[]): Promise<void> {
    const options: any = {};
    for (const arg of args) {
      if (arg === '--force') {
        options.force = true;
      }
      if (arg === '--create-remote') {
        options.createRemote = true;
      }
      if (arg.startsWith('--platform=')) {
        options.gitPlatform = arg.split('=')[1];
      }
    }
    return this.command.execute(options);
  }

  validate(_args: string[]): boolean {
    return true;
  }
}

export class LaunchCommandAdapter implements CommandHandler {
  name = 'hansolo:launch';
  description = 'Create feature branch and start workflow';
  private command = new LaunchCommand();

  async execute(args: string[]): Promise<void> {
    const options: any = {};
    if (args[0]) {
      options.branchName = args[0];
    }
    return this.command.execute(options);
  }

  validate(_args: string[]): boolean {
    return true;
  }
}

export class ShipCommandAdapter implements CommandHandler {
  name = 'hansolo:ship';
  description = 'Complete workflow: commit, push, PR, merge';
  private command = new ShipCommand();

  async execute(args: string[]): Promise<void> {
    const options: any = {};
    for (const arg of args) {
      if (arg === '--force') {
        options.force = true;
      }
      if (arg === '--no-pr') {
        options.skipPR = true;
      }
    }
    return this.command.execute(options);
  }

  validate(_args: string[]): boolean {
    return true;
  }
}

export class HotfixCommandAdapter implements CommandHandler {
  name = 'hansolo:hotfix';
  description = 'Emergency production fix workflow';
  private command = new HotfixCommand();

  async execute(args: string[]): Promise<void> {
    const options: any = {};
    if (args[0]) {
      options.branchName = args[0];
    }
    return this.command.execute(options);
  }

  validate(_args: string[]): boolean {
    return true;
  }
}

export class SessionsCommandAdapter implements CommandHandler {
  name = 'hansolo:sessions';
  description = 'List all active workflow sessions';
  private command = new SessionsCommand();

  async execute(args: string[]): Promise<void> {
    const options: any = {};
    for (const arg of args) {
      if (arg === '--all') {
        options.all = true;
      }
      if (arg === '--json') {
        options.json = true;
      }
    }
    return this.command.execute(options);
  }

  validate(_args: string[]): boolean {
    return true;
  }
}

export class SwapCommandAdapter implements CommandHandler {
  name = 'hansolo:swap';
  description = 'Switch between concurrent sessions';
  private command = new SwapCommand();

  async execute(args: string[]): Promise<void> {
    const options: any = {};
    if (args[0]) {
      options.target = args[0];
    }
    return this.command.execute(options);
  }

  validate(_args: string[]): boolean {
    return true;
  }
}

export class AbortCommandAdapter implements CommandHandler {
  name = 'hansolo:abort';
  description = 'Cancel current workflow';
  private command = new AbortCommand();

  async execute(args: string[]): Promise<void> {
    const options: any = {};
    for (const arg of args) {
      if (arg === '--force') {
        options.force = true;
      }
      if (arg === '--clean') {
        options.clean = true;
      }
    }
    await this.command.execute(options);
  }

  validate(_args: string[]): boolean {
    return true;
  }
}