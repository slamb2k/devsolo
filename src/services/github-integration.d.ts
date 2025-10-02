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
}
export declare class GitHubIntegration {
    private octokit;
    private owner;
    private repo;
    private gitOps;
    private configManager;
    constructor(basePath?: string);
    initialize(): Promise<boolean>;
    private parseGitHubUrl;
    createPullRequest(options: PullRequestOptions): Promise<PullRequestInfo | null>;
    getPullRequest(prNumber: number): Promise<PullRequestInfo | null>;
    getPullRequestForBranch(branchName: string): Promise<PullRequestInfo | null>;
    mergePullRequest(prNumber: number, mergeMethod?: 'merge' | 'squash' | 'rebase'): Promise<boolean>;
    closePullRequest(prNumber: number): Promise<boolean>;
    addComment(prNumber: number, body: string): Promise<boolean>;
    getReviewStatus(prNumber: number): Promise<{
        approved: boolean;
        changesRequested: boolean;
        reviewCount: number;
    }>;
    getChecksStatus(branchName: string): Promise<{
        passed: boolean;
        failed: boolean;
        pending: boolean;
        total: number;
    }>;
    createRelease(tagName: string, options?: {
        name?: string;
        body?: string;
        draft?: boolean;
        prerelease?: boolean;
    }): Promise<{
        html_url: string;
    } | null>;
    isInitialized(): boolean;
    getRepoInfo(): {
        owner: string;
        repo: string;
    } | null;
}
//# sourceMappingURL=github-integration.d.ts.map