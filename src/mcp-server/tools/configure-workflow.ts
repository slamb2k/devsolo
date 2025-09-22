// Tool interface is now just a type structure, not an interface to implement
import { WorkflowSession } from '../../models/workflow-session';
import { SessionRepository } from '../../services/session-repository';

export interface ConfigureWorkflowInput {
  workflowType: 'launch' | 'ship' | 'hotfix';
  config?: {
    requireTests?: boolean;
    requireReview?: boolean;
    autoMerge?: boolean;
    protectedBranches?: string[];
  };
}

export interface ConfigureWorkflowOutput {
  success: boolean;
  session?: WorkflowSession;
  message?: string;
  error?: string;
}

export class ConfigureWorkflowTool {
  name = 'configure-workflow';
  description = 'Configure workflow settings and create a new session';
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      workflowType: {
        type: 'string',
        enum: ['launch', 'ship', 'hotfix'],
        description: 'Type of workflow to configure'
      },
      config: {
        type: 'object',
        properties: {
          requireTests: {
            type: 'boolean',
            description: 'Require tests to pass before merging'
          },
          requireReview: {
            type: 'boolean',
            description: 'Require code review before merging'
          },
          autoMerge: {
            type: 'boolean',
            description: 'Automatically merge when conditions are met'
          },
          protectedBranches: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of protected branch patterns'
          }
        }
      }
    },
    required: ['workflowType']
  };

  private sessionRepo: SessionRepository;

  constructor() {
    this.sessionRepo = new SessionRepository('.hansolo');
  }

  async execute(input: ConfigureWorkflowInput): Promise<ConfigureWorkflowOutput> {
    try {
      // Store workflow configuration in session metadata
      const metadata: any = {
        projectPath: process.cwd()
      };

      if (input.config) {
        metadata.context = {
          requireTests: input.config.requireTests,
          requireReview: input.config.requireReview,
          autoMerge: input.config.autoMerge,
          protectedBranches: input.config.protectedBranches
        };
      }

      // Create a new session with the workflow type and configuration
      const session = new WorkflowSession({
        workflowType: input.workflowType,
        metadata
      });

      // Save the session
      await this.sessionRepo.saveSession(session);

      return {
        success: true,
        session,
        message: `Workflow configured and session created: ${session.id}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}