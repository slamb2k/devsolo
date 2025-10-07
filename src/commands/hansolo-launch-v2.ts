import { ConsoleOutput } from '../ui/console-output';
import { WorkflowProgress } from '../ui/progress-indicators';
import { ConfigurationManager } from '../services/configuration-manager';
import { SessionRepository } from '../services/session-repository';
import { GitOperations } from '../services/git-operations';
import { WorkflowSession } from '../models/workflow-session';
import { BranchValidator } from '../services/validation/branch-validator';
import { PreFlightChecks, PostFlightChecks, CheckResult } from '../services/validation/pre-flight-checks';
import { BranchNamingService } from '../services/branch-naming';
import { GitHubIntegration } from '../services/github-integration';
import { StashManager } from '../services/stash-manager';
import { AbortCommandV2 } from './hansolo-abort-v2';

/**
 * Pre-flight checks for launch command
 */
class LaunchPreFlightChecks extends PreFlightChecks {
  constructor(
    private gitOps: GitOperations,
    private sessionRepo: SessionRepository,
    private branchValidator: BranchValidator,
    private branchName: string,
    private githubIntegration: GitHubIntegration,
    private force?: boolean
  ) {
    super();
    this.setupChecks();
  }

  private setupChecks(): void {
    this.addCheck(async () => this.checkOnMainBranch());
    this.addCheck(async () => this.checkMainUpToDate());
    this.addCheck(async () => this.checkNoExistingSession());
    this.addCheck(async () => this.checkBranchNameAvailable());
    this.addCheck(async () => this.checkBranchHasNoClosedPR());
  }

  private async checkOnMainBranch(): Promise<CheckResult> {
    const currentBranch = await this.gitOps.getCurrentBranch();
    const isMain = currentBranch === 'main' || currentBranch === 'master';

    if (!isMain && !this.force) {
      return {
        passed: false,
        name: 'On main/master branch',
        message: `Currently on ${currentBranch}`,
        level: 'error',
        suggestions: ['Switch to main branch', 'Use --force to override'],
      };
    }

    return {
      passed: true,
      name: 'On main/master branch',
      message: isMain ? currentBranch : `${currentBranch} (--force)`,
      level: 'info',
    };
  }

  private async checkMainUpToDate(): Promise<CheckResult> {
    try {
      const status = await this.gitOps.getBranchStatus();

      if (status.behind > 0) {
        return {
          passed: false,
          name: 'Main up to date with origin',
          message: `${status.behind} commits behind`,
          level: 'warning',
          suggestions: ['Run: git pull origin main'],
        };
      }

      return {
        passed: true,
        name: 'Main up to date with origin',
        level: 'info',
      };
    } catch {
      return {
        passed: true,
        name: 'Main up to date with origin',
        message: 'Could not check (no remote)',
        level: 'warning',
      };
    }
  }

  private async checkNoExistingSession(): Promise<CheckResult> {
    const currentBranch = await this.gitOps.getCurrentBranch();
    const existingSession = await this.sessionRepo.getSessionByBranch(currentBranch);

    if (existingSession && existingSession.isActive()) {
      return {
        passed: false,
        name: 'No existing session',
        message: `Active session on ${currentBranch}`,
        level: 'error',
        suggestions: ['Use /hansolo:status to see active sessions'],
      };
    }

    return {
      passed: true,
      name: 'No existing session',
      level: 'info',
    };
  }

  private async checkBranchNameAvailable(): Promise<CheckResult> {
    const validation = await this.branchValidator.checkBranchNameAvailability(
      this.branchName
    );

    if (!validation.available) {
      const suggestions = validation.suggestions || [];

      // Check if it's a previous merged branch
      if (validation.previousSession?.metadata?.pr?.merged) {
        return {
          passed: false,
          name: 'Branch name available',
          message: `Previously used for PR #${validation.previousSession.metadata.pr.number}`,
          level: 'error',
          suggestions: [
            'Branch names cannot be reused after merge',
            ...suggestions.map(s => `Suggestion: ${s}`),
          ],
        };
      }

      // Check if it's an active session
      if (validation.previousSession?.isActive()) {
        return {
          passed: false,
          name: 'Branch name available',
          message: validation.reason || 'Session already exists',
          level: 'error',
          suggestions: suggestions,
        };
      }

      // Other conflicts
      return {
        passed: false,
        name: 'Branch name available',
        message: validation.reason,
        level: 'error',
        suggestions: suggestions,
      };
    }

    return {
      passed: true,
      name: 'Branch name available',
      message: this.branchName,
      level: 'info',
    };
  }

