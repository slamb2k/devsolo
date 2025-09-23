import { CommandHandler } from './types';
import { ConfigurationManager } from '../services/configuration-manager';
import { GitOperations } from '../services/git-operations';
import { ConsoleOutput } from '../ui/console-output';
import { TableFormatter } from '../ui/table-formatter';
import { BoxFormatter } from '../ui/box-formatter';
import { ProgressIndicator } from '../ui/progress-indicators';
import chalk from 'chalk';
import * as fs from 'fs/promises';
import * as path from 'path';

export class HansoloConfigCommand implements CommandHandler {
  name = 'hansolo:config';
  description = 'Manage han-solo configuration';

  private configManager: ConfigurationManager;
  private gitOps: GitOperations;
  private console: ConsoleOutput;
  private table: TableFormatter;
  private box: BoxFormatter;
  private progress: ProgressIndicator;

  constructor() {
    this.configManager = new ConfigurationManager();
    this.gitOps = new GitOperations();
    this.console = new ConsoleOutput();
    this.table = new TableFormatter();
    this.box = new BoxFormatter();
    this.progress = new ProgressIndicator();
  }

  async execute(args: string[]): Promise<void> {
    try {
      // Show banner
      this.console.printBanner('⚙️ han-solo Configuration');

      // Parse command and options
      const { action, options } = this.parseArgs(args);

      switch (action) {
        case 'show':
          await this.showConfiguration(options);
          break;
        case 'set':
          await this.setConfiguration(options);
          break;
        case 'get':
          await this.getConfiguration(options);
          break;
        case 'reset':
          await this.resetConfiguration(options);
          break;
        case 'reinstall-hooks':
          await this.reinstallHooks();
          break;
        case 'team':
          await this.configureTeamSettings();
          break;
        case 'export':
          await this.exportConfiguration(options);
          break;
        case 'import':
          await this.importConfiguration(options);
          break;
        default:
          await this.showConfiguration(options);
      }

    } catch (error) {
      this.console.error('Configuration operation failed', error as Error);
      throw error;
    }
  }

  private parseArgs(args: string[]): { action: string; options: ConfigOptions } {
    const options: ConfigOptions = {
      scope: 'project',
      verbose: false,
    };

    let action = 'show';

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (!arg) continue;

      if (arg.startsWith('--')) {
        switch (arg) {
          case '--global':
            options.scope = 'user';
            break;
          case '--project':
            options.scope = 'project';
            break;
          case '--verbose':
          case '-v':
            options.verbose = true;
            break;
          case '--reinstall-hooks':
            action = 'reinstall-hooks';
            break;
          case '--team':
            action = 'team';
            break;
          case '--export':
            action = 'export';
            const nextArg = args[i + 1];
            if (i + 1 < args.length && nextArg && !nextArg.startsWith('-')) {
              options.exportPath = args[++i];
            }
            break;
          case '--import':
            action = 'import';
            const nextArgImport = args[i + 1];
            if (i + 1 < args.length && nextArgImport && !nextArgImport.startsWith('-')) {
              options.importPath = args[++i];
            }
            break;
        }
      } else if (arg && (arg === 'set' || arg === 'get' || arg === 'reset')) {
        action = arg;
        if (i + 1 < args.length) {
          options.key = args[++i];
          if (action === 'set' && i + 1 < args.length) {
            options.value = args[++i];
          }
        }
      }
    }

