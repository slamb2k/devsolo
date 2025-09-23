import { Gitlab } from '@gitbeaker/node';
import { GitPlatformClient, PullRequest, Repository, CreatePROptions, MergeOptions } from './types';

export class GitLabClient implements GitPlatformClient {
  private gitlab: any;
  private projectId: string | number;

  constructor(token: string, projectId: string | number, host = 'https://gitlab.com') {
    this.gitlab = new Gitlab({
      token,
      host,
    });
    this.projectId = projectId;
  }

  async getRepository(): Promise<Repository> {
    const project = await this.gitlab.Projects.show(this.projectId);

    return {
      id: project.id.toString(),
      name: project.name,
      fullName: project.path_with_namespace,
      defaultBranch: project.default_branch,
      private: project.visibility === 'private',
      url: project.web_url,
      cloneUrl: project.http_url_to_repo,
    };
  }

  async createPullRequest(options: CreatePROptions): Promise<PullRequest> {
    const mr = await this.gitlab.MergeRequests.create(
      this.projectId,
      options.sourceBranch,
      options.targetBranch,
      options.title,
      {
        description: options.description,
        draft: options.draft,
      }
    );

    return {
      id: mr.id.toString(),
      number: mr.iid,
      title: mr.title,
      description: mr.description || '',
      state: this.mapMRState(mr.state),
      sourceBranch: mr.source_branch,
      targetBranch: mr.target_branch,
      url: mr.web_url,
      author: mr.author.username,
      createdAt: mr.created_at,
      updatedAt: mr.updated_at,
      mergeable: mr.merge_status === 'can_be_merged',
    };
  }

  async getPullRequest(mrNumber: number): Promise<PullRequest> {
    const mr = await this.gitlab.MergeRequests.show(this.projectId, mrNumber);

    return {
      id: mr.id.toString(),
      number: mr.iid,
      title: mr.title,
      description: mr.description || '',
      state: this.mapMRState(mr.state),
      sourceBranch: mr.source_branch,
      targetBranch: mr.target_branch,
      url: mr.web_url,
      author: mr.author.username,
      createdAt: mr.created_at,
      updatedAt: mr.updated_at,
      mergeable: mr.merge_status === 'can_be_merged',
    };
  }

  async mergePullRequest(mrNumber: number, options: MergeOptions): Promise<void> {
    await this.gitlab.MergeRequests.accept(this.projectId, mrNumber, {
      squash_commit_message: options.commitMessage,
      squash: options.mergeMethod === 'squash',
      merge_commit_message: options.commitTitle,
    });
  }

  async closePullRequest(mrNumber: number): Promise<void> {
    await this.gitlab.MergeRequests.edit(this.projectId, mrNumber, {
      state_event: 'close',
    });
  }

  async listPullRequests(state: 'open' | 'closed' | 'all' = 'open'): Promise<PullRequest[]> {
    const stateFilter = state === 'all' ? undefined : state === 'open' ? 'opened' : 'closed';
    const mrs = await this.gitlab.MergeRequests.all({
      projectId: this.projectId,
      state: stateFilter,
    });

    return mrs.map((mr: any) => ({
      id: mr.id.toString(),
      number: mr.iid,
      title: mr.title,
      description: mr.description || '',
      state: this.mapMRState(mr.state),
      sourceBranch: mr.source_branch,
      targetBranch: mr.target_branch,
      url: mr.web_url,
      author: mr.author.username,
      createdAt: mr.created_at,
      updatedAt: mr.updated_at,
      mergeable: false, // Not available in list response
    }));
  }

  async createRepository(name: string, description: string, isPrivate: boolean): Promise<Repository> {
    const project = await this.gitlab.Projects.create({
      name,
      description,
      visibility: isPrivate ? 'private' : 'public',
      initialize_with_readme: true,
    });

    return {
      id: project.id.toString(),
      name: project.name,
      fullName: project.path_with_namespace,
      defaultBranch: project.default_branch,
      private: project.visibility === 'private',
      url: project.web_url,
      cloneUrl: project.http_url_to_repo,
    };
  }

  async checkPRApproval(mrNumber: number): Promise<boolean> {
    try {
      const approvals = await this.gitlab.MergeRequestApprovals.show(this.projectId, mrNumber);
      return approvals.approved;
    } catch {
      return false;
    }
  }

  async waitForChecks(mrNumber: number): Promise<boolean> {
    try {
      // Check merge request status
      await this.gitlab.MergeRequests.show(this.projectId, mrNumber);
      const pipelines = await this.gitlab.MergeRequests.pipelines(this.projectId, mrNumber);

      if (pipelines.length === 0) {
        return true; // No pipelines configured
      }

      const latestPipeline = pipelines[0];
      return latestPipeline.status === 'success';
    } catch {
      return false;
    }
  }

  async addLabels(mrNumber: number, labels: string[]): Promise<void> {
    await this.gitlab.MergeRequests.edit(this.projectId, mrNumber, {
      add_labels: labels.join(','),
    });
  }

  private mapMRState(gitlabState: string): 'open' | 'closed' | 'merged' {
    switch (gitlabState) {
      case 'opened':
        return 'open';
      case 'closed':
        return 'closed';
      case 'merged':
        return 'merged';
      default:
        return 'open';
    }
  }
}