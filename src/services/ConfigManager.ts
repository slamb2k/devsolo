import fs from 'fs';
import path from 'path';
import * as yaml from 'yaml';
import { InstallationContext } from '../models/InstallationContext';
import { ConfigurationProfile } from '../models/ConfigurationProfile';

export class ConfigManager {
  private readonly CONFIG_FILENAME = 'config.yaml';

  async load(context: InstallationContext): Promise<ConfigurationProfile | null> {
    const configPath = this.getConfigPath(context);

    try {
      if (!fs.existsSync(configPath)) {
        return null;
      }

      const content = fs.readFileSync(configPath, 'utf8');
      const config = yaml.parse(content);

      return this.validateConfig(config);
    } catch (error) {
      console.error('Failed to load configuration:', error);
      return null;
    }
  }

  async save(data: any, context: InstallationContext): Promise<void> {
    const configPath = this.getConfigPath(context);
    const configDir = path.dirname(configPath);

    try {
      // Ensure directory exists
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      // Create configuration object
      const config: ConfigurationProfile = {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        installationType: context.installationType,
        workflow: data.workflow || {
          autoRebase: true,
          squashMerge: true,
          deleteAfterMerge: true,
          requireApproval: true,
          protectedBranches: ['main', 'master'],
          branchNamingPattern: '^(feature|bugfix|hotfix)/[a-z0-9-]+$',
        },
        integrations: data.integrations || {
          github: {
            enabled: context.hasGitHub,
            autoCreatePR: true,
            assignReviewers: true,
            addLabels: true,
          },
          gitlab: {
            enabled: context.hasGitLab,
            autoCreateMR: true,
            assignReviewers: true,
          },
          slack: {
            enabled: false,
            webhookUrl: '',
            notifyOnPR: true,
            notifyOnMerge: true,
          },
        },
        ui: data.ui || {
          colors: true,
          emoji: true,
          timestamps: false,
          verbose: false,
          progressBars: true,
          notifications: true,
        },
        metadata: {
          lastModified: new Date().toISOString(),
          modifiedBy: process.env['USER'] || 'unknown',
          installerVersion: '1.0.0',
        },
      };

      // Convert to YAML with comments
      const yamlContent = this.generateYamlWithComments(config);

      // Write to file
      fs.writeFileSync(configPath, yamlContent, 'utf8');

      // Set appropriate permissions
      fs.chmodSync(configPath, 0o644);

    } catch (error) {
      console.error('Failed to save configuration:', error);
      throw new Error('Could not save configuration');
    }
  }

  async migrate(oldConfig: any, newVersion: string): Promise<ConfigurationProfile> {
    // Perform migration based on version differences
    const migrated: ConfigurationProfile = {
      version: newVersion,
      createdAt: oldConfig.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      installationType: oldConfig.installationType || 'local',
      workflow: {
        ...this.getDefaultWorkflow(),
        ...oldConfig.workflow,
      },
      integrations: {
        ...this.getDefaultIntegrations(),
        ...oldConfig.integrations,
      },
      ui: {
        ...this.getDefaultUI(),
        ...oldConfig.ui,
      },
      metadata: {
        lastModified: new Date().toISOString(),
        modifiedBy: process.env['USER'] || 'unknown',
        installerVersion: newVersion,
        migratedFrom: oldConfig.version,
      },
    };

    return migrated;
  }

  getConfigPath(context: InstallationContext): string {
    const baseDir = context.installationType === 'global'
      ? context.globalPath
      : context.localPath;

    return path.join(baseDir, this.CONFIG_FILENAME);
  }

  private validateConfig(config: any): ConfigurationProfile | null {
    // Basic validation
    if (!config.version || !config.workflow || !config.ui) {
      return null;
    }

    return config as ConfigurationProfile;
  }

  private generateYamlWithComments(config: ConfigurationProfile): string {
    const header = `# devsolo Configuration File
# Version: ${config.version}
# Generated: ${new Date().toISOString()}
# Documentation: https://github.com/devsolo/docs

`;

    const yamlContent = yaml.stringify(config, {
      lineWidth: 0,
      defaultStringType: 'PLAIN',
      defaultKeyType: 'PLAIN',
    });

    // Add section comments
    const commented = yamlContent
      .replace(/^workflow:/m, '# Workflow Settings\nworkflow:')
      .replace(/^integrations:/m, '\n# Integration Settings\nintegrations:')
      .replace(/^ui:/m, '\n# UI Preferences\nui:')
      .replace(/^metadata:/m, '\n# Metadata (auto-generated)\nmetadata:');

    return header + commented;
  }

  private getDefaultWorkflow() {
    return {
      autoRebase: true,
      squashMerge: true,
      deleteAfterMerge: true,
      requireApproval: true,
      protectedBranches: ['main', 'master'],
      branchNamingPattern: '^(feature|bugfix|hotfix)/[a-z0-9-]+$',
    };
  }

  private getDefaultIntegrations() {
    return {
      github: {
        enabled: false,
        autoCreatePR: true,
        assignReviewers: true,
        addLabels: true,
      },
      gitlab: {
        enabled: false,
        autoCreateMR: true,
        assignReviewers: true,
      },
      slack: {
        enabled: false,
        webhookUrl: '',
        notifyOnPR: true,
        notifyOnMerge: true,
      },
    };
  }

  private getDefaultUI() {
    return {
      colors: true,
      emoji: true,
      timestamps: false,
      verbose: false,
      progressBars: true,
      notifications: true,
    };
  }
}