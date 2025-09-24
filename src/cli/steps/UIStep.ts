import inquirer from 'inquirer';
import chalk from 'chalk';
import { InstallationContext } from '../../models/InstallationContext';
import { InstallerSession } from '../../models/InstallerSession';

export class UIStep {
  async execute(_context: InstallationContext, _session: InstallerSession): Promise<any> {
    console.log(chalk.white.bold('\n  Configure UI Preferences'));
    console.log(chalk.gray('  Customize how han-solo displays information\n'));

    // Check terminal capabilities
    const supportsColor = chalk.level > 0;
    const supportsUnicode = process.platform !== 'win32' || process.env['CI'] !== undefined;

    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'colors',
        message: 'Use colored output?',
        default: supportsColor,
        when: () => supportsColor // Only ask if terminal supports it
      },
      {
        type: 'confirm',
        name: 'emoji',
        message: 'Use emoji in output?',
        default: supportsUnicode,
        when: () => supportsUnicode // Only ask if terminal supports it
      },
      {
        type: 'confirm',
        name: 'timestamps',
        message: 'Show timestamps in output?',
        default: false
      },
      {
        type: 'confirm',
        name: 'verbose',
        message: 'Enable verbose logging?',
        default: false
      },
      {
        type: 'confirm',
        name: 'progressBars',
        message: 'Show progress bars for long operations?',
        default: true
      },
      {
        type: 'confirm',
        name: 'notifications',
        message: 'Enable desktop notifications?',
        default: false
      },
      {
        type: 'list',
        name: 'outputStyle',
        message: 'Output style preference:',
        choices: [
          {
            name: 'Detailed (more information)',
            value: 'detailed'
          },
          {
            name: 'Compact (essential info only)',
            value: 'compact'
          },
          {
            name: 'Minimal (quiet mode)',
            value: 'minimal'
          }
        ],
        default: 'detailed'
      }
    ]);

    // Apply defaults for unsupported features
    const ui = {
      colors: supportsColor ? (answers.colors ?? true) : false,
      emoji: supportsUnicode ? (answers.emoji ?? true) : false,
      timestamps: answers.timestamps,
      verbose: answers.verbose,
      progressBars: answers.progressBars,
      notifications: answers.notifications,
      outputStyle: answers.outputStyle
    };

    // Show preview of selected style
    console.log('\n' + chalk.gray('  Preview of your selected style:'));
    this.showPreview(ui);

    return { ui };
  }

  private showPreview(ui: any): void {
    const emoji = ui.emoji ? '✓' : '[OK]';
    const color = ui.colors ? chalk.green : (text: string) => text;
    const timestamp = ui.timestamps ? `[${new Date().toTimeString().split(' ')[0]}] ` : '';

    console.log('  ' + timestamp + color(`${emoji} Feature branch created successfully`));

    if (ui.outputStyle === 'detailed') {
      console.log('  ' + chalk.gray('  Branch: feature/new-feature'));
      console.log('  ' + chalk.gray('  Commits: 3 ahead of main'));
      console.log('  ' + chalk.gray('  Status: Ready to push'));
    } else if (ui.outputStyle === 'compact') {
      console.log('  ' + chalk.gray('  feature/new-feature (3 commits)'));
    }
    // Minimal shows nothing extra
  }
}