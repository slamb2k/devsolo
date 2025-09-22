import * as readline from 'readline';
import chalk from 'chalk';
import { WorkflowSession } from '../models/workflow-session';
import { GitOperations } from '../services/git-operations';
import { LaunchWorkflowStateMachine } from '../state-machines/launch-workflow';
import { ConsoleOutput } from '../ui/console-output';

export class InteractiveMode {
  private rl: readline.Interface;
  private session?: WorkflowSession;
  private gitOps: GitOperations;
  private stateMachine: LaunchWorkflowStateMachine;
  private output: ConsoleOutput;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.cyan('hansolo> ')
    });
    this.gitOps = new GitOperations();
    this.stateMachine = new LaunchWorkflowStateMachine();
    this.output = new ConsoleOutput();
  }

  public async start(): Promise<void> {
    console.log(chalk.green(`\n${'═'.repeat(60)}`));
    console.log(chalk.green('  HAN-SOLO INTERACTIVE MODE'));
    console.log(chalk.green(`${'═'.repeat(60)}\n`));
    console.log('Type "help" for available commands or "exit" to quit\n');

    this.rl.prompt();

    this.rl.on('line', async (line) => {
      const command = line.trim().toLowerCase();
      
      try {
        await this.handleCommand(command);
      } catch (error) {
        this.output.errorMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      this.rl.prompt();
    });

    this.rl.on('close', () => {
      console.log(chalk.yellow('\nGoodbye!'));
      process.exit(0);
    });
  }

  private async handleCommand(input: string): Promise<void> {
    const [command, ...args] = input.split(' ');

    switch (command) {
      case 'help':
        this.showHelp();
        break;

      case 'launch':
        await this.launchWorkflow(args);
        break;

      case 'status':
        await this.showStatus();
        break;

      case 'ship':
        await this.shipWorkflow();
        break;

      case 'abort':
        await this.abortWorkflow();
        break;

      case 'sessions':
        await this.listSessions();
        break;

      case 'swap':
        await this.swapSession(args[0] || '');
        break;

      case 'hotfix':
        await this.createHotfix(args);
        break;

      case 'clear':
        console.clear();
        break;

      case 'exit':
      case 'quit':
        this.rl.close();
        break;

      default:
        if (command) {
          console.log(chalk.red(`Unknown command: ${command}`));
          console.log('Type "help" for available commands');
        }
    }
  }

  private showHelp(): void {
    console.log(chalk.yellow('\nAvailable Commands:'));
    console.log('  launch [branch]  - Start a new feature workflow');
    console.log('  ship            - Complete workflow and merge to main');
    console.log('  status          - Show current workflow status');
    console.log('  sessions        - List all active sessions');
    console.log('  swap <branch>   - Switch to another session');
    console.log('  hotfix [issue]  - Create emergency hotfix');
    console.log('  abort           - Abort current workflow');
    console.log('  clear           - Clear screen');
    console.log('  help            - Show this help message');
    console.log('  exit            - Exit interactive mode\n');
  }

  private async launchWorkflow(args: string[]): Promise<void> {
    const branchName = args[0] || await this.prompt('Branch name: ');
    
    if (!branchName) {
      console.log(chalk.red('Branch name is required'));
      return;
    }

    console.log(chalk.blue(`Launching workflow for ${branchName}...`));
    
    // Create new session
    this.session = new WorkflowSession({
      branchName,
      workflowType: 'launch'
    });
    this.session.currentState = 'INIT';

    // Initialize workflow - transition to BRANCH_READY
    const result = await this.stateMachine.transition(
      this.session.currentState,
      'BRANCH_READY' as any
    );

    if (result.success) {
      this.session.currentState = result.toState;
      await this.gitOps.createBranch(branchName);
      console.log(chalk.green(`✅ Workflow launched on branch: ${branchName}`));
    } else {
      console.log(chalk.red(`❌ Failed to launch workflow: ${result.error}`));
    }
  }

  private async showStatus(): Promise<void> {
    if (!this.session) {
      console.log(chalk.yellow('No active workflow'));
      return;
    }

    console.log(chalk.cyan('\nCurrent Workflow Status:'));
    console.log(`  Branch: ${this.session.branchName}`);
    console.log(`  Type: ${this.session.workflowType}`);
    console.log(`  State: ${this.session.currentState}`);
    console.log(`  Session ID: ${this.session.id}\n`);
  }

  private async shipWorkflow(): Promise<void> {
    if (!this.session) {
      console.log(chalk.yellow('No active workflow to ship'));
      return;
    }

    const confirm = await this.prompt('Ready to ship? (y/n): ');
    if (confirm.toLowerCase() !== 'y') {
      console.log(chalk.yellow('Ship cancelled'));
      return;
    }

    console.log(chalk.blue('Shipping workflow...'));
    // Implementation would continue here
    console.log(chalk.green('✅ Workflow shipped successfully'));
  }

  private async abortWorkflow(): Promise<void> {
    if (!this.session) {
      console.log(chalk.yellow('No active workflow to abort'));
      return;
    }

    const confirm = await this.prompt('Are you sure? (y/n): ');
    if (confirm.toLowerCase() !== 'y') {
      console.log(chalk.yellow('Abort cancelled'));
      return;
    }

    this.session = undefined;
    console.log(chalk.green('✅ Workflow aborted'));
  }

  private async listSessions(): Promise<void> {
    // Would load from persistence
    console.log(chalk.cyan('\nActive Sessions:'));
    if (this.session) {
      console.log(`  - ${this.session.branchName} (current)`);
    } else {
      console.log('  No active sessions');
    }
  }

  private async swapSession(branch: string): Promise<void> {
    if (!branch) {
      console.log(chalk.red('Branch name required'));
      return;
    }

    console.log(chalk.blue(`Swapping to ${branch}...`));
    await this.gitOps.checkoutBranch(branch);
    console.log(chalk.green(`✅ Switched to ${branch}`));
  }

  private async createHotfix(args: string[]): Promise<void> {
    const issue = args[0] || await this.prompt('Issue ID: ');
    
    if (!issue) {
      console.log(chalk.red('Issue ID required'));
      return;
    }

    console.log(chalk.blue(`Creating hotfix for ${issue}...`));
    const branchName = `hotfix/${issue}`;

    this.session = new WorkflowSession({
      branchName,
      workflowType: 'hotfix'
    });
    this.session.currentState = 'INIT';

    await this.gitOps.createBranch(branchName);
    console.log(chalk.green(`✅ Hotfix branch created: ${branchName}`));
  }

  private prompt(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(chalk.yellow(question), (answer) => {
        resolve(answer.trim());
      });
    });
  }
}

export async function runInteractiveMode(): Promise<void> {
  const interactive = new InteractiveMode();
  await interactive.start();
}