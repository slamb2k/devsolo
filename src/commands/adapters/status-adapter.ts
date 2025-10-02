import { StatusCommandV2 } from '../hansolo-status-v2';
import { CommandHandler } from '../types';

/**
 * Adapter that wraps StatusCommandV2 to provide v1 API compatibility
 * Implements CommandHandler interface required by CLI
 */
export class HansoloStatusCommand implements CommandHandler {
  name = 'hansolo:status';
  description = 'Show comprehensive workflow status';

  private v2Command: StatusCommandV2;

  constructor(basePath: string = '.hansolo') {
    this.v2Command = new StatusCommandV2(basePath);
  }

  /**
   * CommandHandler interface method
   */
  async execute(_args: string[]): Promise<void> {
    return this.v2Command.execute();
  }

  /**
   * CommandHandler interface method
   */
  validate(_args: string[]): boolean {
    // No arguments required for status command
    return true;
  }
}
