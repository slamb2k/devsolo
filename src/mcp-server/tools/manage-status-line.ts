import { SessionRepository } from '../../services/session-repository';
import { ConfigurationManager } from '../../services/configuration-manager';

export interface ManageStatusLineInput {
  action: 'enable' | 'disable' | 'update' | 'show';
  format?: string;
  showSessionInfo?: boolean;
  showBranchInfo?: boolean;
  showStateInfo?: boolean;
}

export interface ManageStatusLineOutput {
  success: boolean;
  enabled: boolean;
  currentFormat?: string;
  preview?: string;
  message?: string;
  error?: string;
}

export class ManageStatusLineTool {
  name = 'manage-status-line';
  description = 'Manage the han-solo status line display';

  inputSchema = {
    type: 'object' as const,
    properties: {
      action: {
        type: 'string',
        enum: ['enable', 'disable', 'update'],
        description: 'Action to perform on status line',
      },
      format: {
        type: 'string',
        description: 'Custom format string for status line',
      },
      showSessionInfo: {
        type: 'boolean',
        description: 'Show session ID in status line',
        default: true,
      },
      showBranchInfo: {
        type: 'boolean',
        description: 'Show branch name in status line',
        default: true,
      },
      showStateInfo: {
        type: 'boolean',
        description: 'Show workflow state in status line',
        default: true,
      },
    },
    required: ['action'],
  };

  private configManager: ConfigurationManager;
  private sessionRepo: SessionRepository;

  constructor() {
    this.configManager = new ConfigurationManager();
    this.sessionRepo = new SessionRepository('.hansolo');
  }

  async execute(input: ManageStatusLineInput): Promise<ManageStatusLineOutput> {
    try {
      await this.configManager.load();

      switch (input.action) {
      case 'enable':
        return await this.enableStatusLine(input);

      case 'disable':
        return await this.disableStatusLine();

      case 'update':
        return await this.updateStatusLine(input);

      case 'show':
        return await this.showStatusLine();

      default:
        return {
          success: false,
          enabled: false,
          error: `Unknown action: ${input.action}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        enabled: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async enableStatusLine(input: ManageStatusLineInput): Promise<ManageStatusLineOutput> {
    const statusLineConfig = {
      enabled: true,
      showSessionInfo: input.showSessionInfo ?? true,
      showBranchInfo: input.showBranchInfo ?? true,
      showStateInfo: input.showStateInfo ?? true,
      format: input.format || this.getDefaultFormat(),
    };

    await this.configManager.set('statusLine', statusLineConfig);
    await this.configManager.save();

    const preview = await this.generatePreview(statusLineConfig);

    return {
      success: true,
      enabled: true,
      currentFormat: statusLineConfig.format,
      preview,
      message: 'Status line enabled',
    };
  }

  private async disableStatusLine(): Promise<ManageStatusLineOutput> {
    await this.configManager.set('statusLine.enabled', false);
    await this.configManager.save();

    return {
      success: true,
      enabled: false,
      message: 'Status line disabled',
    };
  }

  private async updateStatusLine(input: ManageStatusLineInput): Promise<ManageStatusLineOutput> {
    const currentConfig = this.configManager.get('statusLine') || {};

    if (!currentConfig.enabled) {
      return {
        success: false,
        enabled: false,
        error: 'Status line is not enabled. Enable it first.',
      };
    }

    const updatedConfig = {
      ...currentConfig,
      showSessionInfo: input.showSessionInfo ?? currentConfig.showSessionInfo,
      showBranchInfo: input.showBranchInfo ?? currentConfig.showBranchInfo,
      showStateInfo: input.showStateInfo ?? currentConfig.showStateInfo,
      format: input.format || currentConfig.format,
    };

    await this.configManager.set('statusLine', updatedConfig);
    await this.configManager.save();

    const preview = await this.generatePreview(updatedConfig);

    return {
      success: true,
      enabled: true,
      currentFormat: updatedConfig.format,
      preview,
      message: 'Status line updated',
    };
  }

  private async showStatusLine(): Promise<ManageStatusLineOutput> {
    const currentConfig = this.configManager.get('statusLine') || {};

    if (!currentConfig.enabled) {
      return {
        success: true,
        enabled: false,
        message: 'Status line is not enabled. Use action "enable" to enable it.',
      };
    }

    const preview = await this.generatePreview(currentConfig);

    return {
      success: true,
      enabled: true,
      currentFormat: currentConfig.format || this.getDefaultFormat(),
      preview,
      message: 'Current status line configuration',
    };
  }

  private getDefaultFormat(): string {
    return '[han-solo] {session} | {branch} | {state}';
  }

  private async generatePreview(config: any): Promise<string> {
    try {
      // Get current session info for preview
      const sessions = await this.sessionRepo.listSessions();
      const activeSession = sessions.find(s => s.lastUpdated);

      if (!activeSession) {
        return config.format
          .replace('{session}', 'no-session')
          .replace('{branch}', 'main')
          .replace('{state}', 'INIT');
      }

      let preview = config.format;

      if (config.showSessionInfo) {
        preview = preview.replace('{session}', activeSession.id.substring(0, 8));
      } else {
        preview = preview.replace(' {session}', '').replace('{session}', '');
      }

      if (config.showBranchInfo) {
        preview = preview.replace('{branch}', activeSession.gitBranch || 'unknown');
      } else {
        preview = preview.replace(' | {branch}', '').replace('{branch}', '');
      }

      if (config.showStateInfo) {
        preview = preview.replace('{state}', activeSession.currentState || 'INIT');
      } else {
        preview = preview.replace(' | {state}', '').replace('{state}', '');
      }

      return preview;
    } catch {
      return config.format;
    }
  }
}