export interface Repository {
  id: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  private: boolean;
  url: string;
  cloneUrl: string;
}

export interface PullRequest {
  id: string;
  number: number;
  title: string;
  description: string;
  state: 'open' | 'closed' | 'merged';
  sourceBranch: string;
  targetBranch: string;
  url: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  mergeable: boolean;
}

export interface CreatePROptions {
  title: string;
  description: string;
  sourceBranch: string;
  targetBranch: string;
  draft?: boolean;
}

export interface MergeOptions {
  commitTitle: string;
  commitMessage: string;
  mergeMethod?: 'merge' | 'squash' | 'rebase';
}

export interface GitPlatformClient {
  getRepository(): Promise<Repository>;
  createPullRequest(options: CreatePROptions): Promise<PullRequest>;
  getPullRequest(prNumber: number): Promise<PullRequest>;
  mergePullRequest(prNumber: number, options: MergeOptions): Promise<void>;
  closePullRequest(prNumber: number): Promise<void>;
  listPullRequests(state?: 'open' | 'closed' | 'all'): Promise<PullRequest[]>;
  createRepository(name: string, description: string, isPrivate: boolean): Promise<Repository>;
  checkPRApproval(prNumber: number): Promise<boolean>;
  waitForChecks(prNumber: number): Promise<boolean>;
  addLabels(prNumber: number, labels: string[]): Promise<void>;
}

export type GitPlatform = 'github' | 'gitlab' | 'bitbucket';