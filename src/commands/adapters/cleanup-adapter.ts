import { HansoloCleanupCommandV2 } from '../hansolo-cleanup-v2';
import { CommandHandler } from '../types';

/**
 * Adapter that wraps HansoloCleanupCommandV2 to provide v1 API compatibility
 * Implements CommandHandler interface required by CLI
 */
export class CleanupCommand implements CommandHandler {
  name = 'hansolo:cleanup';
  description = 'Clean up completed sessions and branches';

  private v2Command: HansoloCleanupCommandV2;

  constructor(_basePath: string = '.hansolo') {
    this.v2Command = new HansoloCleanupCommandV2();
  }

  /**
   * CommandHandler interface method
   */
  async execute(args: string[]): Promise<void> {
    const options: any = {};
    for (const arg of args) {
      if (arg === '--yes') {
        options.yes = true;
      }
      if (arg === '--force') {
        options.force = true;
      }
      if (arg === '--dry-run') {
        options.dryRun = true;
      }
    }
    return this.v2Command.execute(options);
  }

  /**
   * CommandHandler interface method
   */
  validate(_args: string[]): boolean {
    return true;
  }
}
