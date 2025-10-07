import { CommandHandler } from './types';
import { InitCommand } from './hansolo-init';
import { LaunchCommand } from './hansolo-launch';
import { ShipCommand } from './hansolo-ship';
import { SessionsCommand } from './hansolo-sessions';
import { SwapCommand } from './hansolo-swap';
import { AbortCommand } from './hansolo-abort';
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
      options.issue = args[0];
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
      options.branchName = args[0];
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
        options.deleteBranch = true;
      }
    }
    await this.command.execute(options);
  }

  validate(_args: string[]): boolean {
    return true;
  }
}

// Re-export commands that implement CommandHandler for registry
export { StatusCommand as HansoloStatusCommand } from './hansolo-status';
export { CleanupCommand } from './hansolo-cleanup';
