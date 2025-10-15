import {
  BaseMCPTool,
  WorkflowToolInput,
  WorkflowContext,
  WorkflowExecutionResult,
} from './workflow-tool-base';
import { BaseToolResult } from './base-tool';
import { ConfigurationManager } from '../../services/configuration-manager';
import { GitOperations } from '../../services/git-operations';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

/**
 * Input for init tool
 */
export interface InitToolInput extends WorkflowToolInput {
  scope?: 'project' | 'user';
  force?: boolean;
  enableStatusLine?: boolean;
  statusLineScope?: 'local' | 'team';
}

/**
 * Init tool - Initializes devsolo in the project
 */
export class InitTool extends BaseMCPTool<InitToolInput, BaseToolResult> {
  constructor(
    configManager: ConfigurationManager,
    private gitOps: GitOperations,
    server?: Server
  ) {
    super(configManager, server);
  }

  protected getBanner(): string {
    return `░▀█▀░█▀█░▀█▀░▀█▀░▀█▀░█▀█░█░░░▀█▀░█▀▀░▀█▀░█▀█░█▀▀░
░░█░░█░█░░█░░░█░░░█░░█▀█░█░░░░█░░▀▀█░░█░░█░█░█░█░
░▀▀▀░▀░▀░▀▀▀░░▀░░▀▀▀░▀░▀░▀▀▀░▀▀▀░▀▀▀░▀▀▀░▀░▀░▀▀▀░`;
  }

  // Override to allow running when not initialized
  protected async checkInitialization(): Promise<BaseToolResult> {
    // InitTool is allowed to run even when not initialized
    return { success: true };
  }

  protected async createContext(input: InitToolInput): Promise<Record<string, unknown>> {
    // Check if already initialized
    const isInitialized = await this.configManager.isInitialized();

    if (isInitialized && !input.force && !input.auto) {
      throw new Error('devsolo is already initialized. Use force: true to reinitialize.');
    }

    // Check if in a git repository
    const isGitRepo = await this.gitOps.isGitRepository();

    if (!isGitRepo) {
      throw new Error('Not a git repository. Initialize git first with: git init');
    }

    return {
      scope: input.scope || 'project',
      enableStatusLine: input.enableStatusLine ?? true, // Default to true
      statusLineScope: input.statusLineScope || 'team',
    };
  }

  protected async executeWorkflow(
    context: WorkflowContext
  ): Promise<WorkflowExecutionResult> {
    const scope = context['scope'] as 'project' | 'user';
    const enableStatusLine = context['enableStatusLine'] as boolean;
    const statusLineScope = context['statusLineScope'] as 'local' | 'team';

    // Initialize configuration
    await this.configManager.initialize();

    // Create default configuration
    const config = await this.configManager.load();
    config.scope = scope;

    // Set default preferences
    if (!config.preferences) {
      config.preferences = {
        defaultBranchPrefix: 'feature',
        autoCleanup: true,
        confirmBeforePush: false,
        colorOutput: true,
        autoMode: false,
        prTemplate: {
          body: '## Summary\n\n{{description}}\n\n## Changes\n\n{{commits}}',
          footer: '\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-Authored-By: Claude <noreply@anthropic.com>',
        },
      };
    }

    await this.configManager.save(config);

    // Install git hooks
    await this.configManager.installHooks();

    const warnings: string[] = [
      'devsolo initialized successfully!',
      `Scope: ${config.scope}`,
      'Git hooks installed',
    ];

    // Set up status line if requested
    if (enableStatusLine) {
      await this.configManager.installStatusLine();
      await this.configManager.installClaudeCodeSettings(statusLineScope);
      warnings.push(`Status line enabled (${statusLineScope} scope)`);
    }

    warnings.push('Use devsolo_launch to start a new workflow');

    return {
      success: true,
      warnings,
    };
  }
}
