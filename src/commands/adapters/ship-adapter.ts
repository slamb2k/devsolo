import { ShipCommandV2 } from '../hansolo-ship-v2';

/**
 * Adapter that wraps ShipCommandV2 to provide v1 API compatibility
 * This allows the CLI to use v2 implementation without breaking changes
 */
export class ShipCommand {
  private v2Command: ShipCommandV2;

  constructor(basePath: string = '.hansolo') {
    this.v2Command = new ShipCommandV2(basePath);
  }

  /**
   * Main execute method - Maps v1 options to v2
   * V1 had multiple flags (--push, --create-pr, --merge)
   * V2 does everything automatically in one command
   */
  async execute(options: {
    message?: string;
    push?: boolean;
    createPR?: boolean;
    merge?: boolean;
    force?: boolean;
    yes?: boolean;
  } = {}): Promise<void> {
    console.error('[MCP ADAPTER] ShipCommand adapter execute called');
    console.error('[MCP ADAPTER] Options:', options);
    // V2 ignores individual step flags and does everything automatically
    // This is the fix for the critical bug where cleanup wasn't running
    const result = await this.v2Command.execute({
      message: options.message,
      yes: options.yes,
      force: options.force,
    });
    console.error('[MCP ADAPTER] V2 command completed');
    return result;
  }

  /**
   * Legacy methods for backward compatibility
   * These all delegate to the main execute method
   */
  async push(options: { force?: boolean } = {}): Promise<void> {
    return this.execute({ ...options, push: true });
  }

  async createPR(options: { message?: string } = {}): Promise<void> {
    return this.execute({ ...options, createPR: true });
  }

  async merge(options: { yes?: boolean } = {}): Promise<void> {
    return this.execute({ ...options, merge: true });
  }
}
