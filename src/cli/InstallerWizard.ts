#!/usr/bin/env node

import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { WelcomeBanner } from './components/WelcomeBanner';
import { ProgressIndicator } from './components/ProgressIndicator';
import { ThemeManager } from './components/ThemeManager';
import { ContextDetector } from '../services/ContextDetector';
import { SessionManager } from '../services/SessionManager';
import { ConfigManager } from '../services/ConfigManager';
import { WorkflowStep } from './steps/WorkflowStep';
import { IntegrationStep } from './steps/IntegrationStep';
import { UIStep } from './steps/UIStep';
import { ReviewStep } from './steps/ReviewStep';
import { InstallationContext } from '../models/InstallationContext';
import { InstallerSession } from '../models/InstallerSession';

export class InstallerWizard {
  private contextDetector: ContextDetector;
  private sessionManager: SessionManager;
  private configManager: ConfigManager;
  private themeManager: ThemeManager;
  private progress: ProgressIndicator;
  private session?: InstallerSession;
  private context?: InstallationContext;

  constructor() {
    this.contextDetector = new ContextDetector();
    this.sessionManager = new SessionManager();
    this.configManager = new ConfigManager();
    this.themeManager = new ThemeManager();
    this.progress = new ProgressIndicator();
  }

  async run(): Promise<void> {
    try {
      // Detect installation context
      this.context = await this.contextDetector.detect();

      // Check for CI/CD environment
      if (this.context.isCI) {
        console.log(chalk.yellow('⚡ CI environment detected - using defaults'));
        await this.runNonInteractive();
        return;
      }

      // Check TTY support
      if (!this.context.hasTTY) {
        console.log(chalk.yellow('⚡ Non-interactive environment - using defaults'));
        await this.runNonInteractive();
        return;
      }

      // Show welcome banner
      const banner = new WelcomeBanner(this.themeManager);
      banner.display();

      // Check for existing session
      const existingSession = await this.sessionManager.loadSession();
      if (existingSession && existingSession.status !== 'complete') {
        const { resume } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'resume',
            message: 'Previous setup was interrupted. Would you like to resume?',
            default: true
          }
        ]);

        if (resume) {
          this.session = existingSession;
        }
      }

      // Create new session if needed
      if (!this.session) {
        this.session = await this.sessionManager.createSession(this.context);
      }

      // Run installation steps
      await this.runInteractive();

      // Show completion message
      this.showCompletionMessage();

    } catch (error) {
      this.handleError(error);
    }
  }

  private async runInteractive(): Promise<void> {
    const steps = [
      { name: 'Workflow Settings', handler: new WorkflowStep() },
      { name: 'Integrations', handler: new IntegrationStep() },
      { name: 'UI Preferences', handler: new UIStep() },
      { name: 'Review & Confirm', handler: new ReviewStep() }
    ];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (!step) continue;

      // Update progress
      this.progress.update(i + 1, steps.length, step.name);

      // Skip if already completed in previous session
      if (this.session && this.session.completedSteps.includes(step.name)) {
        continue;
      }

      // Run step
      const stepData = await step.handler.execute(this.context!, this.session!);

      // Update session
      if (this.session) {
        this.session.data = { ...this.session.data, ...stepData };
        this.session.completedSteps.push(step.name);
        this.session.currentStep = i + 1;
      }

      // Save session state
      await this.sessionManager.saveSession(this.session!);
    }

    // Save final configuration
    await this.configManager.save(this.session!.data, this.context!);

    // Mark session as complete
    if (this.session) {
      this.session.status = 'complete';
      await this.sessionManager.saveSession(this.session);
    }
  }

  private async runNonInteractive(): Promise<void> {
    const spinner = ora('Configuring han-solo with default settings...').start();

    try {
      // Create default configuration
      const defaultConfig = {
        workflow: {
          autoRebase: true,
          squashMerge: true,
          deleteAfterMerge: true,
          requireApproval: true
        },
        integrations: {
          github: this.context!.hasGitHub,
          gitlab: this.context!.hasGitLab,
          slack: false
        },
        ui: {
          colors: true,
          emoji: true,
          timestamps: false,
          verbose: false
        }
      };

      // Save configuration
      await this.configManager.save(defaultConfig, this.context!);

      spinner.succeed('han-solo configured successfully!');

      console.log('\n' + chalk.gray('Configuration saved to: ' + this.configManager.getConfigPath(this.context!)));
      console.log(chalk.gray('Run "hansolo configure" to modify settings later'));

    } catch (error) {
      spinner.fail('Configuration failed');
      throw error;
    }
  }

  private showCompletionMessage(): void {
    const box = require('boxen');

    const message = [
      chalk.green.bold('🚀 han-solo setup complete!'),
      '',
      chalk.white('Next steps:'),
      chalk.gray('1. Navigate to your Git project'),
      chalk.gray('2. Run: ') + chalk.cyan('hansolo init'),
      chalk.gray('3. Start a feature: ') + chalk.cyan('hansolo launch <branch-name>'),
      '',
      chalk.gray('For help: ') + chalk.cyan('hansolo --help')
    ].join('\n');

    console.log('\n' + box(message, {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'green'
    }));
  }

  private handleError(error: any): void {
    console.error('\n' + chalk.red('✖ Setup failed:'), error.message);

    if (this.session) {
      console.log(chalk.yellow('\nYour progress has been saved.'));
      console.log(chalk.gray('Run the installer again to resume.'));
    }

    console.log('\n' + chalk.gray('For help, visit: https://github.com/hansolo/docs'));
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  const wizard = new InstallerWizard();
  wizard.run();
}