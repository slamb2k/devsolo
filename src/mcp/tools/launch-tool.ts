import {
  BaseMCPTool,
  WorkflowToolInput,
  WorkflowContext,
  PromptCollectionResult,
  WorkflowExecutionResult,
} from './workflow-tool-base';
import { SessionToolResult } from './base-tool';
import { WorkflowSession } from '../../models/workflow-session';
import { GitOperations } from '../../services/git-operations';
import { SessionRepository } from '../../services/session-repository';
import { BranchNamingService } from '../../services/branch-naming';
import { BranchValidator } from '../../services/validation/branch-validator';
import { PreFlightCheckService, PreFlightVerificationResult } from '../../services/validation/pre-flight-check-service';
import { PostFlightVerification, PostFlightVerificationResult } from '../../services/validation/post-flight-verification';
import { GitHubIntegration } from '../../services/github-integration';
import { StashManager } from '../../services/stash-manager';
import { ConfigurationManager } from '../../services/configuration-manager';

/**
 * Input for launch tool
 */
export interface LaunchToolInput extends WorkflowToolInput {
  branchName?: string;
  description?: string;
  stashRef?: string;
  popStash?: boolean;
}

/**
 * Launch tool - Creates a new feature branch and workflow session
 */
export class LaunchTool extends BaseMCPTool<LaunchToolInput, SessionToolResult> {
  private preFlightCheckService: PreFlightCheckService;
  private postFlightVerification: PostFlightVerification;

  constructor(
    private gitOps: GitOperations,
    private sessionRepo: SessionRepository,
    private branchNaming: BranchNamingService,
    _branchValidator: BranchValidator,
    _githubIntegration: GitHubIntegration,
    private stashManager: StashManager,
    configManager: ConfigurationManager,
    _basePath: string = '.hansolo'
  ) {
    super(configManager);
    this.preFlightCheckService = new PreFlightCheckService(gitOps, sessionRepo);
    this.postFlightVerification = new PostFlightVerification(gitOps, sessionRepo);
  }

  protected getBanner(): string {
    return `░█░░░█▀█░█░█░█▀█░█▀▀░█░█░▀█▀░█▀█░█▀▀░
░█░░░█▀█░█░█░█░█░█░░░█▀█░░█░░█░█░█░█░
░▀▀▀░▀░▀░▀▀▀░▀░▀░▀▀▀░▀░▀░▀▀▀░▀░▀░▀▀▀░`;
  }

  protected async collectMissingParameters(
    input: LaunchToolInput
  ): Promise<PromptCollectionResult> {
    // Prompt-based parameter collection: handle missing branch name
    if (!input.branchName) {
      // Get context for branch name generation
      const hasChanges = await this.gitOps.hasUncommittedChanges();
      let diffContext = '';

      if (hasChanges && !input.stashRef) {
        const status = await this.gitOps.getStatus();
        const changedFiles = [...status.staged, ...status.modified, ...status.created];
        diffContext = changedFiles.slice(0, 5).join(', '); // First few files for context
      }

      return {
        collected: false,
        result: {
          success: true,
          message: 'No branch name provided. Generate a branch name from the description or changes, or ask the user to provide one.',
          data: {
            description: input.description || null,
            hasUncommittedChanges: hasChanges,
            changedFilesContext: diffContext || null,
            branchNamingRules: {
              format: 'feature/fix/docs/refactor prefix with descriptive-name',
              examples: ['feature/user-auth', 'fix/login-bug', 'docs/api-guide'],
            },
          },
          nextSteps: [
            'If description provided, generate branch name from it (e.g., "user authentication" -> "feature/user-authentication")',
            'If no description, analyze changed files to generate name',
            'OR ask the user what branch name they want to use',
            'Validate the name follows naming conventions',
            'Call hansolo_launch again with branchName parameter',
          ],
        } as SessionToolResult,
      };
    }

    return { collected: true };
  }

  protected async createContext(input: LaunchToolInput): Promise<Record<string, unknown>> {
    // Determine branch name from input
    const branchName = await this.determineBranchName(input);
    if (!branchName) {
      throw new Error('Failed to determine branch name');
    }

    // Handle uncommitted changes
    const stashResult = await this.handleUncommittedChanges(input);
    if (!stashResult.success) {
      throw new Error(stashResult.errors?.join(', ') || 'Failed to handle uncommitted changes');
    }

    // Abort active session if exists
    const abortResult = await this.handleActiveSession();
    if (!abortResult.success) {
      throw new Error(abortResult.errors?.join(', ') || 'Failed to handle active session');
    }

    return {
      branchName,
      stashPopped: stashResult.stashPopped,
      stashRef: stashResult.stashRef,
    };
  }

  protected async runPreFlightChecks(
    context: WorkflowContext
  ): Promise<PreFlightVerificationResult> {
    const branchName = context['branchName'] as string;
    const input = context.input as LaunchToolInput;

    return this.preFlightCheckService.runAll(
      [
        'onMainBranch',
        'workingDirectoryClean',
        'mainUpToDate',
        'noExistingSession',
        'branchNameAvailable',
      ],
      { branchName, auto: input.auto }
    );
  }

  protected async executeWorkflow(
    context: WorkflowContext
  ): Promise<WorkflowExecutionResult> {
    const input = context.input as LaunchToolInput;
    const branchName = context['branchName'] as string;

    // Create session
    const session = await this.createSession(branchName, input.description);

    // Create and checkout branch
    await this.createBranch(branchName);

    // Restore stashed work if stashRef provided
    if (input.stashRef && input.popStash !== false) {
      await this.gitOps.stashPopSpecific(input.stashRef);
    }

    return {
      success: true,
      data: {
        session,
        sessionId: session.id,
        branchName: session.branchName,
        state: session.currentState,
        nextSteps: [
          'Make your code changes',
          'Use hansolo_ship to commit, push, and create PR',
          'Use hansolo_status to check current state',
        ],
      },
    };
  }

  protected async runPostFlightVerifications(
    context: WorkflowContext,
    workflowResult: WorkflowExecutionResult
  ): Promise<PostFlightVerificationResult> {
    const session = (workflowResult.data as any).session as WorkflowSession;
    const branchName = context['branchName'] as string;
    const stashPopped = context['stashPopped'] as boolean;

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
}
