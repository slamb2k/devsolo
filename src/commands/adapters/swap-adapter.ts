import { SwapCommandV2 } from '../hansolo-swap-v2';

/**
 * Adapter that wraps SwapCommandV2 to provide v1 API compatibility
 */
export class SwapCommand {
  private v2Command: SwapCommandV2;

  constructor(basePath: string = '.hansolo') {
    this.v2Command = new SwapCommandV2(basePath);
  }

  /**
   * Main execute method - Maps v1 signature to v2
   * V1: execute(branchName?: string, options: {...})
   * V2: execute(options: { branchName?: string, ... })
   */
  async execute(
    branchNameOrOptions?: string | { branchName?: string; force?: boolean; stash?: boolean },
    maybeOptions?: { force?: boolean; stash?: boolean }
  ): Promise<void> {
    // Handle overloaded signature
    let options: { branchName?: string; force?: boolean; stash?: boolean };

    if (typeof branchNameOrOptions === 'string') {
      // V1 style: execute(branchName, options)
      options = {
        branchName: branchNameOrOptions,
        ...maybeOptions,
      };
    } else {
      // V2 style: execute(options)
      options = branchNameOrOptions || {};
    }

    return this.v2Command.execute(options);
  }

  /**
   * Helper methods for compatibility
   */
  async listSwappableSessions(): Promise<string[]> {
    // Delegate to v2 command if it has this method
    if ('listSwappableSessions' in this.v2Command) {
      return (this.v2Command as any).listSwappableSessions();
    }
    return [];
  }

  async quickSwap(index: number): Promise<void> {
    // Delegate to v2 command if it has this method
    if ('quickSwap' in this.v2Command) {
      return (this.v2Command as any).quickSwap(index);
    }
  }
}
