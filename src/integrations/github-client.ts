import { Octokit } from '@octokit/rest';
import { GitPlatformClient, PullRequest, Repository, CreatePROptions, MergeOptions } from './types';

export class GitHubClient implements GitPlatformClient {
  private octokit: Octokit;
  private owner: string;
  private repo: string;

  constructor(token: string, owner: string, repo: string) {
    this.octokit = new Octokit({ auth: token });
    this.owner = owner;
    this.repo = repo;
  }

  async getRepository(): Promise<Repository> {
    const { data } = await this.octokit.repos.get({
      owner: this.owner,
      repo: this.repo,
    });

    return {
      id: data.id.toString(),
      name: data.name,
      fullName: data.full_name,
      defaultBranch: data.default_branch,
      private: data.private,
      url: data.html_url,
      cloneUrl: data.clone_url,
    };
  }

  async createPullRequest(options: CreatePROptions): Promise<PullRequest> {
    const { data } = await this.octokit.pulls.create({
      owner: this.owner,
      repo: this.repo,
      title: options.title,
      body: options.description,
      head: options.sourceBranch,
      base: options.targetBranch,
      draft: options.draft,
    });

    return {
      id: data.id.toString(),
      number: data.number,
      title: data.title,
      description: data.body || '',
      state: data.state as 'open' | 'closed' | 'merged',
      sourceBranch: data.head.ref,
      targetBranch: data.base.ref,
      url: data.html_url,
      author: data.user?.login || 'unknown',
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      mergeable: data.mergeable || false,
    };
  }

  async getPullRequest(prNumber: number): Promise<PullRequest> {
    const { data } = await this.octokit.pulls.get({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber,
    });

    return {
      id: data.id.toString(),
      number: data.number,
      title: data.title,
      description: data.body || '',
      state: data.state as 'open' | 'closed' | 'merged',
      sourceBranch: data.head.ref,
      targetBranch: data.base.ref,
      url: data.html_url,
      author: data.user?.login || 'unknown',
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      mergeable: data.mergeable || false,
    };
  }

  async mergePullRequest(prNumber: number, options: MergeOptions): Promise<void> {
    await this.octokit.pulls.merge({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber,
      commit_title: options.commitTitle,
      commit_message: options.commitMessage,
      merge_method: options.mergeMethod || 'squash',
    });
  }

  async closePullRequest(prNumber: number): Promise<void> {
    await this.octokit.pulls.update({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber,
      state: 'closed',
    });
  }

  async listPullRequests(state: 'open' | 'closed' | 'all' = 'open'): Promise<PullRequest[]> {
    const { data } = await this.octokit.pulls.list({
      owner: this.owner,
      repo: this.repo,
      state,
    });

    return data.map(pr => ({
      id: pr.id.toString(),
      number: pr.number,
      title: pr.title,
      description: pr.body || '',
      state: pr.state as 'open' | 'closed' | 'merged',
      sourceBranch: pr.head.ref,
      targetBranch: pr.base.ref,
      url: pr.html_url,
      author: pr.user?.login || 'unknown',
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      mergeable: false, // Not available in list response
    }));
  }

  async createRepository(name: string, description: string, isPrivate: boolean): Promise<Repository> {
    const { data } = await this.octokit.repos.createForAuthenticatedUser({
      name,
      description,
      private: isPrivate,
      auto_init: true,
    });

    return {
      id: data.id.toString(),
      name: data.name,
      fullName: data.full_name,
      defaultBranch: data.default_branch,
      private: data.private,
      url: data.html_url,
      cloneUrl: data.clone_url,
    };
  }

  async checkPRApproval(prNumber: number): Promise<boolean> {
    try {
      const { data } = await this.octokit.pulls.listReviews({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber,
      });

      return data.some(review => review.state === 'APPROVED');
    } catch {
      return false;
    }
  }

  async waitForChecks(prNumber: number): Promise<boolean> {
    try {
      const { data: pr } = await this.octokit.pulls.get({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber,
      });

      const { data: checks } = await this.octokit.checks.listForRef({
        owner: this.owner,
        repo: this.repo,
        ref: pr.head.sha,
      });

      return checks.check_runs.every(check =>
        check.status === 'completed' && check.conclusion === 'success'
      );
    } catch {
      return false;
    }
  }

  async addLabels(prNumber: number, labels: string[]): Promise<void> {
    await this.octokit.issues.addLabels({
      owner: this.owner,
      repo: this.repo,
      issue_number: prNumber,
      labels,
    });
  }
}