import { ConsoleOutput } from '../ui/console-output';
import { WorkflowProgress } from '../ui/progress-indicators';
import { SessionRepository } from '../services/session-repository';
import { GitOperations } from '../services/git-operations';
import { WorkflowSession } from '../models/workflow-session';

export interface CreateSessionOptions {
  branchName: string;
  description?: string;
  stashRef?: string;
  popStash?: boolean;
}

export interface CreateSessionResult {
  session: WorkflowSession;
  branchName: string;
}

/**
 * CreateSessionCommand - Pure session creation logic
 * Used by both Launch and Swap commands to create new workflow sessions
 */
export class CreateSessionCommand {
  private output: ConsoleOutput;
  private progress: WorkflowProgress;
  private sessionRepo: SessionRepository;
  private gitOps: GitOperations;

  constructor(basePath: string = '.hansolo') {
    this.output = new ConsoleOutput();
    this.progress = new WorkflowProgress();
    this.sessionRepo = new SessionRepository(basePath);
    this.gitOps = new GitOperations();
  }

  /**
   * Create a new workflow session with branch and optional stash restore
   */
  async execute(options: CreateSessionOptions): Promise<CreateSessionResult> {
    let session: WorkflowSession | undefined;

    const steps = [
      {
        name: 'Creating workflow session',
        action: async () => {
          session = await this.createSession(options.branchName, options.description);
        },
      },
      {
        name: 'Creating feature branch',
        action: async () => await this.createBranch(options.branchName),
      },
      {
        name: 'Setting up workflow environment',
        action: async () => await this.setupEnvironment(options.branchName),
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

    return {
      session,
      branchName: options.branchName,
    };
  }

  /**
   * Create session without progress indicators (for use by other commands)
   */
  async createSilently(options: CreateSessionOptions): Promise<CreateSessionResult> {
    const session = await this.createSession(options.branchName, options.description);
    await this.createBranch(options.branchName);
    await this.setupEnvironment(options.branchName);

    if (options.stashRef && (options.popStash !== false)) {
      await this.popStash(options.stashRef);
    }

    return {
      session,
      branchName: options.branchName,
    };
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
