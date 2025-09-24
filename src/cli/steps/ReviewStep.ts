import inquirer from 'inquirer';
import chalk from 'chalk';
import { InstallationContext } from '../../models/InstallationContext';
import { InstallerSession } from '../../models/InstallerSession';

export class ReviewStep {
  async execute(context: InstallationContext, session: InstallerSession): Promise<any> {
    console.log(chalk.white.bold('\n  Review Your Configuration'));
    console.log(chalk.gray('  Please review your settings before finalizing\n'));

    // Display configuration summary
    this.displaySummary(session.data, context);

    // Confirm settings
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: '\nSave this configuration?',
        default: true,
      },
    ]);

    if (!confirm) {
      // Ask what to change
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: 'Start over', value: 'restart' },
            { name: 'Exit without saving', value: 'exit' },
            { name: 'Save anyway', value: 'save' },
          ],
        },
      ]);

      if (action === 'restart') {
        // Clear session and restart
        session.completedSteps = [];
        session.data = {};
        throw new Error('RESTART_REQUESTED');
      } else if (action === 'exit') {
        throw new Error('EXIT_REQUESTED');
      }
    }

    return {}; // No additional data from review step
  }

  private displaySummary(data: any, context: InstallationContext): void {
    const box = require('boxen');

    console.log(chalk.cyan('\n  Installation Type: ') + chalk.white(context.installationType));
    console.log(chalk.cyan('  Configuration Path: ') + chalk.white(
      context.installationType === 'global' ? context.globalPath : context.localPath
    ));

    // Workflow settings
    if (data.workflow) {
      console.log('\n' + chalk.yellow('  Workflow Settings:'));
      console.log('    Auto-rebase: ' + this.formatBoolean(data.workflow.autoRebase));
      console.log('    Squash merge: ' + this.formatBoolean(data.workflow.squashMerge));
      console.log('    Delete after merge: ' + this.formatBoolean(data.workflow.deleteAfterMerge));
      console.log('    Require approval: ' + this.formatBoolean(data.workflow.requireApproval));
      console.log('    Protected branches: ' + chalk.white(data.workflow.protectedBranches.join(', ')));
    }

    // Integrations
    if (data.integrations) {
      console.log('\n' + chalk.yellow('  Integrations:'));
      if (data.integrations.github) {
        console.log('    GitHub: ' + this.formatBoolean(data.integrations.github.enabled));
      }
      if (data.integrations.gitlab) {
        console.log('    GitLab: ' + this.formatBoolean(data.integrations.gitlab.enabled));
      }
      if (data.integrations.slack) {
        console.log('    Slack: ' + this.formatBoolean(data.integrations.slack.enabled));
      }
    }

    // UI preferences
    if (data.ui) {
      console.log('\n' + chalk.yellow('  UI Preferences:'));
      console.log('    Colors: ' + this.formatBoolean(data.ui.colors));
      console.log('    Emoji: ' + this.formatBoolean(data.ui.emoji));
      console.log('    Timestamps: ' + this.formatBoolean(data.ui.timestamps));
      console.log('    Verbose: ' + this.formatBoolean(data.ui.verbose));
      console.log('    Style: ' + chalk.white(data.ui.outputStyle || 'detailed'));
    }

    // Show configuration location
    console.log('\n' + box(
      chalk.gray('Configuration will be saved to:\n') +
      chalk.white(context.installationType === 'global'
        ? '~/.hansolo/config.yaml'
        : './.hansolo/config.yaml'),
      {
        padding: { top: 0, right: 1, bottom: 0, left: 1 },
        margin: { top: 1, right: 0, bottom: 1, left: 2 },
        borderStyle: 'single',
        borderColor: 'gray',
        dimBorder: true,
      }
    ));
  }

  private formatBoolean(value: boolean): string {
    return value
      ? chalk.green('Enabled')
      : chalk.gray('Disabled');
  }
}