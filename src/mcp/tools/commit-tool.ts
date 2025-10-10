import {
  BaseMCPTool,
  WorkflowToolInput,
  WorkflowContext,
  PromptCollectionResult,
  WorkflowExecutionResult,
} from './workflow-tool-base';
import { SessionToolResult } from './base-tool';
import { GitOperations } from '../../services/git-operations';
import { SessionRepository } from '../../services/session-repository';
import { ConfigurationManager } from '../../services/configuration-manager';
import { WorkflowSession } from '../../models/workflow-session';

/**
 * Input for commit tool
 */
export interface CommitToolInput extends WorkflowToolInput {
  message?: string;
  stagedOnly?: boolean;
}

/**
 * Commit tool - Commits changes with a message
 */
export class CommitTool extends BaseMCPTool<CommitToolInput, SessionToolResult> {
  constructor(
    private gitOps: GitOperations,
    private sessionRepo: SessionRepository,
    configManager: ConfigurationManager
  ) {
    super(configManager);
  }

  protected getBanner(): string {
    return `░█▀▀░█▀█░█▀▄▀█░█▀▄▀█░▀█▀░▀█▀░
░█░░░█░█░█░▀░█░█░▀░█░░█░░░█░░
░▀▀▀░▀▀▀░▀░░░▀░▀░░░▀░▀▀▀░░▀░░`;
  }

  protected async collectMissingParameters(
    input: CommitToolInput
  ): Promise<PromptCollectionResult> {
    // Prompt-based parameter collection: handle missing message
    if (!input.message) {
      const status = await this.gitOps.getStatus();
      const changedFiles = [...status.staged, ...status.modified, ...status.created, ...status.deleted];

      if (changedFiles.length === 0) {
        return {
          collected: false,
          result: {
            success: false,
            warnings: ['No changes to commit'],
          },
        };
      }

      // Get raw diff for Claude to analyze
      const diff = await this.gitOps.getDiff();

      return {
        collected: false,
        result: {
          success: true,
          message: 'No commit message provided. Analyze the changes below and generate an appropriate commit message, or ask the user to provide one.',
          data: {
            changedFiles: changedFiles,
            diff: diff.substring(0, 5000), // Limit diff size, first 5000 chars should be enough
            status: {
              staged: status.staged,
              modified: status.modified,
              created: status.created,
              deleted: status.deleted,
            },
          },
          nextSteps: [
            'Analyze the diff to understand what changed',
            'Generate a conventional commit message (feat/fix/docs/refactor/etc)',
            'OR ask the user what commit message they want to use',
            'Call hansolo_commit again with the message parameter',
          ],
        } as SessionToolResult,
      };
    }

    return { collected: true };
  }

  protected async createContext(_input: CommitToolInput): Promise<Record<string, unknown>> {
    // Get current session
    const currentBranch = await this.gitOps.getCurrentBranch();
    const session = await this.sessionRepo.getSessionByBranch(currentBranch);

    if (!session) {
      throw new Error(`No workflow session found for branch '${currentBranch}'.`);
    }

    // Check for changes
    const status = await this.gitOps.getStatus();
    const hasChanges = status.staged.length > 0 || status.modified.length > 0 || status.created.length > 0 || status.deleted.length > 0;

    if (!hasChanges) {
      throw new Error('No changes to commit');
    }

    return { session };
  }

  protected async executeWorkflow(
    context: WorkflowContext
  ): Promise<WorkflowExecutionResult> {
    const input = context.input as CommitToolInput;
    const session = context['session'] as WorkflowSession;

    // Stage and commit
    if (!input.stagedOnly) {
      // Stage all changes
      await this.gitOps.stageAll();
    }

    // Commit with message
    await this.gitOps.commit(input.message!);

    // Update session state
    session.transitionTo('CHANGES_COMMITTED', 'user_action');
    await this.sessionRepo.updateSession(session.id, session);

    return {
      success: true,
      data: {
        sessionId: session.id,
        branchName: session.branchName,
        state: session.currentState,
        nextSteps: ['Use hansolo_ship to push, create PR, and merge'],
      },
    };
  }
}
