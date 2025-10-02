"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubIntegration = void 0;
const rest_1 = require("@octokit/rest");
const git_operations_1 = require("./git-operations");
const configuration_manager_1 = require("./configuration-manager");
class GitHubIntegration {
    octokit = null;
    owner = null;
    repo = null;
    gitOps;
    configManager;
    constructor(basePath = '.hansolo') {
        this.gitOps = new git_operations_1.GitOperations();
        this.configManager = new configuration_manager_1.ConfigurationManager(basePath);
    }
    async initialize() {
        try {
            // Load configuration
            const config = await this.configManager.load();
            const githubConfig = config.gitPlatform;
            // Get token from environment or config
            const token = process.env['GITHUB_TOKEN'] ||
                process.env['GH_TOKEN'] ||
                githubConfig?.token;
            if (!token) {
                console.error('GitHub token not found. Set GITHUB_TOKEN or GH_TOKEN environment variable.');
                return false;
            }
            // Initialize Octokit
            this.octokit = new rest_1.Octokit({
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
        }
        catch (error) {
            console.error('Failed to initialize GitHub integration:', error);
            return false;
        }
    }
    parseGitHubUrl(url) {
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
    async createPullRequest(options) {
        if (!this.octokit || !this.owner || !this.repo) {
            const initialized = await this.initialize();
            if (!initialized) {
                throw new Error('Failed to initialize GitHub integration');
            }
        }
        try {
            const response = await this.octokit.pulls.create({
                owner: this.owner,
                repo: this.repo,
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
            };
        }
        catch (error) {
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
    async getPullRequest(prNumber) {
        if (!this.octokit || !this.owner || !this.repo) {
            const initialized = await this.initialize();
            if (!initialized) {
                throw new Error('Failed to initialize GitHub integration');
            }
        }
        try {
            const response = await this.octokit.pulls.get({
                owner: this.owner,
                repo: this.repo,
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
            };
        }
        catch (error) {
            console.error('Failed to get pull request:', error);
            return null;
        }
    }
    async getPullRequestForBranch(branchName) {
        if (!this.octokit || !this.owner || !this.repo) {
            const initialized = await this.initialize();
            if (!initialized) {
                throw new Error('Failed to initialize GitHub integration');
            }
        }
        try {
            const response = await this.octokit.pulls.list({
                owner: this.owner,
                repo: this.repo,
                head: `${this.owner}:${branchName}`,
                state: 'open',
            });
            if (response.data.length > 0) {
                const pr = response.data[0];
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
                    };
                }
            }
            return null;
        }
        catch (error) {
            console.error('Failed to get pull request for branch:', error);
            return null;
        }
    }
    async mergePullRequest(prNumber, mergeMethod = 'squash') {
        if (!this.octokit || !this.owner || !this.repo) {
            const initialized = await this.initialize();
            if (!initialized) {
                throw new Error('Failed to initialize GitHub integration');
            }
        }
        try {
            await this.octokit.pulls.merge({
                owner: this.owner,
                repo: this.repo,
                pull_number: prNumber,
                merge_method: mergeMethod,
            });
            return true;
        }
        catch (error) {
            console.error('Failed to merge pull request:', error);
            return false;
        }
    }
    async closePullRequest(prNumber) {
        if (!this.octokit || !this.owner || !this.repo) {
            const initialized = await this.initialize();
            if (!initialized) {
                throw new Error('Failed to initialize GitHub integration');
            }
        }
        try {
            await this.octokit.pulls.update({
                owner: this.owner,
                repo: this.repo,
                pull_number: prNumber,
                state: 'closed',
            });
            return true;
        }
        catch (error) {
            console.error('Failed to close pull request:', error);
            return false;
        }
    }
    async addComment(prNumber, body) {
        if (!this.octokit || !this.owner || !this.repo) {
            const initialized = await this.initialize();
            if (!initialized) {
                throw new Error('Failed to initialize GitHub integration');
            }
        }
        try {
            await this.octokit.issues.createComment({
                owner: this.owner,
                repo: this.repo,
                issue_number: prNumber,
                body,
            });
            return true;
        }
        catch (error) {
            console.error('Failed to add comment:', error);
            return false;
        }
    }
    async getReviewStatus(prNumber) {
        if (!this.octokit || !this.owner || !this.repo) {
            const initialized = await this.initialize();
            if (!initialized) {
                throw new Error('Failed to initialize GitHub integration');
            }
        }
        try {
            const response = await this.octokit.pulls.listReviews({
                owner: this.owner,
                repo: this.repo,
                pull_number: prNumber,
            });
            let approved = false;
            let changesRequested = false;
            const reviewCount = response.data.length;
            // Check latest review from each reviewer
            const reviewerStates = new Map();
            for (const review of response.data) {
                if (review.user && review.state) {
                    reviewerStates.set(review.user.login, review.state);
                }
            }
            for (const state of reviewerStates.values()) {
                if (state === 'APPROVED') {
                    approved = true;
                }
                else if (state === 'CHANGES_REQUESTED') {
                    changesRequested = true;
                }
            }
            return {
                approved,
                changesRequested,
                reviewCount,
            };
        }
        catch (error) {
            console.error('Failed to get review status:', error);
            return {
                approved: false,
                changesRequested: false,
                reviewCount: 0,
            };
        }
    }
    async getChecksStatus(branchName) {
        if (!this.octokit || !this.owner || !this.repo) {
            const initialized = await this.initialize();
            if (!initialized) {
                throw new Error('Failed to initialize GitHub integration');
            }
        }
        try {
            const response = await this.octokit.checks.listForRef({
                owner: this.owner,
                repo: this.repo,
                ref: branchName,
            });
            let passed = 0;
            let failed = 0;
            let pending = 0;
            for (const check of response.data.check_runs) {
                if (check.status === 'completed') {
                    if (check.conclusion === 'success') {
                        passed++;
                    }
                    else if (check.conclusion === 'failure' || check.conclusion === 'cancelled') {
                        failed++;
                    }
                }
                else {
                    pending++;
                }
            }
            return {
                passed: passed > 0 && failed === 0 && pending === 0,
                failed: failed > 0,
                pending: pending > 0,
                total: response.data.check_runs.length,
            };
        }
        catch (error) {
            console.error('Failed to get checks status:', error);
            return {
                passed: false,
                failed: false,
                pending: false,
                total: 0,
            };
        }
    }
    async createRelease(tagName, options = {}) {
        if (!this.octokit || !this.owner || !this.repo) {
            const initialized = await this.initialize();
            if (!initialized) {
                throw new Error('Failed to initialize GitHub integration');
            }
        }
        try {
            const response = await this.octokit.repos.createRelease({
                owner: this.owner,
                repo: this.repo,
                tag_name: tagName,
                name: options.name || tagName,
                body: options.body || '',
                draft: options.draft || false,
                prerelease: options.prerelease || false,
            });
            return {
                html_url: response.data.html_url,
            };
        }
        catch (error) {
            console.error('Failed to create release:', error);
            return null;
        }
    }
    isInitialized() {
        return this.octokit !== null && this.owner !== null && this.repo !== null;
    }
    getRepoInfo() {
        if (this.owner && this.repo) {
            return { owner: this.owner, repo: this.repo };
        }
        return null;
    }
}
exports.GitHubIntegration = GitHubIntegration;
//# sourceMappingURL=github-integration.js.map