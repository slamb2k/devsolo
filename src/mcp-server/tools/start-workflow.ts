// Tool interface is now just a type structure, not an interface to implement
import { WorkflowSession } from '../../models/workflow-session';
import { SessionRepository } from '../../services/session-repository';
import { GitOperations } from '../../services/git-operations';

export interface StartWorkflowInput {
  workflowType: 'launch' | 'ship' | 'hotfix';
  branchName?: string;
  description?: string;
}

export interface StartWorkflowOutput {
  success: boolean;
  sessionId?: string;
  branchName?: string;
  message?: string;
  error?: string;
}

export class StartWorkflowTool {
  name = 'start-workflow';
  description = 'Start a new han-solo workflow (launch, ship, or hotfix)';
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      workflowType: {
        type: 'string',
        enum: ['launch', 'ship', 'hotfix'],
        description: 'Type of workflow to start'
      },
      branchName: {
        type: 'string',
        description: 'Optional branch name'
      },
      description: {
        type: 'string',
        description: 'Optional workflow description'
      }
    },
    required: ['workflowType']
  };

  private sessionRepo: SessionRepository;
  private gitOps: GitOperations;

  constructor() {
    this.sessionRepo = new SessionRepository('.hansolo');
    this.gitOps = new GitOperations();
  }

  async execute(input: StartWorkflowInput): Promise<StartWorkflowOutput> {
    try {
      // Check if Git is initialized
      if (!await this.gitOps.isInitialized()) {
        return {
          success: false,
          error: 'Git repository not initialized'
        };
      }

      // Check for clean working directory
      if (!await this.gitOps.isClean()) {
        return {
          success: false,
          error: 'Working directory has uncommitted changes'
        };
      }

      // Create workflow session
      const session = new WorkflowSession({
        workflowType: input.workflowType,
        branchName: input.branchName,
        metadata: {
          projectPath: process.cwd(),
          context: input.description ? { description: input.description } : {}
        }
      });

      // Save session
      await this.sessionRepo.saveSession(session);

      // Create branch if it's a launch workflow
      if (input.workflowType === 'launch' && session.branchName) {
        await this.gitOps.createBranch(session.branchName);
      }

      return {
        success: true,
        sessionId: session.id,
        branchName: session.branchName,
        message: `Workflow started successfully`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}