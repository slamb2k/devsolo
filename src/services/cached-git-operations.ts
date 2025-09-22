import { GitOperations } from './git-operations';
import { LRUCache } from '../utils/cache';

export class CachedGitOperations extends GitOperations {
  private cache: LRUCache<any>;
  private readonly BRANCH_TTL = 5000; // 5 seconds
  private readonly STATUS_TTL = 2000; // 2 seconds
  private readonly COMMIT_TTL = 30000; // 30 seconds
  private readonly CONFIG_TTL = 60000; // 1 minute

  constructor() {
    super();
    this.cache = new LRUCache(50, 10000);
  }

  async getCurrentBranch(): Promise<string> {
    return this.cache.getOrSet(
      'current_branch',
      () => super.getCurrentBranch(),
      this.BRANCH_TTL
    );
  }

  async getBranches(): Promise<string[]> {
    return this.cache.getOrSet(
      'branches',
      () => super.getBranches(),
      this.BRANCH_TTL
    );
  }

  async getStatus(): Promise<any> {
    return this.cache.getOrSet(
      'status',
      () => super.getStatus(),
      this.STATUS_TTL
    );
  }

  async isClean(): Promise<boolean> {
    return this.cache.getOrSet(
      'is_clean',
      () => super.isClean(),
      this.STATUS_TTL
    );
  }

  async getLastCommit(): Promise<any> {
    return this.cache.getOrSet(
      'last_commit',
      () => super.getLastCommit(),
      this.COMMIT_TTL
    );
  }

  async getCommitHistory(limit: number = 10): Promise<any[]> {
    return this.cache.getOrSet(
      `commit_history_${limit}`,
      () => super.getCommitHistory(limit),
      this.COMMIT_TTL
    );
  }

  async getRemoteUrl(): Promise<string> {
    return this.cache.getOrSet(
      'remote_url',
      () => super.getRemoteUrl(),
      this.CONFIG_TTL
    );
  }

  // Operations that modify state should clear relevant cache
  async createBranch(branchName: string): Promise<void> {
    await super.createBranch(branchName);
    this.invalidateBranchCache();
  }

  async switchBranch(branchName: string): Promise<void> {
    await super.switchBranch(branchName);
    this.invalidateBranchCache();
    this.invalidateStatusCache();
  }

  async deleteBranch(branchName: string, force: boolean = false): Promise<void> {
    await super.deleteBranch(branchName, force);
    this.invalidateBranchCache();
  }

  async commit(message: string): Promise<void> {
    await super.commit(message);
    this.invalidateStatusCache();
    this.invalidateCommitCache();
  }

  async push(branch?: string, force: boolean = false): Promise<void> {
    await super.push(branch, force);
    this.invalidateStatusCache();
  }

  async pull(branch?: string): Promise<void> {
    await super.pull(branch);
    this.invalidateStatusCache();
    this.invalidateCommitCache();
  }

  async stash(message?: string): Promise<void> {
    await super.stash(message);
    this.invalidateStatusCache();
  }

  async stashPop(): Promise<void> {
    await super.stashPop();
    this.invalidateStatusCache();
  }

  private invalidateBranchCache(): void {
    this.cache.delete('current_branch');
    this.cache.delete('branches');
  }

  private invalidateStatusCache(): void {
    this.cache.delete('status');
    this.cache.delete('is_clean');
  }

  private invalidateCommitCache(): void {
    // Clear all commit history entries
    for (let i = 1; i <= 100; i++) {
      this.cache.delete(`commit_history_${i}`);
    }
    this.cache.delete('last_commit');
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; hits: number; misses: number } {
    return {
      size: this.cache.size(),
      hits: 0, // Would need to track this
      misses: 0 // Would need to track this
    };
  }
}