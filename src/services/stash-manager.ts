import { GitOperations } from './git-operations';

export type StashReason = 'swap' | 'launch' | 'abort';

export interface StashResult {
  stashRef: string;
  message: string;
}

/**
 * StashManager provides high-level stash operations for han-solo workflows
 * Handles auto-stashing with consistent naming and lifecycle management
 */
export class StashManager {
  private gitOps: GitOperations;

  constructor(basePath?: string) {
    this.gitOps = new GitOperations(basePath);
  }

  /**
   * Stash uncommitted changes with a han-solo specific message
   * @param reason - The workflow reason for stashing (swap, launch, abort)
   * @param branchName - Optional branch name to include in stash message
   * @returns StashResult with stashRef and message
   */
  async stashChanges(reason: StashReason, branchName?: string): Promise<StashResult> {
    const timestamp = new Date().toISOString();
    const branchPart = branchName ? ` [${branchName}]` : '';
    const message = `han-solo auto-stash (${reason})${branchPart} - ${timestamp}`;

    const result = await this.gitOps.stashChanges(message);

    return {
      stashRef: result.stashRef,
      message
    };
  }

  /**
   * Pop a specific stash reference
   * @param stashRef - The stash reference to pop (e.g., 'stash@{0}')
   */
  async popStash(stashRef: string): Promise<void> {
    await this.gitOps.stashPopSpecific(stashRef);
  }

  /**
   * Delete a specific stash without applying it
   * @param stashRef - The stash reference to delete (e.g., 'stash@{0}')
   */
  async deleteStash(stashRef: string): Promise<void> {
    await this.gitOps.raw(['stash', 'drop', stashRef]);
  }

  /**
   * Check if there are uncommitted changes that need stashing
   * @returns true if there are uncommitted changes
   */
  async hasUncommittedChanges(): Promise<boolean> {
    return await this.gitOps.hasUncommittedChanges();
  }

  /**
   * List all stashes with their details
   * @returns Array of stash descriptions
   */
  async listStashes(): Promise<string[]> {
    return await this.gitOps.stashList();
  }

  /**
   * Get han-solo specific stashes (auto-stashes)
   * @returns Array of stash entries that were created by han-solo
   */
  async getHanSoloStashes(): Promise<string[]> {
    const allStashes = await this.listStashes();
    return allStashes.filter(stash => stash.includes('han-solo auto-stash'));
  }
}
