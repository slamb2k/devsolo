import {
  BaseMCPTool,
  WorkflowToolInput,
  WorkflowContext,
  WorkflowExecutionResult,
} from './workflow-tool-base';
import { BaseToolResult } from './base-tool';
import { ConfigurationManager } from '../../services/configuration-manager';

/**
 * Input for status-line tool
 */
export interface StatusLineToolInput extends WorkflowToolInput {
  action: 'enable' | 'disable' | 'update' | 'show';
  format?: string;
  showBranchInfo?: boolean;
  showSessionInfo?: boolean;
  showStateInfo?: boolean;
}

/**
 * StatusLine tool - Manages Claude Code status line display
 */
export class StatusLineTool extends BaseMCPTool<StatusLineToolInput, BaseToolResult> {
  constructor(configManager: ConfigurationManager) {
    super(configManager);
  }

  protected getBanner(): string {
    return `░█▀▀░▀█▀░█▀█░▀█▀░█░█░█▀▀░░░█░░░▀█▀░█▀█░█▀▀░
░▀▀█░░█░░█▀█░░█░░█░█░▀▀█░░░█░░░░█░░█░█░█▀▀░
░▀▀▀░░▀░░▀░▀░░▀░░▀▀▀░▀▀▀░░░▀▀▀░▀▀▀░▀░▀░▀▀▀░`;
  }

  protected async executeWorkflow(
    context: WorkflowContext
  ): Promise<WorkflowExecutionResult> {
    const input = context.input as StatusLineToolInput;
    const config = await this.configManager.load();

    switch (input.action) {
    case 'enable':
      config.preferences = config.preferences || {} as any;
      config.preferences.statusLine = {
        enabled: true,
        format: input.format || '{icon} {branch} {state}',
        showBranchInfo: input.showBranchInfo !== false,
        showSessionInfo: input.showSessionInfo !== false,
        showStateInfo: input.showStateInfo !== false,
      };
      await this.configManager.save(config);
      return {
        success: true,
        warnings: ['Status line enabled'],
      };

    case 'disable':
      if (config.preferences?.statusLine) {
        config.preferences.statusLine.enabled = false;
        await this.configManager.save(config);
      }
      return {
        success: true,
        warnings: ['Status line disabled'],
      };

    case 'update':
      if (!config.preferences?.statusLine) {
        return {
          success: false,
          errors: ['Status line not configured. Use action: "enable" first.'],
        };
      }

      if (input.format) {
        config.preferences.statusLine.format = input.format;
      }
      if (input.showBranchInfo !== undefined) {
        config.preferences.statusLine.showBranchInfo = input.showBranchInfo;
      }
      if (input.showSessionInfo !== undefined) {
        config.preferences.statusLine.showSessionInfo = input.showSessionInfo;
      }
      if (input.showStateInfo !== undefined) {
        config.preferences.statusLine.showStateInfo = input.showStateInfo;
      }

      await this.configManager.save(config);
      return {
        success: true,
        warnings: ['Status line updated'],
      };

    case 'show':
      return {
        success: true,
        warnings: [
          `Status line: ${config.preferences?.statusLine?.enabled ? 'enabled' : 'disabled'}`,
          `Format: ${config.preferences?.statusLine?.format || 'default'}`,
        ],
      };

    default:
      return {
        success: false,
        errors: [`Unknown action: ${input.action}`],
      };
    }
  }
}
