import { ConsoleOutput } from '../ui/console-output';
import { WorkflowProgress } from '../ui/progress-indicators';
import { ConfigurationManager } from '../services/configuration-manager';
import { SessionRepository } from '../services/session-repository';
import { GitOperations } from '../services/git-operations';
import { WorkflowSession } from '../models/workflow-session';
import { LaunchWorkflowStateMachine } from '../state-machines/launch-workflow';

export class LaunchCommand {
  private output = new ConsoleOutput();
  private progress = new WorkflowProgress();
  private configManager: ConfigurationManager;
  private sessionRepo: SessionRepository;
  private gitOps: GitOperations;
  private stateMachine: LaunchWorkflowStateMachine;

  constructor(basePath: string = '.hansolo') {
    this.configManager = new ConfigurationManager(basePath);
    this.sessionRepo = new SessionRepository(basePath);
    this.gitOps = new GitOperations();
    this.stateMachine = new LaunchWorkflowStateMachine();
  }

  async execute(options: {
    branchName?: string;
    force?: boolean;
    description?: string;
  } = {}): Promise<void> {
    this.output.header('🚀 Launching New Feature Workflow');

    try {
      // Check initialization
      if (!await this.configManager.isInitialized()) {
        this.output.errorMessage('han-solo is not initialized');
        this.output.infoMessage('Run "hansolo init" first');
        return;
      }

      // Check for clean working directory
      if (!await this.gitOps.isClean() && !options.force) {
        this.output.errorMessage('Working directory has uncommitted changes');
        this.output.infoMessage('Commit or stash your changes first, or use --force');
        return;
      }

      // Check current branch
      const currentBranch = await this.gitOps.getCurrentBranch();
      if (currentBranch !== 'main' && currentBranch !== 'master') {
        this.output.warningMessage(`Currently on branch '${currentBranch}'`);
        if (!options.force) {
          this.output.infoMessage('Switch to main branch or use --force');
          return;
        }
      }

      // Check for existing session on current branch
      const existingSession = await this.sessionRepo.getSessionByBranch(currentBranch);
      if (existingSession && existingSession.isActive()) {
        this.output.errorMessage(`Active session already exists on branch '${currentBranch}'`);
        this.output.infoMessage('Use "hansolo status" to see active sessions');
        return;
      }

      // Generate branch name if not provided
      const branchName = options.branchName || this.generateBranchName(options.description);

      // Validate branch name
      if (!this.isValidBranchName(branchName)) {
        this.output.errorMessage(`Invalid branch name: ${branchName}`);
        this.output.infoMessage('Branch names must follow Git naming conventions');
        return;
      }

      // Check if branch already exists
      const branches = await this.gitOps.listBranches();
      if (branches.includes(branchName)) {
        this.output.errorMessage(`Branch '${branchName}' already exists`);
        this.output.infoMessage('Choose a different branch name');
        return;
      }

      // Execute launch workflow steps
      const steps = [
        {
          name: 'Creating workflow session',
          action: async () => await this.createSession(branchName),
        },
        {
          name: 'Creating feature branch',
          action: async () => await this.createBranch(branchName),
        },
        {
          name: 'Setting up workflow environment',
          action: async () => await this.setupEnvironment(branchName),
        },
        {
          name: 'Initializing state machine',
          action: async () => await this.initializeStateMachine(branchName),
        },
      ];

      const results = await this.progress.runSteps<WorkflowSession | void>(steps as any);
      const session = results[0] as WorkflowSession;

      this.output.newline();
      this.output.successMessage('Feature workflow launched successfully!');

      // Display session info
      this.output.box(
        `Session ID: ${session.id.substring(0, 8)}\n` +
        `Branch: ${session.branchName}\n` +
        `State: ${this.output.formatState(session.currentState)}\n` +
        `Type: ${session.workflowType}\n\n` +
        `Next steps:\n` +
        `1. Make your changes\n` +
        `2. Run "hansolo ship" to complete the workflow`,
        '✨ Workflow Ready'
      );

      // Show status
      await this.showStatus(session);

    } catch (error) {
      this.output.errorMessage(`Launch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  private generateBranchName(description?: string): string {
    const timestamp = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const prefix = 'feature';

    if (description) {
      // Convert description to branch-friendly format
      const sanitized = description
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 30);
      return `${prefix}/${timestamp}-${sanitized}`;
    }

    return `${prefix}/${timestamp}-new-feature`;
  }

  private isValidBranchName(name: string): boolean {
    // Cannot be protected branches
    const protectedBranches = ['main', 'master', 'develop'];
    if (protectedBranches.includes(name)) {
      return false;
    }

    // Must follow Git naming rules
    const validBranchRegex = /^[^/][\w\-./]+$/;
    if (!validBranchRegex.test(name)) {
      return false;
    }

    // Cannot have spaces
    if (name.includes(' ')) {
      return false;
    }

    return true;
  }

  private async createSession(branchName: string): Promise<WorkflowSession> {
    const session = new WorkflowSession({
      workflowType: 'launch',
      branchName,
      metadata: {
        projectPath: process.cwd(),
        userName: await this.gitOps.getConfig('user.name') || 'unknown',
        userEmail: await this.gitOps.getConfig('user.email') || 'unknown',
      },
    });

    await this.sessionRepo.createSession(session);
    return session;
  }

  private async createBranch(branchName: string): Promise<void> {
    await this.gitOps.createBranch(branchName, 'main');
    this.output.dim(`Created and checked out branch: ${branchName}`);
  }

  private async setupEnvironment(_branchName: string): Promise<void> {
    // Set up any branch-specific configuration
    await this.configManager.load();

    // You could add branch-specific settings here
    this.output.dim('Workflow environment configured');
  }

  private async initializeStateMachine(branchName: string): Promise<void> {
    const session = await this.sessionRepo.getSessionByBranch(branchName);
    if (!session) {
      throw new Error('Session not found after creation');
    }

    // Transition to BRANCH_READY state
    await this.stateMachine.transition('INIT', 'BRANCH_READY');
    session.transitionTo('BRANCH_READY');
    await this.sessionRepo.updateSession(session.id, session);

    this.output.dim('State machine initialized: BRANCH_READY');
  }

  private async showStatus(session: WorkflowSession): Promise<void> {
    this.output.subheader('Current Status');

    const gitStatus = await this.gitOps.getBranchStatus();
    const statusData = [
      ['Session ID', session.id.substring(0, 8)],
      ['Branch', session.branchName],
      ['State', session.currentState],
      ['Clean', gitStatus.isClean ? '✅' : '❌'],
      ['Ahead', gitStatus.ahead.toString()],
      ['Behind', gitStatus.behind.toString()],
    ];

    this.output.table(['Property', 'Value'], statusData);

    // Show next actions
    const nextActions = this.stateMachine.getAllowedActions(session.currentState);
    if (nextActions.length > 0) {
      this.output.subheader('Available Actions');
      this.output.list(nextActions.map(action => `hansolo ${action}`));
    }
  }

  async resume(branchName?: string): Promise<void> {
    this.output.header('📂 Resuming Workflow');

    try {
      // Find session
      let session: WorkflowSession | null = null;

      if (branchName) {
        session = await this.sessionRepo.getSessionByBranch(branchName);
      } else {
        const currentBranch = await this.gitOps.getCurrentBranch();
        session = await this.sessionRepo.getSessionByBranch(currentBranch);
      }

      if (!session) {
        this.output.errorMessage('No workflow session found');
        this.output.infoMessage('Use "hansolo launch" to start a new workflow');
        return;
      }

      if (!session.canResume()) {
        if (session.isExpired()) {
          this.output.errorMessage('Session has expired');
        } else {
          this.output.errorMessage('Session is not resumable');
        }
        return;
      }

      // Switch to branch if needed
      const currentBranch = await this.gitOps.getCurrentBranch();
      if (currentBranch !== session.branchName) {
        await this.progress.gitOperation('checkout', async () => {
          await this.gitOps.checkoutBranch(session.branchName);
        });
      }

      this.output.successMessage(`Resumed workflow on branch: ${session.branchName}`);
      await this.showStatus(session);

    } catch (error) {
      this.output.errorMessage(`Resume failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }
}