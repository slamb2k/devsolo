import simpleGit, { SimpleGit, StatusResult } from 'simple-git';
import { GitBranchStatus } from '../models/types';

export class GitOperations {
  private git: SimpleGit;

  constructor(basePath?: string) {
    this.git = simpleGit(basePath || process.cwd());
  }

  async init(): Promise<void> {
    await this.git.init();
  }

  async isInitialized(): Promise<boolean> {
    try {
      await this.git.status();
      return true;
    } catch {
      return false;
    }
  }

  async getCurrentBranch(): Promise<string> {
    const status = await this.git.status();
    return status.current || 'main';
  }

  async createBranch(branchName: string, baseBranch: string = 'main'): Promise<void> {
    // Ensure we're on the base branch
    await this.git.checkout(baseBranch);

    // Pull latest changes
    const remotes = await this.git.getRemotes();
    if (remotes.length > 0) {
      try {
        await this.git.pull('origin', baseBranch);
      } catch {
        // Ignore pull errors (might not have upstream)
      }
    }

    // Create and checkout new branch
    await this.git.checkoutBranch(branchName, baseBranch);
  }

  async checkoutBranch(branchName: string): Promise<void> {
    await this.git.checkout(branchName);
  }

  async deleteBranch(branchName: string, force: boolean = false): Promise<void> {
    if (force) {
      await this.git.deleteLocalBranch(branchName, true);
    } else {
      await this.git.deleteLocalBranch(branchName);
    }
  }

  async deleteRemoteBranch(branchName: string): Promise<void> {
    await this.git.push('origin', branchName, ['--delete']);
  }

  async status(): Promise<StatusResult> {
    return await this.git.status();
  }

  async getStatus(): Promise<StatusResult> {
    return await this.git.status();
  }

  async isClean(): Promise<boolean> {
    const status = await this.git.status();
    return status.isClean();
  }

  async hasUncommittedChanges(): Promise<boolean> {
    const status = await this.git.status();
    return !status.isClean();
  }

  async stashChanges(message?: string): Promise<{ stashRef: string }> {
    const stashMessage = message || `han-solo stash ${new Date().toISOString()}`;
    const result = await this.git.stash(['push', '-m', stashMessage]);

    // Extract stash reference from output
    const match = result.match(/stash@\{(\d+)\}/);
    const stashRef = match ? `stash@{${match[1]}}` : 'stash@{0}';

    return { stashRef };
  }

  async add(files?: string | string[]): Promise<void> {
    if (files) {
      await this.git.add(files);
    } else {
      await this.git.add('.');
    }
  }

  async stageAll(): Promise<void> {
    await this.git.add('.');
  }

  async commit(message: string, options?: { noVerify?: boolean }): Promise<{ commit: string }> {
    const args = ['--message', message];
    if (options?.noVerify) {
      args.push('--no-verify');
    }

    const result = await this.git.raw(['commit', ...args]);
    const match = result.match(/\[\w+\s+([a-f0-9]+)\]/);
    return { commit: match?.[1] || 'unknown' };
  }

  async push(remote: string = 'origin', branch?: string, options?: boolean | string[]): Promise<void> {
    const currentBranch = branch || await this.getCurrentBranch();

    if (Array.isArray(options)) {
      // Pass through options array
      await this.git.push(remote, currentBranch, options);
    } else if (typeof options === 'boolean' && options) {
      // Legacy setUpstream parameter or force push
      await this.git.push(remote, currentBranch, ['--set-upstream']);
    } else {
      await this.git.push(remote, currentBranch);
    }
  }

  async pull(remote: string = 'origin', branch?: string): Promise<void> {
    const currentBranch = branch || await this.getCurrentBranch();
    await this.git.pull(remote, currentBranch);
  }

  async rebase(branch: string = 'main'): Promise<void> {
    await this.git.rebase([branch]);
  }

  async merge(branch: string, squash: boolean = true): Promise<void> {
    const args = squash ? ['--squash'] : [];
    await this.git.merge([branch, ...args]);
  }

