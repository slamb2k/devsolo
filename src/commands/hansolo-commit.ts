import { ConsoleOutput } from '../ui/console-output';
import { WorkflowProgress } from '../ui/progress-indicators';
import { SessionRepository } from '../services/session-repository';
import { GitOperations } from '../services/git-operations';
import { ConfigurationManager } from '../services/configuration-manager';
import { WorkflowSession } from '../models/workflow-session';
import { getLogger } from '../services/logger';

/**
 * Commit Command - Handles staging and committing changes
 * Requires an active workflow session
 */
export class CommitCommand {
  private output = new ConsoleOutput();
  private progress = new WorkflowProgress();
  private sessionRepo: SessionRepository;
  private gitOps: GitOperations;
  private configManager: ConfigurationManager;

  constructor(basePath: string = '.hansolo') {
    this.sessionRepo = new SessionRepository(basePath);
    this.gitOps = new GitOperations();
    this.configManager = new ConfigurationManager(basePath);
  }

  /**
   * Execute commit command
   * @param options.message - Optional commit message. If not provided, returns prompt asking Claude Code to generate one
   * @param options.stagedOnly - If true, only commit staged files (don't stage all changes)
   * @param options.mcpPrompt - If true, returns prompts instead of displaying them
   * @returns Either a prompt string (orchestration) or success message
   */
  async execute(options: { message?: string; stagedOnly?: boolean; mcpPrompt?: boolean } = {}): Promise<string> {
    const logger = getLogger();

    try {
      logger.debug('Commit command started', 'commit');

      // Check if hansolo is initialized
      if (!(await this.configManager.isInitialized())) {
        const errorMsg = 'han-solo is not initialized. Run "hansolo init" first.';
        this.output.errorMessage(errorMsg);
        throw new Error(errorMsg);
      }

      // Get current branch and session
      const currentBranch = await this.gitOps.getCurrentBranch();
      logger.debug(`Current branch: ${currentBranch}`, 'commit');

      const session = await this.sessionRepo.getSessionByBranch(currentBranch);

      // If no session exists, guide user to launch one
      if (!session) {
        const errorMsg = `No workflow session found for branch '${currentBranch}'. Use "hansolo launch" to start a new workflow.`;
        this.output.errorMessage(errorMsg);
        throw new Error(errorMsg);
      }

      logger.info(`Committing changes for session ${session.id} on branch ${currentBranch}`, 'commit');

      // Check if there are changes to commit
      if (options.stagedOnly) {
        // For staged-only mode, check if there are staged files
        const hasStagedFiles = await this.gitOps.hasStagedFiles();

        if (!hasStagedFiles) {
          const msg = 'No files staged for commit. Use "git add <files>" to stage files, or remove --staged-only to commit all changes.';
          this.output.errorMessage(msg);
          throw new Error(msg);
        }
      } else {
        // For normal mode, check if there are uncommitted changes
        const hasChanges = await this.gitOps.hasUncommittedChanges();

        if (!hasChanges) {
          const msg = 'No uncommitted changes to commit';
          this.output.infoMessage(msg);
          logger.info('Commit command completed - no changes', 'commit');
          return msg;
        }
      }

      // If no message provided, return prompt asking Claude Code to generate one (ORCHESTRATION)
      if (!options.message) {
        const prompt = this.buildMessagePrompt(session);

        if (options.mcpPrompt) {
          // For MCP, return the prompt so Claude Code can execute it
          return prompt;
        }

        // For CLI, display the instructions
        this.output.errorMessage('Commit message required');
        this.output.info('\nPlease provide a commit message:');
        this.output.info(prompt);
        return prompt;
      }

      // Execute the commit
      await this.commitChanges(session, options.message, options.stagedOnly);

      const successMsg = options.stagedOnly
        ? 'Staged files committed successfully'
        : 'Changes committed successfully';
      this.output.successMessage(`✓ ${successMsg}`);
      logger.info('Commit command completed successfully', 'commit');
      return successMsg;

    } catch (error) {
      logger.error(
        `Commit command failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'commit',
        error instanceof Error ? error : undefined
      );

      if (options.mcpPrompt) {
        throw error;
      }

      this.output.errorMessage(
        `Commit failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  /**
   * Build a helpful prompt for Claude Code to generate a commit message
   */
  private buildMessagePrompt(session: WorkflowSession): string {
    return `
To commit these changes, please analyze the staged changes and generate a commit message.

1. Run 'git diff --cached --stat' to see which files changed
2. Run 'git diff --cached' to see the actual code changes (skip if output is too large)
3. Generate a commit message following this format:

   type: brief description (max 50 chars)

   Detailed explanation of what changed and why (2-3 sentences).

   Any important implementation details or notes.

   (Footer will be added automatically)

4. Call commit again with the message parameter:

   hansolo commit --message "your generated commit message here (without footer)"

Session context:
- Branch: ${session.branchName}
- Workflow: ${session.workflowType}
- Description: ${(session.metadata?.context as any)?.description || 'No description'}
`.trim();
  }

  /**
   * Commit changes with the provided message
   */
  private async commitChanges(_session: WorkflowSession, message: string, stagedOnly?: boolean): Promise<void> {
    // Only stage all changes if not in staged-only mode
    if (!stagedOnly) {
      this.progress.start('Staging changes...');
      await this.gitOps.stageAll();
      this.progress.succeed('Changes staged');
    } else {
      // Show what's being committed
      const stagedFiles = await this.gitOps.getStagedFiles();
      this.output.info(`📦 Committing ${stagedFiles.length} staged file(s)`);
    }

    this.progress.start('Committing changes...');

    // Load config to get commit template footer
    const config = await this.configManager.load();
    const footer = config.preferences.commitTemplate?.footer || '';

    let commitMessage = message;

    // Add footer with guaranteed blank line separation
    if (footer) {
      // Ensure there's always a blank line before footer
      if (!commitMessage.endsWith('\n\n')) {
        commitMessage += '\n\n';
      }
      commitMessage += footer;
    }

    // Commit with hooks enabled
    await this.gitOps.commit(commitMessage, { noVerify: false, stagedOnly });

    this.progress.succeed('Changes committed (hooks: lint, typecheck)');
  }
}
