import { MCPTool, GitHubToolResult, SessionToolResult, createErrorResult, mergeValidationResults } from './base-tool';
import { WorkflowSession } from '../../models/workflow-session';
import { GitOperations } from '../../services/git-operations';
import { SessionRepository } from '../../services/session-repository';
import { PreFlightCheckService } from '../../services/validation/pre-flight-check-service';
import { PostFlightVerification } from '../../services/validation/post-flight-verification';
import { GitHubIntegration } from '../../services/github-integration';
import { ConfigurationManager } from '../../services/configuration-manager';
import { BranchValidator } from '../../services/validation/branch-validator';

/**
 * Input for ship tool
 */
export interface ShipToolInput {
  message?: string;
  push?: boolean;
  createPR?: boolean;
  merge?: boolean;
  prDescription?: string;
  force?: boolean;
  yes?: boolean;
  stagedOnly?: boolean;
}

/**
 * Ship tool - Commits, pushes, creates PR, merges, and cleans up
 */
export class ShipTool implements MCPTool<ShipToolInput, GitHubToolResult> {
  private preFlightCheckService: PreFlightCheckService;
  private postFlightVerification: PostFlightVerification;

  constructor(
    private gitOps: GitOperations,
    private sessionRepo: SessionRepository,
    private githubIntegration: GitHubIntegration,
    private branchValidator: BranchValidator,
    private configManager: ConfigurationManager,
    _basePath: string = '.hansolo'
  ) {
    this.preFlightCheckService = new PreFlightCheckService(gitOps, sessionRepo);
    this.postFlightVerification = new PostFlightVerification(gitOps, sessionRepo);
  }

  /**
   * Execute ship workflow
   */
  async execute(input: ShipToolInput): Promise<GitHubToolResult> {
    try {
      // Check initialization
      if (!(await this.configManager.isInitialized())) {
        return {
          success: false,
          errors: ['han-solo is not initialized. Run hansolo_init first.'],
        };
      }

      // Get current branch and session
      const currentBranch = await this.gitOps.getCurrentBranch();
      const session = await this.sessionRepo.getSessionByBranch(currentBranch);

      if (!session) {
        return {
          success: false,
          errors: [`No workflow session found for branch '${currentBranch}'. Use hansolo_launch to start a workflow.`],
        };
      }

      // Check for merged/closed PR (BLOCKING ERROR)
      const mergedPRCheck = await this.checkForMergedPR(currentBranch);
      if (!mergedPRCheck.success) {
        return mergedPRCheck;
      }

      // Check for uncommitted changes
      const hasChanges = await this.gitOps.hasUncommittedChanges();
      if (hasChanges) {
        return {
          success: false,
          errors: ['Uncommitted changes detected. Commit changes first using hansolo_commit.'],
          warnings: [
            'Run git status to see changes',
            'Use hansolo_commit --message "your message" to commit',
            'Then run hansolo_ship again',
          ],
        };
      }

      // Check if PR description needed
      if (!input.prDescription) {
        const needsDescription = await this.checkIfPRDescriptionNeeded(currentBranch);
        if (needsDescription) {
          return {
            success: false,
            errors: ['PR description required for new pull request.'],
            warnings: [
              'Generate a PR description by analyzing commits and changes',
              'Then call hansolo_ship with prDescription parameter',
            ],
          };
        }
      }

      // Run pre-flight checks
      const preFlightResult = await this.runPreFlightChecks(session);
      if (!preFlightResult.allPassed && !input.force) {
        return {
          success: false,
          preFlightChecks: preFlightResult.checks,
          errors: preFlightResult.failures,
          warnings: preFlightResult.warnings.concat(['Use force: true to override pre-flight failures']),
        };
      }

      // Execute complete workflow
      const workflowResult = await this.executeShipWorkflow(session, input);
      if (!workflowResult.success) {
        return workflowResult;
      }

      // Run post-flight verifications
      const postFlightResult = await this.runPostFlightVerifications(session);

      // Merge all results
      const finalResult = mergeValidationResults(
        {
          success: postFlightResult.allPassed,
          branchName: session.branchName,
          state: session.currentState,
        } as SessionToolResult,
        preFlightResult,
        postFlightResult
      );

      return finalResult;
    } catch (error) {
      return createErrorResult(error, 'ShipTool');
    }
  }

