import {
  BaseMCPTool,
  WorkflowToolInput,
  WorkflowContext,
  PromptCollectionResult,
  WorkflowExecutionResult,
} from './workflow-tool-base';
import { GitHubToolResult } from './base-tool';
import { WorkflowSession } from '../../models/workflow-session';
import { GitOperations } from '../../services/git-operations';
import { SessionRepository } from '../../services/session-repository';
import { PreFlightCheckService, PreFlightVerificationResult } from '../../services/validation/pre-flight-check-service';
import { PostFlightVerification, PostFlightVerificationResult } from '../../services/validation/post-flight-verification';
import { GitHubIntegration } from '../../services/github-integration';
import { ConfigurationManager } from '../../services/configuration-manager';
import { BranchValidator } from '../../services/validation/branch-validator';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

/**
 * Input for ship tool
 */
export interface ShipToolInput extends WorkflowToolInput {
  message?: string;
  push?: boolean;
  createPR?: boolean;
  merge?: boolean;
  prDescription?: string;
  stagedOnly?: boolean;
}

/**
 * Ship tool - Commits, pushes, creates PR, merges, and cleans up
 */
export class ShipTool extends BaseMCPTool<ShipToolInput, GitHubToolResult> {
  private preFlightCheckService: PreFlightCheckService;
  private postFlightVerification: PostFlightVerification;

  constructor(
    private gitOps: GitOperations,
    private sessionRepo: SessionRepository,
    private githubIntegration: GitHubIntegration,
    private branchValidator: BranchValidator,
    configManager: ConfigurationManager,
    _basePath: string = '.devsolo',
    server?: Server
  ) {
    super(configManager, server);
    this.preFlightCheckService = new PreFlightCheckService(gitOps, sessionRepo);
    this.postFlightVerification = new PostFlightVerification(gitOps, sessionRepo);
  }

  protected getBanner(): string {
    return `░█▀▀░█░█░▀█▀░█▀█░█▀█░▀█▀░█▀█░█▀▀░
░▀▀█░█▀█░░█░░█▀▀░█▀▀░░█░░█░█░█░█░
░▀▀▀░▀░▀░▀▀▀░▀░░░▀░░░▀▀▀░▀░▀░▀▀▀░`;
  }

  protected async collectMissingParameters(
    input: ShipToolInput
  ): Promise<PromptCollectionResult> {
    // Prompt-based parameter collection: handle missing PR description
    if (!input.prDescription) {
      const currentBranch = await this.gitOps.getCurrentBranch();
      const needsDescription = await this.checkIfPRDescriptionNeeded(currentBranch);

      if (needsDescription) {
        // Get raw context for Claude to analyze
        const commits = await this.gitOps.getCommitsSince('main');
        const commitMessages = await this.gitOps.getCommitMessagesSince('main');

        // Get changed files using git diff
        const changedFilesOutput = await this.gitOps.execute(['diff', 'main', '--name-only']);
        const changedFiles = changedFilesOutput.trim().split('\n').filter(f => f.length > 0);

        // Get diff stats (raw output for Claude to parse)
        const diffStats = await this.gitOps.execute(['diff', 'main', '--stat']);

        return {
          collected: false,
          result: {
            success: true,
            message: 'No PR description provided. Analyze the commits and changes below to generate a comprehensive PR description, or ask the user to provide one.',
            data: {
              commits: commits.map(c => ({
                message: c.message,
                hash: c.hash.substring(0, 7),
                author: c.author_name,
                date: c.date,
              })),
              commitMessages: commitMessages,
              changedFiles: changedFiles,
              diffStats: diffStats,
              branchName: currentBranch,
            },
            nextSteps: [
              'Review the commit history and changed files',
              'Analyze the overall changes and their purpose',
              'Generate a structured PR description with Summary, Changes, and Testing sections',
              'OR ask the user what PR description they want to use',
              'Call devsolo_ship again with prDescription parameter',
            ],
          } as GitHubToolResult,
        };
      }
    }

    return { collected: true };
  }

  protected async createContext(_input: ShipToolInput): Promise<Record<string, unknown>> {
    // Get current branch and session
    const currentBranch = await this.gitOps.getCurrentBranch();
    const session = await this.sessionRepo.getSessionByBranch(currentBranch);

    // Check for merged/closed PR (BLOCKING ERROR - not in pre-flight checks)
    const mergedPRCheck = await this.checkForMergedPR(currentBranch);
    if (!mergedPRCheck.success) {
      throw new Error(mergedPRCheck.errors?.join(', ') || 'PR check failed');
    }

    return { session };
  }