  private async checkBranchHasNoClosedPR(): Promise<CheckResult> {
    try {
      // Initialize GitHub integration
      const initialized = await this.githubIntegration.initialize();
      if (!initialized) {
        // GitHub not configured - skip this check
        return {
          passed: true,
          name: 'No closed/merged PR',
          message: 'GitHub not configured (skipped)',
          level: 'info',
        };
      }

      // Check if branch has an existing PR (search all states including closed/merged)
      const pr = await this.githubIntegration.getPullRequestForBranch(this.branchName, 'all');

      if (pr && (pr.merged || pr.state === 'closed')) {
        // Generate suggestion for incremented branch name
        const suggestion = this.generateIncrementedBranchName(this.branchName);

        return {
          passed: this.force ? true : false,
          name: 'No closed/merged PR',
          message: `Branch "${this.branchName}" has a ${pr.merged ? 'merged' : 'closed'} PR (#${pr.number})`,
          level: this.force ? 'warning' : 'error',
          suggestions: this.force
            ? []
            : [
              'Use a different branch name to ensure clean workflow',
              `Try: ${suggestion}`,
              'Or use --force to override (not recommended)',
            ],
        };
      }

      return {
        passed: true,
        name: 'No closed/merged PR',
        level: 'info',
      };
    } catch (error) {
      // If GitHub check fails, don't block the workflow
      return {
        passed: true,
        name: 'No closed/merged PR',
        message: 'Check skipped (GitHub unavailable)',
        level: 'info',
      };
    }
  }

  private generateIncrementedBranchName(branchName: string): string {
    // Extract type and description
    const match = branchName.match(/^([^/]+)\/(.+)$/);
    if (!match?.[1] || !match?.[2]) {
      return `${branchName}-v2`;
    }

    const type = match[1];
    const description = match[2];

    // Check if already has version suffix
    const versionMatch = description.match(/^(.+)-v(\d+)$/);
    if (versionMatch?.[1] && versionMatch?.[2]) {
      const baseDesc = versionMatch[1];
      const version = versionMatch[2];
      const nextVersion = parseInt(version, 10) + 1;
      return `${type}/${baseDesc}-v${nextVersion}`;
    }

    return `${type}/${description}-v2`;
  }
}

/**
 * Post-flight checks for launch command
 */
class LaunchPostFlightChecks extends PostFlightChecks {
  constructor(
    private session: WorkflowSession,
    private gitOps: GitOperations,
    private branchName: string,
    private stashPopped: boolean = false
  ) {
    super();
    this.setupVerifications();
  }

  private setupVerifications(): void {
    this.addVerification(async () => this.verifySessionCreated());
    this.addVerification(async () => this.verifyBranchCreated());
    this.addVerification(async () => this.verifyBranchCheckedOut());
    this.addVerification(async () => this.verifySessionState());
    if (!this.stashPopped) {
      this.addVerification(async () => this.verifyNoUncommittedChanges());
    }
  }

  private async verifySessionCreated(): Promise<CheckResult> {
    return {
      passed: !!this.session,
      name: 'Session created',
      message: this.session ? `ID: ${this.session.id.substring(0, 8)}...` : undefined,
      level: 'info',
    };
  }

  private async verifyBranchCreated(): Promise<CheckResult> {
    const exists = await this.gitOps.branchExists(this.branchName);

    return {
      passed: exists,
      name: 'Feature branch created',
      message: this.branchName,
      level: 'info',
    };
  }

  private async verifyBranchCheckedOut(): Promise<CheckResult> {
    const currentBranch = await this.gitOps.getCurrentBranch();
    const isCorrect = currentBranch === this.branchName;

    return {
      passed: isCorrect,
      name: 'Branch checked out',
      message: currentBranch,
      level: 'info',
    };
  }

