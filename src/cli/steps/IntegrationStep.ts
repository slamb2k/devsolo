import inquirer from 'inquirer';
import chalk from 'chalk';
import { InstallationContext } from '../../models/InstallationContext';
import { InstallerSession } from '../../models/InstallerSession';

export class IntegrationStep {
  async execute(context: InstallationContext, _session: InstallerSession): Promise<any> {
    console.log(chalk.white.bold('\n  Configure Integrations'));
    console.log(chalk.gray('  Connect han-solo with your development tools\n'));

    const integrations: any = {};

    // GitHub integration
    if (context.hasGitHub) {
      console.log(chalk.cyan('\n  GitHub detected'));
      const github = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'enabled',
          message: 'Enable GitHub integration?',
          default: true,
        },
        {
          type: 'confirm',
          name: 'autoCreatePR',
          message: 'Automatically create pull requests?',
          default: true,
          when: (answers) => answers.enabled,
        },
        {
          type: 'confirm',
          name: 'assignReviewers',
          message: 'Auto-assign reviewers from CODEOWNERS?',
          default: true,
          when: (answers) => answers.enabled,
        },
        {
          type: 'confirm',
          name: 'addLabels',
          message: 'Add labels to PRs automatically?',
          default: true,
          when: (answers) => answers.enabled,
        },
      ]);
      integrations.github = github;
    }

    // GitLab integration
    if (context.hasGitLab) {
      console.log(chalk.cyan('\n  GitLab detected'));
      const gitlab = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'enabled',
          message: 'Enable GitLab integration?',
          default: true,
        },
        {
          type: 'confirm',
          name: 'autoCreateMR',
          message: 'Automatically create merge requests?',
          default: true,
          when: (answers) => answers.enabled,
        },
        {
          type: 'confirm',
          name: 'assignReviewers',
          message: 'Auto-assign reviewers?',
          default: true,
          when: (answers) => answers.enabled,
        },
      ]);
      integrations.gitlab = gitlab;
    }

    // Slack integration (always ask)
    console.log(chalk.cyan('\n  Slack Integration'));
    const slackEnabled = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'enabled',
        message: 'Would you like to set up Slack notifications?',
        default: false,
      },
    ]);

    if (slackEnabled.enabled) {
      const slackConfig = await inquirer.prompt([
        {
          type: 'input',
          name: 'webhookUrl',
          message: 'Slack webhook URL:',
          validate: (input) => {
            if (!input) {
              return 'Webhook URL is required for Slack integration';
            }
            if (!input.startsWith('https://hooks.slack.com/')) {
              return 'Invalid Slack webhook URL';
            }
            return true;
          },
        },
        {
          type: 'confirm',
          name: 'notifyOnPR',
          message: 'Notify when PRs are created?',
          default: true,
        },
        {
          type: 'confirm',
          name: 'notifyOnMerge',
          message: 'Notify when branches are merged?',
          default: true,
        },
      ]);
      integrations.slack = { enabled: true, ...slackConfig };
    } else {
      integrations.slack = { enabled: false };
    }

    // If no Git platform detected, ask which to prepare for
    if (!context.hasGitHub && !context.hasGitLab && !context.hasBitbucket) {
      console.log(chalk.yellow('\n  No Git platform detected'));
      const platform = await inquirer.prompt([
        {
          type: 'list',
          name: 'prepare',
          message: 'Which platform would you like to prepare for?',
          choices: [
            { name: 'GitHub', value: 'github' },
            { name: 'GitLab', value: 'gitlab' },
            { name: 'Bitbucket', value: 'bitbucket' },
            { name: 'None / I\'ll configure later', value: 'none' },
          ],
          default: 'github',
        },
      ]);

      if (platform.prepare !== 'none') {
        integrations[platform.prepare] = {
          enabled: false,
          prepared: true,
        };
      }
    }

    return { integrations };
  }
}