  protected async runPreFlightChecks(
    context: WorkflowContext
  ): Promise<PreFlightVerificationResult> {
    const session = context['session'] as WorkflowSession;

    return this.preFlightCheckService.runAll(
      [
        'sessionExists',
        'onFeatureBranch',
        'noUncommittedChanges',
        'hasCommitsToShip',
        'noMergeConflicts',
      ],
      { session }
    );
  }

  protected async executeWorkflow(
    context: WorkflowContext
  ): Promise<WorkflowExecutionResult> {
    const input = context.input as ShipToolInput;
    const session = context['session'] as WorkflowSession;

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
        errors: mergeResult.errors || ['Failed to merge PR'],
      };
    }

    // Step 4: Sync main and cleanup
    await this.syncMainAndCleanup(session);

    return {
      success: true,
      data: {
        prNumber: pr.number,
        prUrl: pr.url,
        merged: true,
      },
    };
  }

  protected async runPostFlightVerifications(
    context: WorkflowContext,
    _workflowResult: WorkflowExecutionResult
  ): Promise<PostFlightVerificationResult> {
    const session = context['session'] as WorkflowSession;

    return this.postFlightVerification.runAll(
      [
        'branchMerged',
        'featureBranchDeleted',
        'sessionClosed',
      ],
      { session }
    );
  }

  protected createFinalResult(
    workflowResult: WorkflowExecutionResult,
    preFlightResult: PreFlightVerificationResult | null,
    postFlightResult: PostFlightVerificationResult | null
  ): GitHubToolResult {
    const result: any = {
      success: postFlightResult ? postFlightResult.failedCount === 0 : workflowResult.success,
      ...workflowResult.data,
      errors: [...(workflowResult.errors || [])],
      warnings: [...(workflowResult.warnings || [])],
    };

    // Note: Banner display is now handled by slash commands

    // Merge pre-flight results
    if (preFlightResult) {
      result.preFlightChecks = preFlightResult.checks;
      result.errors.push(...preFlightResult.failures);
      result.warnings.push(...preFlightResult.warnings);
    }

    // Merge post-flight results
    if (postFlightResult) {
      result.postFlightVerifications = postFlightResult.checks;
      result.errors.push(...postFlightResult.failures);
      result.warnings.push(...postFlightResult.warnings);
    }

    return result as GitHubToolResult;
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
   * Uses try-finally to ensure session cleanup always happens
   */
  private async syncMainAndCleanup(session: WorkflowSession): Promise<void> {
    try {
      // Switch to main
      try {
        await this.gitOps.checkoutBranch('main');
      } catch (error) {
        console.error('Failed to checkout main branch:', error);
        // Continue anyway - session cleanup must happen
      }

      // Pull latest (includes squashed merge)
      try {
        await this.gitOps.pull('origin', 'main');
      } catch (error) {
        console.error('Failed to pull main branch:', error);
        // Continue anyway - session cleanup must happen
      }

      // Delete local branch
      try {
        await this.gitOps.deleteBranch(session.branchName, true);
      } catch (error) {
        console.error('Failed to delete local branch:', error);
        // Already deleted or can't delete - not critical
      }

      // Delete remote branch
      try {
        await this.gitOps.deleteRemoteBranch(session.branchName);
        // Track deletion
        await this.branchValidator.trackBranchDeletion(session);
      } catch (error) {
        console.error('Failed to delete remote branch:', error);
        // Already deleted or can't delete - not critical
      }
    } finally {
      // CRITICAL: Always mark session as complete and cleanup, even if git operations fail
      try {
        session.transitionTo('COMPLETE', 'ship_command');
        await this.sessionRepo.updateSession(session.id, session);
      } catch (error) {
        console.error('Failed to mark session as complete:', error);
      }

      // Clean up completed session to prevent accumulation
      try {
        await this.sessionRepo.deleteSession(session.id);
      } catch (error) {
        // Non-fatal - session marked complete even if cleanup fails
        console.error('Failed to cleanup session:', error);
      }
    }
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
Workflow: ${session.workflowType} (${session.currentState})
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

}