  private async verifySessionState(): Promise<CheckResult> {
    const isCorrect = this.session.currentState === 'BRANCH_READY';

    return {
      passed: isCorrect,
      name: 'Session state',
      message: this.session.currentState,
      level: 'info',
    };
  }

  private async verifyNoUncommittedChanges(): Promise<CheckResult> {
    const hasChanges = await this.gitOps.hasUncommittedChanges();

    return {
      passed: !hasChanges,
      name: 'No uncommitted changes',
      level: 'info',
    };
  }
}

/**
 * Enhanced Launch Command with Pre/Post-Flight Checks
 */
export class LaunchCommandV2 {
  private output = new ConsoleOutput();
  private progress = new WorkflowProgress();
  private configManager: ConfigurationManager;
  private sessionRepo: SessionRepository;
  private gitOps: GitOperations;
  private branchValidator: BranchValidator;
  private branchNaming: BranchNamingService;
  private githubIntegration: GitHubIntegration;
  private stashManager: StashManager;
  private abortCommand: AbortCommandV2;

  constructor(basePath: string = '.hansolo') {
    this.configManager = new ConfigurationManager(basePath);
    this.sessionRepo = new SessionRepository(basePath);
    this.gitOps = new GitOperations();
    this.branchValidator = new BranchValidator(basePath);
    this.branchNaming = new BranchNamingService();
    this.githubIntegration = new GitHubIntegration(basePath);
    this.stashManager = new StashManager(basePath);
    this.abortCommand = new AbortCommandV2(basePath);
  }

