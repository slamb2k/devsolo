import { GitHubIntegration, PullRequestInfo } from '../github-integration';

export interface PRValidationResult {
  action: 'create' | 'update' | 'create-new' | 'blocked';
  existingPR?: PullRequestInfo;
  previousPR?: PullRequestInfo;
  multipleOpen?: PullRequestInfo[];
  reason?: string;
}

export class PRValidator {
  private github: GitHubIntegration;

  constructor(basePath: string = '.devsolo') {
    this.github = new GitHubIntegration(basePath);
  }

  /**
   * Check for PR conflicts and determine appropriate action
   */
  async checkForPRConflicts(branchName: string): Promise<PRValidationResult> {
    // Get all PRs for this branch
    const allOpenPRs = await this.getAllOpenPRsForBranch(branchName);
    const allClosedPRs = await this.getAllClosedPRsForBranch(branchName);
    const mergedPRs = allClosedPRs.filter(pr => pr.merged);

    // DEFENSIVE CHECK 1: Multiple open PRs (ERROR - should never happen)
    if (allOpenPRs.length > 1) {
      return {
        action: 'blocked',
        multipleOpen: allOpenPRs,
        reason: `Multiple open PRs found for ${branchName}: ${allOpenPRs
          .map(pr => `#${pr.number}`)
          .join(', ')}\nManual intervention required: Close duplicate PRs`,
      };
    }

    // DEFENSIVE CHECK 2: Single open PR exists (UPDATE)
    if (allOpenPRs.length === 1) {
      const existingPR = allOpenPRs[0];
      return {
        action: 'update',
        existingPR,
        reason: `PR #${existingPR?.number} exists - will update instead of create`,
      };
    }

    // DEFENSIVE CHECK 3: Previous PR was merged (CREATE NEW)
    if (mergedPRs.length > 0) {
      const latestMerged = mergedPRs[0]; // Assuming sorted by date
      return {
        action: 'create-new',
        previousPR: latestMerged,
        reason: `Previous PR #${latestMerged?.number} was merged - creating new PR for additional changes`,
      };
    }

    // DEFENSIVE CHECK 4: No PR exists (CREATE)
    return {
      action: 'create',
      reason: 'No existing PR found - will create new PR',
    };
  }

  /**
   * Get all open PRs for a branch
   * This is a helper until we enhance GitHubIntegration to return multiple PRs
   */
  private async getAllOpenPRsForBranch(
    branchName: string
  ): Promise<PullRequestInfo[]> {
    const pr = await this.github.getPullRequestForBranch(branchName);
    return pr && pr.state === 'open' ? [pr] : [];
  }

  /**
   * Get all closed PRs for a branch
   * This is a helper until we enhance GitHubIntegration to support closed PRs
   */
  private async getAllClosedPRsForBranch(
    _branchName: string
  ): Promise<PullRequestInfo[]> {
    // For now, we can't easily get closed PRs without enhancing GitHubIntegration
    // This is a placeholder for future implementation
    return [];
  }

  /**
   * Validate that only one PR exists per feature branch lifecycle
   */
  async validateSinglePRPerBranch(branchName: string): Promise<{
    valid: boolean;
    violations: string[];
  }> {
    const result = await this.checkForPRConflicts(branchName);

    if (result.action === 'blocked' && result.multipleOpen) {
      return {
        valid: false,
        violations: [
          `Multiple open PRs detected: ${result.multipleOpen
            .map(pr => `#${pr.number}`)
            .join(', ')}`,
        ],
      };
    }

    return {
      valid: true,
      violations: [],
    };
  }
}
