import inquirer from 'inquirer';
import chalk from 'chalk';
import { InstallationContext } from '../../models/InstallationContext';
import { InstallerSession } from '../../models/InstallerSession';

export class WorkflowStep {
  async execute(_context: InstallationContext, _session: InstallerSession): Promise<any> {
    console.log(chalk.white.bold('\n  Configure Workflow Settings'));
    console.log(chalk.gray('  How should han-solo handle your Git workflow?\n'));

    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'autoRebase',
        message: 'Automatically rebase feature branches?',
        default: true
      },
      {
        type: 'confirm',
        name: 'squashMerge',
        message: 'Squash commits when merging?',
        default: true
      },
      {
        type: 'confirm',
        name: 'deleteAfterMerge',
        message: 'Delete feature branches after merge?',
        default: true
      },
      {
        type: 'confirm',
        name: 'requireApproval',
        message: 'Require PR/MR approval before merge?',
        default: true
      },
      {
        type: 'input',
        name: 'protectedBranches',
        message: 'Protected branches (comma-separated):',
        default: 'main,master',
        filter: (input: string) => input.split(',').map(b => b.trim()).filter(b => b)
      },
      {
        type: 'list',
        name: 'branchNaming',
        message: 'Branch naming convention:',
        choices: [
          {
            name: 'feature/*, bugfix/*, hotfix/* (Recommended)',
            value: 'standard'
          },
          {
            name: 'feat/*, fix/*, chore/* (Short form)',
            value: 'short'
          },
          {
            name: 'JIRA-123-description (Ticket-based)',
            value: 'ticket'
          },
          {
            name: 'Custom (I\'ll configure later)',
            value: 'custom'
          }
        ],
        default: 'standard'
      }
    ]);

    // Map branch naming choice to pattern
    const branchPatterns: Record<string, string> = {
      standard: '^(feature|bugfix|hotfix)/[a-z0-9-]+$',
      short: '^(feat|fix|chore)/[a-z0-9-]+$',
      ticket: '^[A-Z]+-[0-9]+-[a-z0-9-]+$',
      custom: '.*'
    };

    return {
      workflow: {
        autoRebase: answers.autoRebase,
        squashMerge: answers.squashMerge,
        deleteAfterMerge: answers.deleteAfterMerge,
        requireApproval: answers.requireApproval,
        protectedBranches: answers.protectedBranches,
        branchNamingPattern: branchPatterns[answers.branchNaming]
      }
    };
  }
}