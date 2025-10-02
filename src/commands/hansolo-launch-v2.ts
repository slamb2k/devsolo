import { ConsoleOutput } from '../ui/console-output';
import { WorkflowProgress } from '../ui/progress-indicators';
import { ConfigurationManager } from '../services/configuration-manager';
import { SessionRepository } from '../services/session-repository';
import { GitOperations } from '../services/git-operations';
import { WorkflowSession } from '../models/workflow-session';
import { BranchValidator } from '../services/validation/branch-validator';
import { PreFlightChecks, PostFlightChecks, CheckResult } from '../services/validation/pre-flight-checks';
import { AsciiArt } from '../ui/ascii-art';

/**
 * Pre-flight checks for launch command
 */
class LaunchPreFlightChecks extends PreFlightChecks {
  constructor(
    private gitOps: GitOperations,
    private sessionRepo: SessionRepository,
    private branchValidator: BranchValidator,
    private branchName: string,
    private force?: boolean
  ) {
    super();
    this.setupChecks();
  }

  private setupChecks(): void {
    this.addCheck(async () => this.checkOnMainBranch());
    this.addCheck(async () => this.checkWorkingDirectoryClean());
    this.addCheck(async () => this.checkMainUpToDate());
    this.addCheck(async () => this.checkNoExistingSession());
    this.addCheck(async () => this.checkBranchNameAvailable());
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

  private async checkWorkingDirectoryClean(): Promise<CheckResult> {
    const isClean = await this.gitOps.isClean();

    if (!isClean && !this.force) {
      return {
        passed: false,
        name: 'Working directory clean',
        message: 'Uncommitted changes detected',
        level: 'error',
        suggestions: ['Commit or stash changes', 'Use --force to override'],
      };
    }

    return {
      passed: true,
      name: 'Working directory clean',
      message: isClean ? undefined : 'Has changes (--force)',
      level: isClean ? 'info' : 'warning',
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
}

/**
 * Post-flight checks for launch command
 */
class LaunchPostFlightChecks extends PostFlightChecks {
  constructor(
    private session: WorkflowSession,
    private gitOps: GitOperations,
    private branchName: string
  ) {
    super();
    this.setupVerifications();
  }

  private setupVerifications(): void {
    this.addVerification(async () => this.verifySessionCreated());
    this.addVerification(async () => this.verifyBranchCreated());
    this.addVerification(async () => this.verifyBranchCheckedOut());
    this.addVerification(async () => this.verifySessionState());
    this.addVerification(async () => this.verifyNoUncommittedChanges());
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

  constructor(basePath: string = '.hansolo') {
    this.configManager = new ConfigurationManager(basePath);
    this.sessionRepo = new SessionRepository(basePath);
    this.gitOps = new GitOperations();
    this.branchValidator = new BranchValidator(basePath);
  }

  async execute(options: {
    branchName?: string;
    force?: boolean;
    description?: string;
  } = {}): Promise<void> {
    try {
      // Check initialization
      if (!(await this.configManager.isInitialized())) {
        this.output.errorMessage('han-solo is not initialized');
        this.output.infoMessage('Run "hansolo init" first');
        return;
      }

      // Generate branch name if not provided
      const branchName = options.branchName || this.generateBranchName(options.description);

      // Validate branch name format
      if (!this.isValidBranchName(branchName)) {
        this.output.errorMessage(`Invalid branch name: ${branchName}`);
        this.output.infoMessage('Branch names must follow Git naming conventions');
        return;
      }

      // Run pre-flight checks
      const preFlightChecks = new LaunchPreFlightChecks(
        this.gitOps,
        this.sessionRepo,
        this.branchValidator,
        branchName,
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

      // Display ASCII art banner
      this.output.info(AsciiArt.launch());

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

      await this.progress.runSteps(steps);

      if (!session) {
        throw new Error('Failed to create session');
      }

      // Run post-flight verifications
      const postFlightChecks = new LaunchPostFlightChecks(
        session,
        this.gitOps,
        branchName
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

  private generateBranchName(description?: string): string {
    if (!description) {
      const timestamp = new Date().toISOString().split('T')[0];
      return `feature/${timestamp}`;
    }

    // Convert description to kebab-case
    const slug = description
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    return `feature/${slug}`;
  }

  private isValidBranchName(name: string): boolean {
    // Git branch name rules
    return (
      name.length > 0 &&
      !/[\s~^:?*[\]\\]/.test(name) &&
      !name.endsWith('.lock') &&
      !name.startsWith('.') &&
      !name.endsWith('/')
    );
  }
}
