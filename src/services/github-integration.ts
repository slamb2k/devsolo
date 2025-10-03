import { Octokit } from '@octokit/rest';
import { GitOperations } from './git-operations';
import { ConfigurationManager } from './configuration-manager';
import { execSync } from 'child_process';

export interface PullRequestOptions {
  title: string;
  body: string;
  base?: string;
  head: string;
  draft?: boolean;
  maintainerCanModify?: boolean;
}

export interface PullRequestInfo {
  number: number;
  html_url: string;
  state: string;
  merged: boolean;
  mergeable?: boolean;
  mergeable_state?: string;
  title: string;
  body?: string;
  head: string;
  base: string;
}

export class GitHubIntegration {
  private octokit: Octokit | null = null;
  private owner: string | null = null;
  private repo: string | null = null;
  private gitOps: GitOperations;
  private configManager: ConfigurationManager;

  constructor(basePath: string = '.hansolo') {
    this.gitOps = new GitOperations();
    this.configManager = new ConfigurationManager(basePath);
  }

  /**
   * Attempt to get GitHub token from gh CLI
   * @returns Token string if successful, null otherwise
   */
  private async getGhCliToken(): Promise<string | null> {
    try {
      const token = execSync('gh auth token', {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'], // stdin=ignore, stdout=pipe, stderr=ignore
      }).trim();

      if (token && token.length > 0) {
        return token;
      }
      return null;
    } catch (error) {
      // gh CLI not installed or not authenticated
      return null;
    }
  }

  async initialize(): Promise<boolean> {
    try {
      console.error('[GITHUB INIT] Starting initialization');
      // Load configuration
      const config = await this.configManager.load();
      const githubConfig = config.gitPlatform;

      console.error('[GITHUB INIT] Checking env vars...');
      // Get token from environment, config, or gh CLI (in order of preference)
      let token = process.env['GITHUB_TOKEN'] ||
                  process.env['GH_TOKEN'] ||
                  githubConfig?.token;

      console.error('[GITHUB INIT] Env token found:', !!token);

      // If no explicit token, try gh CLI
      if (!token) {
        console.error('[GITHUB INIT] Trying gh CLI...');
        const ghToken = await this.getGhCliToken();
        console.error('[GITHUB INIT] gh CLI token found:', !!ghToken);
        if (ghToken) {
          token = ghToken;
        }
      }

      if (!token) {
        console.error('[GITHUB INIT] No token found anywhere - returning false');
        // Don't error here - just return false so pre-flight check can show warning
        return false;
      }

      console.error('[GITHUB INIT] Token acquired, initializing Octokit');

      // Initialize Octokit
      this.octokit = new Octokit({
        auth: token,
      });

      // Get repository information from remote URL
      const remoteUrl = await this.gitOps.getRemoteUrl();
      if (!remoteUrl) {
        console.error('No git remote found');
        return false;
      }

      const repoInfo = this.parseGitHubUrl(remoteUrl);
      if (!repoInfo) {
        console.error('Could not parse GitHub repository information from remote URL');
        return false;
      }

      this.owner = repoInfo.owner;
      this.repo = repoInfo.repo;

      // Verify authentication
      await this.octokit.users.getAuthenticated();

      return true;
    } catch (error) {
      console.error('Failed to initialize GitHub integration:', error);
      return false;
    }
  }

  private parseGitHubUrl(url: string): { owner: string; repo: string } | null {
    // Handle various GitHub URL formats
    const patterns = [
      // SSH: git@github.com:owner/repo.git
      /git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/,
      // HTTPS: https://github.com/owner/repo.git
      /https?:\/\/github\.com\/([^/]+)\/(.+?)(?:\.git)?$/,
      // GitHub CLI: gh:owner/repo
      /gh:([^/]+)\/(.+?)$/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match?.[1] && match[2]) {
        return {
          owner: match[1],
          repo: match[2],
        };
      }
    }

