// Tool interface is now just a type structure, not an interface to implement
import { SessionRepository } from '../../services/session-repository';
import { GitOperations } from '../../services/git-operations';
import { GitHubIntegration } from '../../services/github-integration';
import { LaunchWorkflowStateMachine } from '../../state-machines/launch-workflow';

export interface ExecuteWorkflowStepInput {
  sessionId: string;
  action: 'commit' | 'push' | 'create-pr' | 'merge' | 'next';
  data?: {
    commitMessage?: string;
    prTitle?: string;
    prBody?: string;
  };
}

export interface ExecuteWorkflowStepOutput {
  success: boolean;
  currentState?: string;
  nextStates?: string[];
  message?: string;
  error?: string;
  data?: any;
}

export class ExecuteWorkflowStepTool {
  name = 'execute-workflow-step';
  description = 'Execute a step in the workflow state machine';
  
  inputSchema = {
    type: 'object' as const,
    properties: {
      sessionId: {
        type: 'string',
        description: 'Session ID of the workflow'
      },
      action: {
        type: 'string',
        enum: ['commit', 'push', 'create-pr', 'merge', 'next'],
        description: 'Action to execute'
      },
      data: {
        type: 'object',
        properties: {
          commitMessage: { type: 'string' },
          prTitle: { type: 'string' },
          prBody: { type: 'string' }
        }
      }
    },
    required: ['sessionId', 'action']
  };

  private sessionRepo: SessionRepository;
  private gitOps: GitOperations;
  private github: GitHubIntegration;
  private stateMachine: LaunchWorkflowStateMachine;

  constructor() {
    this.sessionRepo = new SessionRepository('.hansolo');
    this.gitOps = new GitOperations();
    this.github = new GitHubIntegration();
    this.stateMachine = new LaunchWorkflowStateMachine();
  }

  async execute(input: ExecuteWorkflowStepInput): Promise<ExecuteWorkflowStepOutput> {
    try {
      // Get the session
      const session = await this.sessionRepo.getSession(input.sessionId);
      if (!session) {
        return {
          success: false,
          error: 'Session not found'
        };
      }

      let result: any = {};

      // Execute the action
      switch (input.action) {
        case 'commit':
          if (!input.data?.commitMessage) {
            return {
              success: false,
              error: 'Commit message required'
            };
          }
          await this.gitOps.add();
          const commitResult = await this.gitOps.commit(input.data.commitMessage);
          result = { commit: commitResult.commit };
          session.currentState = 'CHANGES_COMMITTED';
          break;

        case 'push':
          await this.gitOps.push('origin', session.branchName);
          session.currentState = 'PUSHED';
          result = { pushed: true };
          break;

        case 'create-pr':
          if (!input.data?.prTitle) {
            return {
              success: false,
              error: 'PR title required'
            };
          }
          const pr = await this.github.createPullRequest({
            title: input.data.prTitle,
            body: input.data.prBody || '',
            head: session.branchName,
            base: 'main'
          });
          if (pr) {
            result = { prNumber: pr.number, prUrl: pr.html_url };
          }
          session.currentState = 'PR_CREATED';
          break;

        case 'merge':
          // This would require PR number from session metadata
          session.currentState = 'MERGING';
          break;

        case 'next':
          // Transition to next valid state
          const nextStates = this.stateMachine.getNextStates(session.currentState);
          if (nextStates.length > 0 && nextStates[0]) {
            const transitionResult = await this.stateMachine.transition(
              session.currentState,
              nextStates[0]
            );
            if (transitionResult.success) {
              session.currentState = transitionResult.toState;
            }
          }
          break;
      }

      // Save updated session
      await this.sessionRepo.updateSession(session.id, session);

      return {
        success: true,
        currentState: session.currentState,
        nextStates: this.stateMachine.getNextStates(session.currentState),
        message: `Action '${input.action}' executed successfully`,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}