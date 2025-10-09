import { MCPTool, SessionToolResult, createErrorResult, mergeValidationResults } from './base-tool';
import { WorkflowSession } from '../../models/workflow-session';
import { GitOperations } from '../../services/git-operations';
import { SessionRepository } from '../../services/session-repository';
import { BranchNamingService } from '../../services/branch-naming';
import { BranchValidator } from '../../services/validation/branch-validator';
import { PreFlightCheckService } from '../../services/validation/pre-flight-check-service';
import { PostFlightVerification } from '../../services/validation/post-flight-verification';
import { GitHubIntegration } from '../../services/github-integration';
import { StashManager } from '../../services/stash-manager';
import { ConfigurationManager } from '../../services/configuration-manager';

/**
 * Input for launch tool
 */
export interface LaunchToolInput {
  branchName?: string;
  description?: string;
  force?: boolean;
  stashRef?: string;
  popStash?: boolean;
}

/**
 * Launch tool - Creates a new feature branch and workflow session
 */
export class LaunchTool implements MCPTool<LaunchToolInput, SessionToolResult> {
  private preFlightCheckService: PreFlightCheckService;
  private postFlightVerification: PostFlightVerification;

  constructor(
    private gitOps: GitOperations,
    private sessionRepo: SessionRepository,
    private branchNaming: BranchNamingService,
    _branchValidator: BranchValidator,
    _githubIntegration: GitHubIntegration,
    private stashManager: StashManager,
    private configManager: ConfigurationManager,
    _basePath: string = '.hansolo'
  ) {
    this.preFlightCheckService = new PreFlightCheckService(gitOps, sessionRepo);
    this.postFlightVerification = new PostFlightVerification(gitOps, sessionRepo);
  }

  /**
   * Execute launch workflow
   */
  async execute(input: LaunchToolInput): Promise<SessionToolResult> {
    try {
      // Check initialization
      if (!(await this.configManager.isInitialized())) {
        return {
          success: false,
          errors: ['han-solo is not initialized. Run hansolo_init first.'],
        };
      }

      // Determine branch name
      const branchName = await this.determineBranchName(input);
      if (!branchName) {
        return {
          success: false,
          errors: ['Failed to determine branch name'],
        };
      }

      // Handle uncommitted changes
      const stashResult = await this.handleUncommittedChanges(input);
      if (!stashResult.success) {
        return stashResult;
      }

      // Abort active session if exists
      const abortResult = await this.handleActiveSession();
      if (!abortResult.success) {
        return abortResult;
      }

      // Run pre-flight checks
      const preFlightResult = await this.runPreFlightChecks(branchName, input.force);
      if (!preFlightResult.allPassed && !input.force) {
        return {
          success: false,
          preFlightChecks: preFlightResult.checks,
          errors: preFlightResult.failures,
          warnings: preFlightResult.warnings.concat(['Use force: true to override pre-flight failures']),
        };
      }

      // Execute core workflow
      const workflowResult = await this.executeLaunchWorkflow(branchName, input);
      if (!workflowResult.success || !workflowResult.session) {
        return {
          success: false,
          errors: workflowResult.errors || ['Failed to execute launch workflow'],
        };
      }

      // Run post-flight verifications
      const postFlightResult = await this.runPostFlightVerifications(
        workflowResult.session,
        branchName,
        stashResult.stashPopped
      );

      // Merge all results
      const finalResult = mergeValidationResults(
        {
          success: postFlightResult.allPassed,
          branchName: workflowResult.session.branchName,
          state: workflowResult.session.currentState,
          nextSteps: [
            'Make your code changes',
            'Use hansolo_ship to commit, push, and create PR',
            'Use hansolo_status to check current state',
          ],
        } as SessionToolResult,
        preFlightResult,
        postFlightResult
      );

      return finalResult;
    } catch (error) {
      return createErrorResult(error, 'LaunchTool');
    }
  }

