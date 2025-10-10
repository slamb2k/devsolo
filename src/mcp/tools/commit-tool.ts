import { MCPTool, SessionToolResult, createErrorResult } from './base-tool';
import { GitOperations } from '../../services/git-operations';
import { SessionRepository } from '../../services/session-repository';
import { ConfigurationManager } from '../../services/configuration-manager';

/**
 * Input for commit tool
 */
export interface CommitToolInput {
  message?: string;
  stagedOnly?: boolean;
}

/**
 * Commit tool - Commits changes with a message
 */
export class CommitTool implements MCPTool<CommitToolInput, SessionToolResult> {
  constructor(
    private gitOps: GitOperations,
    private sessionRepo: SessionRepository,
    private configManager: ConfigurationManager
  ) {}

  async execute(input: CommitToolInput): Promise<SessionToolResult> {
    try {
      // Check initialization
      if (!(await this.configManager.isInitialized())) {
        return {
          success: false,
          errors: ['han-solo is not initialized. Run hansolo_init first.'],
        };
      }

      // Get current session
      const currentBranch = await this.gitOps.getCurrentBranch();
      const session = await this.sessionRepo.getSessionByBranch(currentBranch);

      if (!session) {
        return {
          success: false,
          errors: [`No workflow session found for branch '${currentBranch}'.`],
        };
      }

      // Prompt-based parameter collection: handle missing message
      if (!input.message) {
        const status = await this.gitOps.getStatus();
        const changedFiles = [...status.staged, ...status.modified, ...status.created, ...status.deleted];

        if (changedFiles.length === 0) {
          return {
            success: false,
            warnings: ['No changes to commit'],
          };
        }

        // Get raw diff for Claude to analyze
        const diff = await this.gitOps.getDiff();

        return {
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
        };
      }

      // Check for changes
      const status = await this.gitOps.getStatus();
      const hasChanges = status.staged.length > 0 || status.modified.length > 0 || status.created.length > 0 || status.deleted.length > 0;

      if (!hasChanges) {
        return {
          success: false,
          warnings: ['No changes to commit'],
        };
      }

      // Stage and commit
      if (!input.stagedOnly) {
        // Stage all changes
        await this.gitOps.stageAll();
      }

      // Commit with message
      await this.gitOps.commit(input.message);

      // Update session state
      session.transitionTo('CHANGES_COMMITTED', 'user_action');
      await this.sessionRepo.updateSession(session.id, session);

      return {
        success: true,
        sessionId: session.id,
        branchName: session.branchName,
        state: session.currentState,
        nextSteps: ['Use hansolo_ship to push, create PR, and merge'],
      };
    } catch (error) {
      return createErrorResult(error, 'CommitTool');
    }
  }
}