  /**
   * Check for merged/closed PR on current branch
   */
  private async checkForMergedPR(branchName: string): Promise<{ success: boolean; errors?: string[] }> {
    try {
      const githubInitialized = await this.githubIntegration.initialize();

      if (githubInitialized) {
        const mergedPR = await this.githubIntegration.getPullRequestForBranch(branchName, 'all');
        if (mergedPR && (mergedPR.merged || mergedPR.state === 'closed')) {
          return {
            success: false,
            errors: [
              `Branch "${branchName}" has a ${mergedPR.merged ? 'merged' : 'closed'} PR (#${mergedPR.number}).`,
              'Branches cannot be reused after PR merge/close.',
              'Please abort this session and launch a new one with a fresh branch name.',
            ],
          };
        }
      }

      return { success: true };
    } catch (error) {
      // If GitHub check fails, don't block the workflow
      return { success: true };
    }
  }

  /**
   * Check if PR description is needed
   */
  private async checkIfPRDescriptionNeeded(branchName: string): Promise<boolean> {
    try {
      const githubInitialized = await this.githubIntegration.initialize();
      if (!githubInitialized) {
        return false; // Can't create PR anyway
      }

      // Check if PR exists
      const existingPR = await this.githubIntegration.getPullRequestForBranch(branchName);

      // Need description only if creating NEW PR (not updating existing)
      return !existingPR;
    } catch (error) {
      // Default to not needing description if check fails
      return false;
    }
  }

  /**
   * Run pre-flight checks
   */
  private async runPreFlightChecks(session: WorkflowSession) {
    return this.preFlightCheckService.runAll(
      [
        'sessionExists',
        'onFeatureBranch',
        'hasCommitsToShip',
        'noMergeConflicts',
      ],
      { session }
    );
  }