  async execute(options: {
    branchName?: string;
    force?: boolean;
    description?: string;
    stashRef?: string;
    popStash?: boolean;
  } = {}): Promise<void> {
    try {
      // Check initialization
      if (!(await this.configManager.isInitialized())) {
        this.output.errorMessage('han-solo is not initialized');
        this.output.infoMessage('Run "hansolo init" first');
        return;
      }

      // Determine branch name with intelligent fallback
      let branchName: string;

      if (options.branchName) {
        // Branch name provided - validate it
        const validation = this.branchNaming.validate(options.branchName);

        if (!validation.isValid) {
          this.output.warningMessage(
            `⚠️  Branch name "${options.branchName}" doesn't follow standard conventions`
          );
          this.output.info(`   ${validation.message}`);

          if (validation.suggestions && validation.suggestions.length > 0) {
            this.output.info('\n💡 Suggested names:');
            validation.suggestions.forEach((suggestion, index) => {
              this.output.info(`   ${index + 1}. ${suggestion}`);
            });
            this.output.info('');
          }

          // In non-interactive mode (MCP), use first suggestion or continue with provided name
          if (
            validation.suggestions &&
            validation.suggestions.length > 0 &&
            validation.suggestions[0]
          ) {
            branchName = validation.suggestions[0];
            this.output.infoMessage(`Using suggested name: ${branchName}`);
          } else if (options.branchName) {
            branchName = options.branchName;
            this.output.warningMessage('Continuing with non-standard branch name');
          } else {
            // Fallback to timestamp if all else fails
            branchName = this.branchNaming.generateFromTimestamp();
            this.output.infoMessage(`Generated fallback branch name: ${branchName}`);
          }
        } else {
          branchName = options.branchName;
        }
      } else if (options.description) {
        // No branch name but description provided - generate from description
        branchName = this.branchNaming.generateFromDescription(options.description);
        this.output.infoMessage(`Generated branch name: ${branchName}`);
      } else {
        // No branch name or description - try to generate from git changes
        const hasChanges = await this.gitOps.hasUncommittedChanges();

        if (hasChanges && !options.stashRef) {
          const fromChanges = await this.branchNaming.generateFromChanges();

          if (fromChanges) {
            branchName = fromChanges;
            this.output.infoMessage(`Generated branch name from changes: ${branchName}`);
          } else {
            // Fallback to timestamp
            branchName = this.branchNaming.generateFromTimestamp();
            this.output.infoMessage(`Generated branch name: ${branchName}`);
          }
        } else {
          // No changes - use timestamp
          branchName = this.branchNaming.generateFromTimestamp();
          this.output.infoMessage(`Generated branch name: ${branchName}`);
        }
      }

      // Handle uncommitted changes and session management (AFTER branch name generation)
      const currentBranch = await this.gitOps.getCurrentBranch();
      const activeSession = await this.sessionRepo.getSessionByBranch(currentBranch);
      const hasChanges = await this.stashManager.hasUncommittedChanges();

      let stashRef: string | undefined;

      // Always stash uncommitted changes if present
      if (hasChanges) {
        this.output.info('📦 Stashing uncommitted changes...');
        const stashResult = await this.stashManager.stashChanges('launch', currentBranch);
        stashRef = stashResult.stashRef;
        this.output.dim(`   Stashed as: ${stashResult.stashRef}`);
      }

      // Abort active session if it exists
      if (activeSession && activeSession.isActive()) {
        this.output.warningMessage(`⚠️  Current session on '${currentBranch}' will be aborted`);
        this.output.dim('   Launching new workflow will terminate the current session');

        await this.abortCommand.execute({ yes: true });
        this.output.dim('   Session aborted');
      }

      // Pass stashRef to restore work on new branch
      if (stashRef) {
        options.stashRef = stashRef;
        options.popStash = true;
      }

      // Run pre-flight checks
      const preFlightChecks = new LaunchPreFlightChecks(
        this.gitOps,
        this.sessionRepo,
        this.branchValidator,
        branchName,
        this.githubIntegration,
        options.force
      );

      const preFlightPassed = await preFlightChecks.runChecks({
        command: 'launch',
        options,
      });

      if (!preFlightPassed) {
        this.output.errorMessage('\n❌ Pre-flight checks failed - aborting launch');
        return;
      }

      // Execute launch workflow
      let session: WorkflowSession | undefined;

      const steps = [
        {
          name: 'Creating workflow session',
          action: async () => {
            session = await this.createSession(branchName, options.description);
          },
        },
        {
          name: 'Creating feature branch',
          action: async () => await this.createBranch(branchName),
        },
        {
          name: 'Setting up workflow environment',
          action: async () => await this.setupEnvironment(branchName),
        },
      ];

      // Add stash pop step if stashRef provided
      if (options.stashRef && (options.popStash !== false)) {
        steps.push({
          name: `Restoring work from ${options.stashRef}`,
          action: async () => await this.popStash(options.stashRef!),
        });
      }

      await this.progress.runSteps(steps);

      if (!session) {
        throw new Error('Failed to create session');
      }

      // Run post-flight verifications
      const postFlightChecks = new LaunchPostFlightChecks(
        session,
        this.gitOps,
        branchName,
        !!(options.stashRef && options.popStash !== false)
      );

      await postFlightChecks.runVerifications({
        command: 'launch',
        session,
        options,
      });

      this.output.info('');
      this.output.successMessage(`✅ Workflow launched on branch: ${branchName}`);
      this.output.infoMessage('\nNext steps:');
      this.output.dim('  1. Make your changes');
      this.output.dim('  2. Run /hansolo:ship to complete the workflow');
    } catch (error) {
      this.output.errorMessage(
        `Launch failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  private async createSession(
    branchName: string,
    _description?: string
  ): Promise<WorkflowSession> {
    const session = new WorkflowSession({
      branchName,
      workflowType: 'launch',
      metadata: {
        projectPath: process.cwd(),
        startedAt: new Date().toISOString(),
      },
    });

    await this.sessionRepo.createSession(session);
    session.transitionTo('BRANCH_READY', 'user_action');
    await this.sessionRepo.updateSession(session.id, session);

    return session;
  }

  private async createBranch(branchName: string): Promise<void> {
    await this.gitOps.createBranch(branchName);
    await this.gitOps.checkoutBranch(branchName);
  }

  private async setupEnvironment(_branchName: string): Promise<void> {
    // Future: Setup project-specific environment
    // For now, just a placeholder
  }

  private async popStash(stashRef: string): Promise<void> {
    await this.gitOps.stashPopSpecific(stashRef);
    this.output.dim(`Work restored from ${stashRef}`);
  }
}