  /**
   * Determine branch name from input or generate
   */
  private async determineBranchName(input: LaunchToolInput): Promise<string | null> {
    try {
      // If branch name provided, validate it
      if (input.branchName) {
        const validation = this.branchNaming.validate(input.branchName);

        if (!validation.isValid && validation.suggestions && validation.suggestions.length > 0) {
          // Use first suggestion
          return validation.suggestions[0] || null;
        }

        return input.branchName;
      }

      // If description provided, generate from description
      if (input.description) {
        return this.branchNaming.generateFromDescription(input.description) || null;
      }

      // Try to generate from git changes
      const hasChanges = await this.gitOps.hasUncommittedChanges();
      if (hasChanges && !input.stashRef) {
        const fromChanges = await this.branchNaming.generateFromChanges();
        if (fromChanges) {
          return fromChanges;
        }
      }

      // Fallback to timestamp
      return this.branchNaming.generateFromTimestamp();
    } catch (error) {
      return null;
    }
  }

  /**
   * Handle uncommitted changes by stashing
   */
  private async handleUncommittedChanges(
    _input: LaunchToolInput
  ): Promise<{ success: boolean; stashRef?: string; stashPopped: boolean; errors?: string[] }> {
    try {
      const hasChanges = await this.stashManager.hasUncommittedChanges();

      if (hasChanges) {
        const currentBranch = await this.gitOps.getCurrentBranch();
        const stashResult = await this.stashManager.stashChanges('launch', currentBranch);

        return {
          success: true,
          stashRef: stashResult.stashRef,
          stashPopped: false,
        };
      }

      return { success: true, stashPopped: false };
    } catch (error) {
      return {
        success: false,
        stashPopped: false,
        errors: [`Failed to stash changes: ${error instanceof Error ? error.message : String(error)}`],
      };
    }
  }

  /**
   * Handle active session by aborting it
   */
  private async handleActiveSession(): Promise<{ success: boolean; errors?: string[] }> {
    try {
      const currentBranch = await this.gitOps.getCurrentBranch();
      const activeSession = await this.sessionRepo.getSessionByBranch(currentBranch);

      if (activeSession && activeSession.isActive()) {
        // Abort the active session
        activeSession.transitionTo('ABORTED', 'abort_command');
        await this.sessionRepo.updateSession(activeSession.id, activeSession);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to handle active session: ${error instanceof Error ? error.message : String(error)}`],
      };
    }
  }

  /**
   * Run pre-flight checks
   */
  private async runPreFlightChecks(branchName: string, force?: boolean) {
    return this.preFlightCheckService.runAll(
      [
        'onMainBranch',
        'workingDirectoryClean',
        'mainUpToDate',
        'noExistingSession',
        'branchNameAvailable',
      ],
      { branchName, force }
    );
  }

  /**
   * Execute core launch workflow
   */
  private async executeLaunchWorkflow(
    branchName: string,
    input: LaunchToolInput
  ): Promise<{ success: boolean; session?: WorkflowSession; errors?: string[] }> {
    try {
      // Create session
      const session = await this.createSession(branchName, input.description);

      // Create and checkout branch
      await this.createBranch(branchName);

      // Restore stashed work if stashRef provided
      if (input.stashRef && input.popStash !== false) {
        await this.gitOps.stashPopSpecific(input.stashRef);
      }

      return { success: true, session };
    } catch (error) {
      return {
        success: false,
        errors: [`Workflow execution failed: ${error instanceof Error ? error.message : String(error)}`],
      };
    }
  }

  /**
   * Create workflow session
   */
  private async createSession(branchName: string, description?: string): Promise<WorkflowSession> {
    const session = new WorkflowSession({
      branchName,
      workflowType: 'launch',
      metadata: {
        projectPath: process.cwd(),
        startedAt: new Date().toISOString(),
        context: description ? { description } : undefined,
      },
    });

    await this.sessionRepo.createSession(session);
    session.transitionTo('BRANCH_READY', 'user_action');
    await this.sessionRepo.updateSession(session.id, session);

    return session;
  }

  /**
   * Create and checkout branch
   */
  private async createBranch(branchName: string): Promise<void> {
    await this.gitOps.createBranch(branchName);
    await this.gitOps.checkoutBranch(branchName);
  }

  /**
   * Run post-flight verifications
   */
  private async runPostFlightVerifications(
    session: WorkflowSession,
    branchName: string,
    stashPopped: boolean
  ) {
    const checks = [
      'sessionCreated',
      'featureBranchCreated',
      'branchCheckedOut',
      'sessionStateCorrect',
    ];

    // Only check for no uncommitted changes if no stash was popped
    if (!stashPopped) {
      checks.push('noUncommittedChanges');
    }

    return this.postFlightVerification.runAll(
      checks as any[],
      { session, branchName }
    );
  }
}