  /**
   * Execute complete ship workflow
   */
  private async executeShipWorkflow(
    session: WorkflowSession,
    input: ShipToolInput
  ): Promise<GitHubToolResult> {
    try {
      // Step 1: Push to remote
      await this.pushToRemote(session);

      // Step 2: Create or update PR
      const pr = await this.createOrUpdatePR(session, input.prDescription);
      if (!pr) {
        return {
          success: false,
          errors: ['Failed to create/update pull request'],
        };
      }

      // Update session with PR info
      session.metadata = session.metadata || ({} as any);
      session.metadata.pr = {
        number: pr.number,
        url: pr.url,
      };
      await this.sessionRepo.updateSession(session.id, session);

      // Step 3: Wait for CI checks and merge
      const mergeResult = await this.waitAndMerge(session, pr.number);
      if (!mergeResult.success) {
        return {
          success: false,
          prNumber: pr.number,
          prUrl: pr.url,
          errors: mergeResult.errors || ['Failed to merge PR'],
        };
      }

      // Step 4: Sync main and cleanup
      await this.syncMainAndCleanup(session);

      return {
        success: true,
        prNumber: pr.number,
        prUrl: pr.url,
        merged: true,
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Workflow execution failed: ${error instanceof Error ? error.message : String(error)}`],
      };
    }
  }

  /**
   * Push to remote
   */
  private async pushToRemote(session: WorkflowSession): Promise<void> {
    await this.gitOps.push('origin', session.branchName, ['--set-upstream']);
  }

  /**
   * Create or update PR
   */
  private async createOrUpdatePR(
    session: WorkflowSession,
    prDescription?: string
  ): Promise<{ number: number; url: string } | null> {
    try {
      // Check if PR already exists
      const existingPR = await this.githubIntegration.getPullRequestForBranch(session.branchName);

      if (existingPR) {
        // PR exists, just return it (no need to update)
        return {
          number: existingPR.number,
          url: existingPR.html_url,
        };
      }

      // Create new PR
      const prPrefix = session.workflowType === 'launch' ? 'ship' : session.workflowType;
      const prInfo = {
        title: `[${prPrefix}] ${session.branchName}`,
        body: await this.generatePRDescription(session, prDescription),
        base: 'main',
        head: session.branchName,
      };

      const pr = await this.githubIntegration.createPullRequest(prInfo);

      if (!pr) {
        return null;
      }

      return { number: pr.number, url: pr.html_url };
    } catch (error) {
      throw new Error(`Failed to create/update PR: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Wait for CI checks and merge
   */
  private async waitAndMerge(
    session: WorkflowSession,
    prNumber: number
  ): Promise<{ success: boolean; errors?: string[] }> {
    try {
      // Wait for CI checks
      const result = await this.githubIntegration.waitForChecks(prNumber, {
        timeout: 20 * 60 * 1000, // 20 minutes
        pollInterval: 30 * 1000, // 30 seconds
      });

      if (!result.success) {
        if (result.timedOut) {
          return {
            success: false,
            errors: ['Timed out waiting for CI checks (20 minutes)'],
          };
        } else {
          return {
            success: false,
            errors: [`CI checks failed: ${result.failedChecks.join(', ')}`],
          };
        }
      }

      // Merge PR
      const merged = await this.githubIntegration.mergePullRequest(prNumber, 'squash');

      if (!merged) {
        return {
          success: false,
          errors: ['Failed to merge PR via GitHub API'],
        };
      }

      // Update session metadata
      session.metadata = session.metadata || ({} as any);
      if (session.metadata.pr) {
        session.metadata.pr.merged = true;
        session.metadata.pr.mergedAt = new Date().toISOString();
      }
      await this.sessionRepo.updateSession(session.id, session);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        errors: [`Wait and merge failed: ${error instanceof Error ? error.message : String(error)}`],
      };
    }
  }

  /**
   * Sync main and cleanup
   */
  private async syncMainAndCleanup(session: WorkflowSession): Promise<void> {
    // Switch to main
    await this.gitOps.checkoutBranch('main');

    // Pull latest (includes squashed merge)
    await this.gitOps.pull('origin', 'main');

    // Delete local branch
    try {
      await this.gitOps.deleteBranch(session.branchName, true);
    } catch {
      // Already deleted
    }

    // Delete remote branch
    try {
      await this.gitOps.deleteRemoteBranch(session.branchName);
      // Track deletion
      await this.branchValidator.trackBranchDeletion(session);
    } catch {
      // Already deleted
    }

    // Mark session as complete
    session.transitionTo('COMPLETE', 'ship_command');
    await this.sessionRepo.updateSession(session.id, session);
  }

  /**
   * Generate PR description
   */
  private async generatePRDescription(
    session: WorkflowSession,
    customDescription?: string
  ): Promise<string> {
    const config = await this.configManager.load();
    const footer = config.preferences.prTemplate?.footer || '';

    let description: string;

    if (customDescription) {
      // Use provided description
      description = customDescription.trim();
    } else {
      // Generate from template or defaults
      const bodyTemplate = config.preferences.prTemplate?.body;
      const storedDescription =
        (session.metadata?.context as any)?.description ||
        session.branchName.replace(/^[^/]+\//, '').replace(/-/g, ' ');

      const commitMessages = await this.gitOps.getCommitMessagesSince('main');
      const commitsText =
        commitMessages.length > 0
          ? commitMessages.map(msg => `- ${msg}`).join('\n')
          : '- Initial commit';

      if (bodyTemplate) {
        description = bodyTemplate
          .replace(/\{\{description\}\}/g, storedDescription)
          .replace(/\{\{commits\}\}/g, commitsText)
          .trim();
      } else {
        description = `## Summary

Branch: ${session.branchName}
Session: ${session.id}
Created: ${new Date(session.createdAt).toLocaleString()}

## Changes

${commitsText}`;
      }
    }

    // Add footer with blank line separation
    if (footer) {
      if (!description.endsWith('\n\n')) {
        description += '\n\n';
      }
      description += footer;
    }

    return description;
  }

  /**
   * Run post-flight verifications
   */
  private async runPostFlightVerifications(session: WorkflowSession) {
    return this.postFlightVerification.runAll(
      [
        'branchMerged',
        'featureBranchDeleted',
        'sessionClosed',
      ],
      { session }
    );
  }
}
