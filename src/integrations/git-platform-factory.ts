import { GitPlatformClient, GitPlatform } from './types';
import { GitHubClient } from './github-client';
import { GitLabClient } from './gitlab-client';

export interface GitPlatformConfig {
  platform: GitPlatform;
  token: string;
  owner?: string;  // For GitHub
  repo?: string;   // For GitHub
  projectId?: string | number;  // For GitLab
  host?: string;   // For GitLab (self-hosted)
}

export class GitPlatformFactory {
  static create(config: GitPlatformConfig): GitPlatformClient {
    switch (config.platform) {
      case 'github':
        if (!config.owner || !config.repo) {
          throw new Error('GitHub requires owner and repo configuration');
        }
        return new GitHubClient(config.token, config.owner, config.repo);

      case 'gitlab':
        if (!config.projectId) {
          throw new Error('GitLab requires projectId configuration');
        }
        return new GitLabClient(config.token, config.projectId, config.host);

      case 'bitbucket':
        throw new Error('Bitbucket support not yet implemented');

      default:
        throw new Error(`Unsupported git platform: ${config.platform}`);
    }
  }

  static async detectPlatform(remoteUrl: string): Promise<GitPlatform> {
    if (remoteUrl.includes('github.com')) {
      return 'github';
    }
    if (remoteUrl.includes('gitlab.com') || remoteUrl.includes('gitlab')) {
      return 'gitlab';
    }
    if (remoteUrl.includes('bitbucket.org')) {
      return 'bitbucket';
    }
    throw new Error(`Unable to detect platform from remote URL: ${remoteUrl}`);
  }

  static parseGitHubUrl(url: string): { owner: string; repo: string } {
    const match = url.match(/github\.com[:/]([^/]+)\/([^/]+?)(\.git)?$/);
    if (!match) {
      throw new Error(`Invalid GitHub URL: ${url}`);
    }
    return { owner: match[1], repo: match[2] };
  }

  static parseGitLabUrl(url: string): { projectPath: string } {
    const match = url.match(/gitlab\.com[:/](.+?)(\.git)?$/);
    if (!match) {
      throw new Error(`Invalid GitLab URL: ${url}`);
    }
    return { projectPath: match[1] };
  }

  static async createFromRemote(remoteUrl: string, token: string): Promise<GitPlatformClient> {
    const platform = await this.detectPlatform(remoteUrl);

    switch (platform) {
      case 'github': {
        const { owner, repo } = this.parseGitHubUrl(remoteUrl);
        return this.create({ platform: 'github', token, owner, repo });
      }

      case 'gitlab': {
        const { projectPath } = this.parseGitLabUrl(remoteUrl);
        // Note: For GitLab, we'd need to fetch the project ID from the path
        // This is a simplified version - in production you'd make an API call
        return this.create({ platform: 'gitlab', token, projectId: projectPath });
      }

      default:
        throw new Error(`Platform ${platform} not supported`);
    }
  }
}