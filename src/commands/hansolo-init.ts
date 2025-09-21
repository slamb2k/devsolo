import { ConsoleOutput } from '../ui/console-output';
import { WorkflowProgress } from '../ui/progress-indicators';
import { ConfigurationManager } from '../services/configuration-manager';
import { SessionRepository } from '../services/session-repository';
import { GitOperations } from '../services/git-operations';

export class InitCommand {
  private output = new ConsoleOutput();
  private progress = new WorkflowProgress();
  private configManager: ConfigurationManager;
  private sessionRepo: SessionRepository;
  private gitOps: GitOperations;

  constructor(basePath: string = '.hansolo') {
    this.configManager = new ConfigurationManager(basePath);
    this.sessionRepo = new SessionRepository(basePath);
    this.gitOps = new GitOperations();
  }

  async execute(options: {
    force?: boolean;
    gitPlatform?: 'github' | 'gitlab';
    createRemote?: boolean;
  } = {}): Promise<void> {
    this.output.printLogo();
    this.output.header('Initializing han-solo');

    try {
      // Check if already initialized
      if (!options.force && await this.configManager.isInitialized()) {
        this.output.warningMessage('han-solo is already initialized in this project');
        this.output.infoMessage('Use --force to reinitialize');
        return;
      }

      const steps = [
        {
          name: 'Checking Git repository',
          action: async () => await this.checkGitRepository(),
        },
        {
          name: 'Creating configuration',
          action: async () => await this.createConfiguration(),
        },
        {
          name: 'Setting up directories',
          action: async () => await this.setupDirectories(),
        },
        {
          name: 'Installing Git hooks',
          action: async () => await this.installHooks(),
        },
        {
          name: 'Creating templates',
          action: async () => await this.createTemplates(),
        },
      ];

      if (options.createRemote) {
        steps.push({
          name: 'Setting up remote repository',
          action: async () => await this.setupRemote(options.gitPlatform || 'github'),
        });
      }

      await this.progress.runSteps(steps);

      this.output.newline();
      this.output.box(
        'han-solo has been successfully initialized!\n\n' +
        'Available commands:\n' +
        '  /hansolo:launch  - Start a new feature\n' +
        '  /hansolo:ship    - Ship your changes\n' +
        '  /hansolo:status  - Check workflow status\n' +
        '  /hansolo:help    - Show all commands',
        '✨ Setup Complete'
      );

      this.output.successMessage('Ready to enforce linear history!');

    } catch (error) {
      this.output.errorMessage(`Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  private async checkGitRepository(): Promise<void> {
    const isGitRepo = await this.gitOps.isInitialized();

    if (!isGitRepo) {
      await this.gitOps.init();
      this.output.dim('Git repository initialized');
    } else {
      this.output.dim('Git repository found');
    }

    // Check current branch
    const currentBranch = await this.gitOps.getCurrentBranch();
    if (currentBranch !== 'main' && currentBranch !== 'master') {
      this.output.warningMessage(`Currently on branch '${currentBranch}'. Consider switching to main branch.`);
    }
  }

  private async createConfiguration(): Promise<void> {
    const config = await this.configManager.initialize();
    this.output.dim(`Configuration created: v${config.version}`);
  }

  private async setupDirectories(): Promise<void> {
    await this.sessionRepo.initialize();
    this.output.dim('Directory structure created');
  }

  private async installHooks(): Promise<void> {
    await this.configManager.installHooks();
    this.output.dim('Git hooks installed');
  }

  private async createTemplates(): Promise<void> {
    await this.configManager.installTemplates();
    this.output.dim('Templates created');
  }

  private async setupRemote(platform: 'github' | 'gitlab'): Promise<void> {
    const remoteUrl = await this.gitOps.getRemoteUrl();

    if (remoteUrl) {
      this.output.dim(`Remote repository already configured: ${remoteUrl}`);
      return;
    }

    // This would integrate with GitHub/GitLab API to create the repo
    // For now, just show a message
    this.output.warningMessage(`Manual step required: Create repository on ${platform}`);
    this.output.dim(`Run: git remote add origin <repository-url>`);
  }

  async validate(): Promise<boolean> {
    try {
      await this.configManager.validate();
      this.output.successMessage('Configuration is valid');
      return true;
    } catch (error) {
      this.output.errorMessage(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  async showStatus(): Promise<void> {
    const isInitialized = await this.configManager.isInitialized();

    if (!isInitialized) {
      this.output.errorMessage('han-solo is not initialized in this project');
      this.output.dim('Run "/hansolo:init" to get started');
      return;
    }

    const config = await this.configManager.load();

    this.output.header('han-solo Status');

    const statusData = [
      ['Version', config.version],
      ['Scope', config.scope],
      ['Install Path', config.getInstallPath()],
      ['Initialized', config.initialized ? '✅' : '❌'],
    ];

    this.output.table(['Property', 'Value'], statusData);

    this.output.subheader('Components');
    const componentData = Object.entries(config.components).map(([name, enabled]) => [
      name,
      enabled ? '✅ Enabled' : '❌ Disabled',
    ]);
    this.output.table(['Component', 'Status'], componentData);

    const sessions = await this.sessionRepo.listSessions();
    if (sessions.length > 0) {
      this.output.subheader('Active Sessions');
      sessions.forEach(session => {
        console.log(this.output.formatSession({
          id: session.id,
          branchName: session.branchName,
          workflowType: session.workflowType,
          currentState: session.currentState,
          age: session.getAge(),
        }));
      });
    } else {
      this.output.dim('No active sessions');
    }
  }
}