    return null;
  }

  async createPullRequest(options: PullRequestOptions): Promise<PullRequestInfo | null> {
    if (!this.octokit || !this.owner || !this.repo) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize GitHub integration');
      }
    }

    try {
      const response = await this.octokit!.pulls.create({
        owner: this.owner!,
        repo: this.repo!,
        title: options.title,
        body: options.body,
        head: options.head,
        base: options.base || 'main',
        draft: options.draft || false,
        maintainer_can_modify: options.maintainerCanModify !== false,
      });

      return {
        number: response.data.number,
        html_url: response.data.html_url,
        state: response.data.state,
        merged: response.data.merged,
        mergeable: response.data.mergeable ?? undefined,
        mergeable_state: response.data.mergeable_state ?? undefined,
        title: response.data.title,
        body: response.data.body ?? undefined,
        head: response.data.head.ref,
        base: response.data.base.ref,
      };
    } catch (error: any) {
      if (error.status === 422) {
        // PR already exists
        const existingPR = await this.getPullRequestForBranch(options.head);
        if (existingPR) {
          return existingPR;
        }
      }
      throw error;
    }
  }

  async getPullRequest(prNumber: number): Promise<PullRequestInfo | null> {
    if (!this.octokit || !this.owner || !this.repo) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize GitHub integration');
      }
    }

    try {
      const response = await this.octokit!.pulls.get({
        owner: this.owner!,
        repo: this.repo!,
        pull_number: prNumber,
      });

      return {
        number: response.data.number,
        html_url: response.data.html_url,
        state: response.data.state,
        merged: response.data.merged,
        mergeable: response.data.mergeable ?? undefined,
        mergeable_state: response.data.mergeable_state ?? undefined,
        title: response.data.title,
        body: response.data.body ?? undefined,
        head: response.data.head.ref,
        base: response.data.base.ref,
      };
    } catch (error) {
      console.error('Failed to get pull request:', error);
      return null;
    }
  }

  async getPullRequestForBranch(branchName: string): Promise<PullRequestInfo | null> {
    if (!this.octokit || !this.owner || !this.repo) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize GitHub integration');
      }
    }

    try {
      const response = await this.octokit!.pulls.list({
        owner: this.owner!,
        repo: this.repo!,
        head: `${this.owner}:${branchName}`,
        state: 'open',
      });

      if (response.data.length > 0) {
        const pr = response.data[0] as any;
        if (pr) {
          return {
            number: pr.number,
            html_url: pr.html_url,
            state: pr.state,
            merged: pr.merged ?? false,
            mergeable: pr.mergeable ?? undefined,
            mergeable_state: pr.mergeable_state ?? undefined,
            title: pr.title,
            body: pr.body ?? undefined,
            head: pr.head.ref,
            base: pr.base.ref,
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to get pull request for branch:', error);
      return null;
    }
  }

  async mergePullRequest(prNumber: number, mergeMethod: 'merge' | 'squash' | 'rebase' = 'squash'): Promise<boolean> {
    if (!this.octokit || !this.owner || !this.repo) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize GitHub integration');
      }
    }

    try {
      await this.octokit!.pulls.merge({
        owner: this.owner!,
        repo: this.repo!,
        pull_number: prNumber,
        merge_method: mergeMethod,
      });

      return true;
    } catch (error) {
      console.error('Failed to merge pull request:', error);
      return false;
    }
  }

  async closePullRequest(prNumber: number): Promise<boolean> {
    if (!this.octokit || !this.owner || !this.repo) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize GitHub integration');
      }
    }

    try {
      await this.octokit!.pulls.update({
        owner: this.owner!,
        repo: this.repo!,
        pull_number: prNumber,
        state: 'closed',
      });

      return true;
    } catch (error) {
      console.error('Failed to close pull request:', error);
      return false;
    }
  }

  async addComment(prNumber: number, body: string): Promise<boolean> {
    if (!this.octokit || !this.owner || !this.repo) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize GitHub integration');
      }
    }

    try {
      await this.octokit!.issues.createComment({
        owner: this.owner!,
        repo: this.repo!,
        issue_number: prNumber,
        body,
      });

      return true;
    } catch (error) {
      console.error('Failed to add comment:', error);
      return false;
    }
  }

  async getReviewStatus(prNumber: number): Promise<{
    approved: boolean;
    changesRequested: boolean;
    reviewCount: number;
  }> {
    if (!this.octokit || !this.owner || !this.repo) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize GitHub integration');
      }
    }

    try {
      const response = await this.octokit!.pulls.listReviews({
        owner: this.owner!,
        repo: this.repo!,
        pull_number: prNumber,
      });

      let approved = false;
      let changesRequested = false;
      const reviewCount = response.data.length;

      // Check latest review from each reviewer
      const reviewerStates = new Map<string, string>();
      for (const review of response.data) {
        if (review.user && review.state) {
          reviewerStates.set(review.user.login, review.state);
        }
      }

      for (const state of reviewerStates.values()) {
        if (state === 'APPROVED') {
          approved = true;
        } else if (state === 'CHANGES_REQUESTED') {
          changesRequested = true;
        }
      }

      return {
        approved,
        changesRequested,
        reviewCount,
      };
    } catch (error) {
      console.error('Failed to get review status:', error);
      return {
        approved: false,
        changesRequested: false,
        reviewCount: 0,
      };
    }
  }

  async getChecksStatus(branchName: string): Promise<{
    passed: boolean;
    failed: boolean;
    pending: boolean;
    total: number;
    details: Array<{ name: string; status: string; conclusion?: string }>;
  }> {
    if (!this.octokit || !this.owner || !this.repo) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize GitHub integration');
      }
    }

    try {
      const response = await this.octokit!.checks.listForRef({
        owner: this.owner!,
        repo: this.repo!,
        ref: branchName,
      });

      let passed = 0;
      let failed = 0;
      let pending = 0;
      const details = [];

      for (const check of response.data.check_runs) {
        details.push({
          name: check.name,
          status: check.status,
          conclusion: check.conclusion || undefined,
        });

        if (check.status === 'completed') {
          if (check.conclusion === 'success') {
            passed++;
          } else if (check.conclusion === 'failure' || check.conclusion === 'cancelled') {
            failed++;
          }
        } else {
          pending++;
        }
      }

      return {
        passed: passed > 0 && failed === 0 && pending === 0,
        failed: failed > 0,
        pending: pending > 0,
        total: response.data.check_runs.length,
        details,
      };
    } catch (error) {
      console.error('Failed to get checks status:', error);
      return {
        passed: false,
        failed: false,
        pending: false,
        total: 0,
        details: [],
      };
    }
  }

  async waitForChecks(
    prNumber: number,
    options: {
      timeout?: number;
      pollInterval?: number;
      onProgress?: (status: { passed: number; failed: number; pending: number }) => void;
    } = {}
  ): Promise<{ success: boolean; timedOut: boolean; failedChecks: string[] }> {
    const timeout = options.timeout || 20 * 60 * 1000; // 20 minutes default
    const pollInterval = options.pollInterval || 30 * 1000; // 30 seconds default
    const startTime = Date.now();

    // Get PR details to find branch name
    const pr = await this.getPullRequest(prNumber);
    if (!pr) {
      return { success: false, timedOut: false, failedChecks: ['PR not found'] };
    }

    while (Date.now() - startTime < timeout) {
      const status = await this.getChecksStatus(pr.head);

      if (options.onProgress) {
        const passed = status.details.filter(d => d.conclusion === 'success').length;
        const failed = status.details.filter(d => d.conclusion === 'failure' || d.conclusion === 'cancelled').length;
        const pending = status.details.filter(d => d.status !== 'completed').length;
        options.onProgress({ passed, failed, pending });
      }

      if (status.passed) {
        return { success: true, timedOut: false, failedChecks: [] };
      }

      if (status.failed) {
        const failedChecks = status.details
          .filter(d => d.conclusion === 'failure' || d.conclusion === 'cancelled')
          .map(d => d.name);
        return { success: false, timedOut: false, failedChecks };
      }

      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    return { success: false, timedOut: true, failedChecks: ['Timeout waiting for checks'] };
  }

  async createRelease(tagName: string, options: {
    name?: string;
    body?: string;
    draft?: boolean;
    prerelease?: boolean;
  } = {}): Promise<{ html_url: string } | null> {
    if (!this.octokit || !this.owner || !this.repo) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize GitHub integration');
      }
    }

    try {
      const response = await this.octokit!.repos.createRelease({
        owner: this.owner!,
        repo: this.repo!,
        tag_name: tagName,
        name: options.name || tagName,
        body: options.body || '',
        draft: options.draft || false,
        prerelease: options.prerelease || false,
      });

      return {
        html_url: response.data.html_url,
      };
    } catch (error) {
      console.error('Failed to create release:', error);
      return null;
    }
  }

  isInitialized(): boolean {
    return this.octokit !== null && this.owner !== null && this.repo !== null;
  }

  getRepoInfo(): { owner: string; repo: string } | null {
    if (this.owner && this.repo) {
      return { owner: this.owner, repo: this.repo };
    }
    return null;
  }
}