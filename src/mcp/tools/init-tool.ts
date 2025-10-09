import { MCPTool, BaseToolResult, createErrorResult } from './base-tool';
import { ConfigurationManager } from '../../services/configuration-manager';
import { GitOperations } from '../../services/git-operations';

/**
 * Input for init tool
 */
export interface InitToolInput {
  scope?: 'project' | 'user';
  force?: boolean;
}

/**
 * Init tool - Initializes han-solo in the project
 */
export class InitTool implements MCPTool<InitToolInput, BaseToolResult> {
  constructor(
    private configManager: ConfigurationManager,
    private gitOps: GitOperations
  ) {}

  async execute(input: InitToolInput): Promise<BaseToolResult> {
    try {
      // Check if already initialized
      const isInitialized = await this.configManager.isInitialized();

      if (isInitialized && !input.force) {
        return {
          success: false,
          warnings: ['han-solo is already initialized. Use force: true to reinitialize.'],
        };
      }

      // Check if in a git repository
      const isGitRepo = await this.gitOps.isGitRepository();

      if (!isGitRepo) {
        return {
          success: false,
          errors: ['Not a git repository. Initialize git first with: git init'],
        };
      }

      // Initialize configuration
      await this.configManager.initialize();

      // Create default configuration
      const config = await this.configManager.load();
      config.scope = input.scope || 'project';

      // Set default preferences
      if (!config.preferences) {
        config.preferences = {
          defaultBranchPrefix: 'feature',
          autoCleanup: true,
          confirmBeforePush: false,
          colorOutput: true,
          prTemplate: {
            body: '## Summary\n\n{{description}}\n\n## Changes\n\n{{commits}}',
            footer: '\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-Authored-By: Claude <noreply@anthropic.com>',
          },
        };
      }

      await this.configManager.save(config);

      return {
        success: true,
        warnings: [
          'han-solo initialized successfully!',
          `Scope: ${config.scope}`,
          'Use hansolo_launch to start a new workflow',
        ],
      };
    } catch (error) {
      return createErrorResult(error, 'InitTool');
    }
  }
}
