/**
 * GitBranch model stub
 */

interface GitBranchConfig {
  name: string;
  baseBranch?: string;
  remote?: string;
  tracking?: string;
  ahead?: number;
  behind?: number;
  lastCommit?: string;
  created?: Date;
  updated?: Date;
  hasRemote?: boolean;
  baseCommit?: string;
  commits?: any[];
  metadata?: any;
  protected?: boolean;
  protectionRules?: any;
}

export class GitBranch {
  name: string;
  baseBranch: string;
  remote: string;
  tracking?: string;
  ahead: number;
  behind: number;
  lastCommit?: string;
  created: Date;
  updated?: Date;
  hasRemote?: boolean;
  baseCommit?: string;
  commits: any[];
  metadata: any;
  protected?: boolean;
  protectionRules?: any;

  constructor(config: GitBranchConfig) {
    if (!config.name) {
      throw new Error('Branch name is required');
    }
    if (config.name.includes(' ')) {
      throw new Error('Invalid branch name format');
    }

    this.name = config.name;
    this.baseBranch = config.baseBranch || 'main';
    this.remote = config.remote || 'origin';
    this.tracking = config.tracking;
    this.ahead = config.ahead || 0;
    this.behind = config.behind || 0;
    this.lastCommit = config.lastCommit;
    this.created = config.created || new Date();
    this.updated = config.updated;
    this.hasRemote = config.hasRemote;
    this.baseCommit = config.baseCommit;
    this.commits = config.commits || [];
    this.metadata = config.metadata || {};
    this.protected = config.protected;
    this.protectionRules = config.protectionRules;
  }

  isUpToDate(): boolean {
    return this.ahead === 0 && this.behind === 0;
  }

  hasDiverged(): boolean {
    return this.ahead > 0 && this.behind > 0;
  }

  isTracking(): boolean {
    return !!this.tracking;
  }

  existsOnRemote(): boolean {
    return !!this.hasRemote;
  }

  getType(): string {
    if (this.name.startsWith('feature/') || this.name.startsWith('feat/')) {
      return 'feature';
    }
    if (this.name.startsWith('hotfix/') || this.name.startsWith('fix/')) {
      return 'hotfix';
    }
    if (this.name.startsWith('release/')) {
      return 'release';
    }
    if (this.name.startsWith('bugfix/')) {
      return 'bugfix';
    }
    return 'other';
  }

  equals(other: GitBranch): boolean {
    return this.name === other.name && this.baseBranch === other.baseBranch;
  }

  isBasedOn(parent: GitBranch): boolean {
    return this.baseCommit === parent.lastCommit;
  }

  updateMetadata(metadata: any): void {
    this.metadata = { ...this.metadata, ...metadata };
  }

  getCommitCount(): number {
    return this.commits.length;
  }

  getLatestCommit(): any {
    return this.commits[this.commits.length - 1];
  }

  getCommitsByAuthor(author: string): any[] {
    return this.commits.filter(c => c.author === author);
  }

  isProtected(): boolean {
    return !!this.protected;
  }

  validateProtectionRules(pr: any): boolean {
    if (!this.protectionRules) {
      return true;
    }
    if (this.protectionRules.requireApprovals && pr.approvals < this.protectionRules.requireApprovals) {
      return false;
    }
    return pr.upToDate || !this.protectionRules.requireUpToDate;
  }

  getRebaseCommand(): string {
    return `git rebase ${this.baseBranch}`;
  }

  getMergeCommand(options?: string): string {
    return `git merge ${options || ''} ${this.name}`.trim();
  }

  getPushCommand(force?: boolean): string {
    if (force) {
      return `git push --force-with-lease ${this.remote} ${this.name}`;
    }
    return `git push ${this.remote} ${this.name}`;
  }

  toJSON(): any {
    return {
      name: this.name,
      baseBranch: this.baseBranch,
      ahead: this.ahead,
      behind: this.behind,
      hasRemote: this.hasRemote,
      metadata: this.metadata,
    };
  }

  static fromJSON(json: any): GitBranch {
    return new GitBranch(json);
  }
}