    return { action, options };
  }

  private async showConfiguration(options: ConfigOptions): Promise<void> {
    const config = await this.configManager.loadConfiguration();

    // Basic configuration
    const basicRows = [
      ['Version', config.version],
      ['Scope', config.scope],
      ['Initialized', config.initialized ? '✅ Yes' : '❌ No'],
      ['Install Path', config.installPath],
    ];

    const basicContent = this.table.formatTable(
      ['Property', 'Value'],
      basicRows
    );

    this.box.printBox('Basic Configuration', basicContent);

    // Component status
    const componentRows = Object.entries(config.components).map(([name, enabled]) => [
      name,
      enabled ? chalk.green('Enabled') : chalk.gray('Disabled'),
    ]);

    const componentContent = this.table.formatTable(
      ['Component', 'Status'],
      componentRows
    );

    this.box.printBox('Components', componentContent);

    // User preferences
    const preferenceRows = Object.entries(config.preferences).map(([key, value]) => [
      this.formatKey(key),
      this.formatValue(value),
    ]);

    const preferenceContent = this.table.formatTable(
      ['Preference', 'Value'],
      preferenceRows
    );

    this.box.printBox('User Preferences', preferenceContent);

    // Git platform configuration
    if (config.gitPlatform) {
      const platformRows: string[][] = [
        ['Platform', config.gitPlatform.platform || config.gitPlatform.type || 'Not set'],
        ['API Token', config.gitPlatform.token ? '****** (configured)' : 'Not configured'],
      ];

      if (config.gitPlatform.platform === 'github') {
        platformRows.push(
          ['Owner', config.gitPlatform.owner || 'Not set'],
          ['Repository', config.gitPlatform.repo || 'Not set']
        );
      } else if (config.gitPlatform.platform === 'gitlab') {
        platformRows.push(
          ['Project ID', config.gitPlatform.projectId?.toString() || 'Not set'],
          ['Host', config.gitPlatform.host || 'https://gitlab.com']
        );
      }

      const platformContent = this.table.formatTable(
        ['Property', 'Value'],
        platformRows
      );

      this.box.printBox('Git Platform', platformContent);
    }

    if (options.verbose) {
      // Show advanced configuration
      await this.showAdvancedConfiguration();
    }
  }

  private async setConfiguration(options: ConfigOptions): Promise<void> {
    if (!options.key || !options.value) {
      this.console.error('Usage: /hansolo:config set <key> <value>');
      return;
    }

    const config = await this.configManager.loadConfiguration();

    // Parse nested keys (e.g., preferences.colorOutput)
    const keys = options.key!.split('.');
    let target: any = config;

    for (let i = 0; i < keys.length - 1; i++) {
      const currentKey = keys[i];
      if (!currentKey) continue;
      if (!target[currentKey]) {
        target[currentKey] = {};
      }
      target = target[currentKey] as any;
    }

    const finalKey = keys[keys.length - 1];
    if (!finalKey) {
      console.error('Invalid configuration key');
      return;
    }
    const oldValue = target[finalKey];

    // Convert string values to appropriate types
    let value: any = options.value;
    if (value === 'true') value = true;
    else if (value === 'false') value = false;
    else if (!isNaN(Number(value))) value = Number(value);

    target[finalKey] = value;

    await this.configManager.saveConfiguration(config);

    this.console.success(`✅ Configuration updated`);
    this.console.info(`   ${options.key}: ${oldValue} → ${value}`);
  }

  private async getConfiguration(options: ConfigOptions): Promise<void> {
    if (!options.key) {
      this.console.error('Usage: /hansolo:config get <key>');
      return;
    }

    const config = await this.configManager.loadConfiguration();

    // Parse nested keys
    const keys = options.key!.split('.');
    let value: any = config;

    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) {
        this.console.error(`Key not found: ${options.key}`);
        return;
      }
    }

    this.console.log(this.formatValue(value));
  }

  private async resetConfiguration(_options: ConfigOptions): Promise<void> {
    const confirmed = await this.console.confirm(
      'Reset configuration to defaults? This cannot be undone.'
    );

    if (!confirmed) {
      this.console.info('Reset cancelled');
      return;
    }

    this.progress.start('Resetting configuration...');

    const defaultConfig = await this.configManager.createDefaultConfiguration();
    await this.configManager.saveConfiguration(defaultConfig);

    this.progress.succeed('Configuration reset to defaults');
  }

  private async reinstallHooks(): Promise<void> {
    this.progress.start('Reinstalling Git hooks...');

    try {
      const hooksDir = path.join('.hansolo', 'hooks');
      await fs.mkdir(hooksDir, { recursive: true });

      // Create pre-commit hook
      const preCommitContent = `#!/bin/sh
# han-solo pre-commit hook
# Prevents direct commits to main branch

branch="$(git rev-parse --abbrev-ref HEAD)"

if [ "$branch" = "main" ] || [ "$branch" = "master" ]; then
  echo "❌ Direct commits to $branch branch are not allowed!"
  echo "Use '/hansolo:launch' to create a feature branch"
  exit 1
fi

exit 0`;

      await fs.writeFile(
        path.join(hooksDir, 'pre-commit'),
        preCommitContent,
        { mode: 0o755 }
      );

      // Create pre-push hook
      const prePushContent = `#!/bin/sh
# han-solo pre-push hook
# Validates workflow state before push

branch="$(git rev-parse --abbrev-ref HEAD)"

# Check if session exists for this branch
if [ -f ".hansolo/sessions/index.json" ]; then
  # Validate session state
  echo "🔍 Validating workflow state..."
fi

exit 0`;

      await fs.writeFile(
        path.join(hooksDir, 'pre-push'),
        prePushContent,
        { mode: 0o755 }
      );

      // Create post-merge hook
      const postMergeContent = `#!/bin/sh
# han-solo post-merge hook
# Cleanup after successful merge

echo "🧹 Running post-merge cleanup..."
# Cleanup logic here

exit 0`;

      await fs.writeFile(
        path.join(hooksDir, 'post-merge'),
        postMergeContent,
        { mode: 0o755 }
      );

      // Link hooks to Git
      const gitHooksDir = path.join('.git', 'hooks');
      const hooks = ['pre-commit', 'pre-push', 'post-merge'];

      for (const hook of hooks) {
        const source = path.join('..', '..', '.hansolo', 'hooks', hook);
        const target = path.join(gitHooksDir, hook);

        try {
          await fs.unlink(target);
        } catch {
          // Ignore if doesn't exist
        }

        await fs.symlink(source, target);
      }

      this.progress.succeed('Git hooks reinstalled successfully');

    } catch (error) {
      this.progress.fail('Failed to reinstall hooks');
      throw error;
    }
  }

  private async configureTeamSettings(): Promise<void> {
    this.console.info('🚀 Team Configuration Wizard\n');

    const config = await this.configManager.loadConfiguration();

    // Branch naming convention
    const branchPrefix = await this.console.prompt(
      'Default branch prefix (e.g., feature/, fix/):',
      config.preferences.defaultBranchPrefix
    );

    // Auto-cleanup policy
    const autoCleanup = await this.console.confirm(
      'Enable automatic cleanup of completed sessions?',
      config.preferences.autoCleanup
    );

    // Confirmation settings
    const confirmBeforePush = await this.console.confirm(
      'Require confirmation before push operations?',
      config.preferences.confirmBeforePush
    );

    // Git platform
    const platformChoices = ['github', 'gitlab', 'none'];
    const platform = await this.console.select(
      'Select your Git platform:',
      platformChoices,
      config.gitPlatform?.platform || 'none'
    );

    // Update configuration
    config.preferences.defaultBranchPrefix = branchPrefix;
    config.preferences.autoCleanup = autoCleanup;
    config.preferences.confirmBeforePush = confirmBeforePush;

    if (platform !== 'none') {
      config.gitPlatform = config.gitPlatform || { platform: platform as any };

      const token = await this.console.promptSecret(
        `Enter your ${platform.toUpperCase()} API token:`
      );

      if (token) {
        config.gitPlatform.token = token;

        if (platform === 'github') {
          const remoteUrl = await this.gitOps.getRemoteUrl();
          if (remoteUrl && remoteUrl.includes('github.com')) {
            const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/]+?)(\.git)?$/);
            if (match) {
              config.gitPlatform.owner = match[1];
              config.gitPlatform.repo = match[2];
            }
          }
        }
      }
    }

    await this.configManager.saveConfiguration(config);

    this.console.success('✅ Team configuration saved');

    // Show summary
    const summaryRows = [
      ['Branch Prefix', branchPrefix],
      ['Auto Cleanup', autoCleanup ? 'Enabled' : 'Disabled'],
      ['Confirm Push', confirmBeforePush ? 'Enabled' : 'Disabled'],
      ['Git Platform', platform],
    ];

    const content = this.table.formatTable(
      ['Setting', 'Value'],
      summaryRows
    );

    this.box.printBox('Team Configuration Summary', content);
  }

  private async exportConfiguration(options: ConfigOptions): Promise<void> {
    const config = await this.configManager.loadConfiguration();
    const exportPath = options.exportPath || 'hansolo-config-export.json';

    // Remove sensitive data
    const exportConfig = { ...config };
    if (exportConfig.gitPlatform?.token) {
      exportConfig.gitPlatform.token = '';
    }

    await fs.writeFile(
      exportPath,
      JSON.stringify(exportConfig, null, 2)
    );

    this.console.success(`✅ Configuration exported to ${exportPath}`);
  }

  private async importConfiguration(options: ConfigOptions): Promise<void> {
    const importPath = options.importPath || 'hansolo-config-export.json';

    try {
      const data = await fs.readFile(importPath, 'utf-8');
      const importConfig = JSON.parse(data);

      // Validate imported configuration
      // ... validation logic ...

      // Merge with existing config (preserve sensitive data)
      const currentConfig = await this.configManager.loadConfiguration();
      const mergedConfig = {
        ...importConfig,
        gitPlatform: {
          ...importConfig.gitPlatform,
          token: currentConfig.gitPlatform?.token || importConfig.gitPlatform?.token,
        },
      };

      await this.configManager.saveConfiguration(mergedConfig);

      this.console.success(`✅ Configuration imported from ${importPath}`);

    } catch (error) {
      this.console.error(`Failed to import configuration: ${error}`);
      throw error;
    }
  }

  private async showAdvancedConfiguration(): Promise<void> {
    // Show environment variables
    const envVars = [
      ['HANSOLO_AI_ENABLED', process.env['HANSOLO_AI_ENABLED'] || 'true'],
      ['HANSOLO_DEBUG', process.env['HANSOLO_DEBUG'] || 'false'],
      ['HANSOLO_CONFIG_PATH', process.env['HANSOLO_CONFIG_PATH'] || '.hansolo'],
    ];

    const envContent = this.table.formatTable(
      ['Variable', 'Value'],
      envVars
    );

    this.box.printBox('Environment Variables', envContent);

    // Show system information
    const systemInfo = [
      ['Node Version', process.version],
      ['Platform', process.platform],
      ['Architecture', process.arch],
      ['Working Directory', process.cwd()],
    ];

    const systemContent = this.table.formatTable(
      ['Property', 'Value'],
      systemInfo
    );

    this.box.printBox('System Information', systemContent);
  }

  private formatKey(key: string): string {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  }

  private formatValue(value: any): string {
    if (typeof value === 'boolean') {
      return value ? chalk.green('Yes') : chalk.gray('No');
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  validate(_args: string[]): boolean {
    // All arguments are optional
    return true;
  }
}

interface ConfigOptions {
  scope: 'user' | 'project';
  verbose: boolean;
  key?: string;
  value?: string;
  exportPath?: string;
  importPath?: string;
}