  async getBranchStatus(branchName?: string): Promise<GitBranchStatus> {
    const branch = branchName || await this.getCurrentBranch();

    // Get status
    const status = await this.git.status();

    // Check if branch has remote
    const remoteBranch = `origin/${branch}`;
    let hasRemote = false;
    let ahead = 0;
    let behind = 0;

    try {
      // Check if remote branch exists
      const remoteRefs = await this.git.raw(['ls-remote', '--heads', 'origin', branch]);
      hasRemote = remoteRefs.trim().length > 0;

      if (hasRemote) {
        // Get ahead/behind count
        const revList = await this.git.raw(['rev-list', '--left-right', '--count', `${remoteBranch}...${branch || 'HEAD'}`]);
        const [behindStr, aheadStr] = revList?.trim().split('\t') || ['0', '0'];
        behind = parseInt(behindStr || '0') || 0;
        ahead = parseInt(aheadStr || '0') || 0;
      }
    } catch {
      // Remote operations might fail if offline
    }

    return {
      ahead,
      behind,
      hasRemote,
      isClean: status.isClean(),
      conflicted: status.conflicted,
    };
  }

  async getRemoteUrl(): Promise<string | null> {
    try {
      const remotes = await this.git.getRemotes(true);
      const origin = remotes.find(r => r.name === 'origin');
      return origin?.refs?.fetch || null;
    } catch {
      return null;
    }
  }

  async addRemote(name: string, url: string): Promise<void> {
    await this.git.addRemote(name, url);
  }

  async fetch(remote: string = 'origin', branch?: string): Promise<void> {
    if (branch) {
      await this.git.fetch(remote, branch);
    } else {
      await this.git.fetch(remote);
    }
  }

  async getTags(): Promise<string[]> {
    const result = await this.git.tags();
    return result.all;
  }

  async createTag(tagName: string, message?: string): Promise<void> {
    if (message) {
      await this.git.tag(['-a', tagName, '-m', message]);
    } else {
      await this.git.tag([tagName]);
    }
  }

  async getCommitHash(ref: string = 'HEAD'): Promise<string> {
    const hash = await this.git.revparse([ref]);
    return hash.trim();
  }

  async getCommitMessage(ref: string = 'HEAD'): Promise<string> {
    const message = await this.git.raw(['log', '-1', '--pretty=%B', ref]);
    return message.trim();
  }

  async getDiff(cached: boolean = false): Promise<string> {
    if (cached) {
      return await this.git.diff(['--cached']);
    }
    return await this.git.diff();
  }

  async getLog(limit: number = 10): Promise<string[]> {
    const result = await this.git.log(['-n', limit.toString()]);
    return result.all.map(commit => `${commit.hash.substring(0, 7)} - ${commit.message}`);
  }

  async listBranches(remote: boolean = false): Promise<string[]> {
    const result = await this.git.branch(remote ? ['-r'] : []);
    return result.all;
  }

  async hasConflicts(): Promise<boolean> {
    const status = await this.git.status();
    return status.conflicted.length > 0;
  }

  async getConflictedFiles(): Promise<string[]> {
    const status = await this.git.status();
    return status.conflicted;
  }

  async resolveConflict(file: string, resolution: 'ours' | 'theirs'): Promise<void> {
    if (resolution === 'ours') {
      await this.git.raw(['checkout', '--ours', file]);
    } else {
      await this.git.raw(['checkout', '--theirs', file]);
    }
    await this.git.add(file);
  }

  async abortRebase(): Promise<void> {
    await this.git.rebase(['--abort']);
  }

  async continueRebase(): Promise<void> {
    await this.git.rebase(['--continue']);
  }

  async getConfig(key: string): Promise<string | null> {
    try {
      const value = await this.git.raw(['config', '--get', key]);
      return value.trim();
    } catch {
      return null;
    }
  }

  async setConfig(key: string, value: string, global: boolean = false): Promise<void> {
    const args = ['config'];
    if (global) {
      args.push('--global');
    }
    args.push(key, value);
    await this.git.raw(args);
  }
}