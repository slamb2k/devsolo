import { ConsoleOutput } from '../ui/console-output';
import { WorkflowProgress } from '../ui/progress-indicators';
import { SessionRepository } from '../services/session-repository';
import { GitOperations } from '../services/git-operations';
import { ConfigurationManager } from '../services/configuration-manager';
import { WorkflowSession } from '../models/workflow-session';
import { LaunchWorkflowStateMachine } from '../state-machines/launch-workflow';
import { GitHubIntegration } from '../services/github-integration';
import readline from 'readline';

export class ShipCommand {
  private output = new ConsoleOutput();
  private progress = new WorkflowProgress();
  private sessionRepo: SessionRepository;
  private gitOps: GitOperations;
  private configManager: ConfigurationManager;
  private stateMachine: LaunchWorkflowStateMachine;
  private githubIntegration: GitHubIntegration;

  constructor(basePath: string = '.hansolo') {
    this.sessionRepo = new SessionRepository(basePath);
    this.gitOps = new GitOperations();
    this.configManager = new ConfigurationManager(basePath);
    this.stateMachine = new LaunchWorkflowStateMachine();
    this.githubIntegration = new GitHubIntegration(basePath);
  }

  async execute(options: {
    message?: string;
    push?: boolean;
    createPR?: boolean;
    merge?: boolean;
    force?: boolean;
    yes?: boolean;
  } = {}): Promise<void> {
    this.output.header('🚢 Shipping Workflow');

    try {
      // Check initialization
      if (!await this.configManager.isInitialized()) {
        this.output.errorMessage('han-solo is not initialized');
        this.output.infoMessage('Run "hansolo init" first');
        return;
      }

      // Get current branch and session
      const currentBranch = await this.gitOps.getCurrentBranch();
      const session = await this.sessionRepo.getSessionByBranch(currentBranch);

      if (!session) {
        this.output.errorMessage(`No workflow session found for branch '${currentBranch}'`);
        this.output.infoMessage('Use "hansolo launch" to start a new workflow');
        return;
      }

      if (!session.isActive()) {
        this.output.errorMessage(`Session is not active (state: ${session.currentState})`);
        if (session.currentState === 'COMPLETE') {
          this.output.infoMessage('Workflow is already complete');
        } else if (session.currentState === 'ABORTED') {
          this.output.infoMessage('Workflow was aborted');
        }
        return;
      }

      // Protect main branch
      if (currentBranch === 'main' || currentBranch === 'master') {
        this.output.errorMessage('Cannot ship from main branch');
        this.output.infoMessage('Switch to a feature branch');
        return;
      }

      // Determine next action based on current state
      const nextAction = this.determineNextAction(session, options);

      if (!nextAction) {
        this.output.errorMessage(`No valid action from state: ${session.currentState}`);
        return;
      }

      // Execute the appropriate action
      switch (nextAction) {
      case 'commit':
        await this.performCommit(session, options);
        break;
      case 'push':
        await this.performPush(session, options);
        break;
      case 'create-pr':
        await this.performCreatePR(session, options);
        break;
      case 'merge':
        await this.performMerge(session, options);
        break;
      case 'complete':
        await this.performComplete(session, options);
        break;
      default:
        this.output.errorMessage(`Unknown action: ${nextAction}`);
      }

    } catch (error) {
      this.output.errorMessage(`Ship failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  private determineNextAction(session: WorkflowSession, options: any): string | null {
    const { push, createPR, merge } = options;

    // Check explicit flags first
    if (merge) {
      return 'merge';
    }
    if (createPR) {
      return 'create-pr';
    }
    if (push) {
      return 'push';
    }

    // Otherwise, determine based on state
    switch (session.currentState) {
    case 'INIT':
    case 'BRANCH_READY':
      return 'commit';
    case 'CHANGES_COMMITTED':
      return 'push';
    case 'PUSHED':
      return 'create-pr';
    case 'PR_CREATED':
    case 'WAITING_APPROVAL':
      return 'merge';
    case 'MERGED':
      return 'complete';
    default:
      return null;
    }
  }

  private async performCommit(session: WorkflowSession, options: any): Promise<void> {
    this.output.subheader('Committing Changes');

    // Check for changes
    const hasChanges = await this.gitOps.hasUncommittedChanges();
    if (!hasChanges) {
      this.output.warningMessage('No changes to commit');
      this.output.infoMessage('Make changes then run "hansolo ship" again');
      return;
    }

    // Get status
    const status = await this.gitOps.getStatus();
    this.output.box(
      `Modified: ${status.modified.length} file(s)\n` +
      `Added: ${status.created.length} file(s)\n` +
      `Deleted: ${status.deleted.length} file(s)\n` +
      `Untracked: ${status.not_added.length} file(s)`,
      'Git Status'
    );

    // Stage all changes
    await this.progress.gitOperation('add', async () => {
      await this.gitOps.stageAll();
    });

    // Generate or use provided commit message
    let message = options.message;
    if (!message) {
      message = await this.promptForCommitMessage();
    }

    // Commit
    const steps = [
      {
        name: 'Committing changes',
        action: async () => {
          await this.gitOps.commit(message, { noVerify: false });
        },
      },
      {
        name: 'Updating session state',
        action: async () => {
          if (this.stateMachine.canTransition(session.currentState, 'CHANGES_COMMITTED')) {
            session.transitionTo('CHANGES_COMMITTED', 'ship_command');
            await this.sessionRepo.updateSession(session.id, session);
          }
        },
      },
    ];

    await this.progress.runSteps(steps);

    this.output.successMessage('Changes committed successfully');
    this.output.infoMessage('Run "hansolo ship --push" to push to remote');
  }

  private async performPush(session: WorkflowSession, options: any): Promise<void> {
    this.output.subheader('Pushing to Remote');

    // Check if already pushed
    const branchStatus = await this.gitOps.getBranchStatus();
    if (branchStatus.ahead === 0 && branchStatus.hasRemote) {
      this.output.warningMessage('Branch is already up to date with remote');
      if (!options.force) {
        this.output.infoMessage('Use --force to push anyway');
        return;
      }
    }

    // Push to remote
    const steps = [
      {
        name: `Pushing branch '${session.branchName}' to origin`,
        action: async () => {
          await this.gitOps.push(session.branchName, options.force);
        },
      },
      {
        name: 'Updating session state',
        action: async () => {
          if (this.stateMachine.canTransition(session.currentState, 'PUSHED')) {
            session.transitionTo('PUSHED', 'ship_command');
            await this.sessionRepo.updateSession(session.id, session);
          }
        },
      },
    ];

    await this.progress.runSteps(steps);

    this.output.successMessage('Changes pushed to remote');
    this.output.infoMessage('Run "hansolo ship --create-pr" to create a pull request');
  }

  private async performCreatePR(session: WorkflowSession, _options: any): Promise<void> {
    this.output.subheader('Creating Pull Request');

    const prInfo = {
      title: `[${session.workflowType}] ${session.branchName}`,
      body: this.generatePRDescription(session),
      base: 'main',
      head: session.branchName,
    };

    try {
      // Try to use GitHub API
      const pr = await this.githubIntegration.createPullRequest(prInfo);

      if (pr) {
        this.output.successMessage(`Pull request #${pr.number} created successfully!`);
        this.output.infoMessage(`View PR: ${pr.html_url}`);

        // Update session state with PR info
        if (this.stateMachine.canTransition(session.currentState, 'PR_CREATED')) {
          session.transitionTo('PR_CREATED', 'ship_command', {
            pr: {
              ...prInfo,
              number: pr.number,
              url: pr.html_url,
            },
          });
          await this.sessionRepo.updateSession(session.id, session);
        }

        this.output.infoMessage('Run "hansolo ship --merge" after PR is approved');
      } else {
        throw new Error('GitHub API not configured');
      }
    } catch (error) {
      // Fallback to manual instructions
      this.output.warningMessage('Could not create PR via GitHub API');
      this.output.dim(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);

      this.output.box(
        `Title: ${prInfo.title}\n` +
        `Base: ${prInfo.base}\n` +
        `Head: ${prInfo.head}\n\n` +
        `Body:\n${prInfo.body}`,
        'Pull Request Details'
      );

      // Update session state
      if (this.stateMachine.canTransition(session.currentState, 'PR_CREATED')) {
        session.transitionTo('PR_CREATED', 'ship_command', { pr: prInfo });
        await this.sessionRepo.updateSession(session.id, session);
      }

      this.output.infoMessage('Create the PR manually on GitHub');
      this.output.infoMessage('Run "hansolo ship --merge" after PR is approved');
    }
  }

  private async performMerge(session: WorkflowSession, options: any): Promise<void> {
    this.output.subheader('Merging to Main');

    // Check if on main branch
    const currentBranch = await this.gitOps.getCurrentBranch();
    if (currentBranch === 'main' || currentBranch === 'master') {
      this.output.errorMessage('Already on main branch');
      return;
    }

    // Confirm merge
    if (!options.yes) {
      const confirmed = await this.confirmAction(
        'This will merge your changes to main. Continue?',
        true
      );
      if (!confirmed) {
        this.output.infoMessage('Merge cancelled');
        return;
      }
    }

    // Perform merge steps
    const steps = [
      {
        name: 'Fetching latest from main',
        action: async () => {
          await this.gitOps.fetch('origin', 'main');
        },
      },
      {
        name: 'Checking out main branch',
        action: async () => {
          await this.gitOps.checkoutBranch('main');
        },
      },
      {
        name: 'Pulling latest changes',
        action: async () => {
          await this.gitOps.pull('origin', 'main');
        },
      },
      {
        name: `Merging branch '${session.branchName}'`,
        action: async () => {
          await this.gitOps.merge(session.branchName, true);
        },
      },
      {
        name: 'Committing merge',
        action: async () => {
          const message = `feat: ${session.branchName} (squash merge)`;
          await this.gitOps.commit(message, { noVerify: false });
        },
      },
      {
        name: 'Pushing to main',
        action: async () => {
          await this.gitOps.push('main');
        },
      },
      {
        name: 'Updating session state',
        action: async () => {
          session.transitionTo('MERGED', 'ship_command');
          await this.sessionRepo.updateSession(session.id, session);
        },
      },
    ];

    await this.progress.runSteps(steps);

    this.output.successMessage('Successfully merged to main!');
    await this.performComplete(session, options);
  }

  private async performComplete(session: WorkflowSession, _options: any): Promise<void> {
    this.output.subheader('Completing Workflow');

    const steps = [
      {
        name: 'Cleaning up feature branch',
        action: async () => {
          try {
            // Delete local branch if not current
            const currentBranch = await this.gitOps.getCurrentBranch();
            if (currentBranch === session.branchName) {
              await this.gitOps.checkoutBranch('main');
            }
            await this.gitOps.deleteBranch(session.branchName, true);
          } catch (error) {
            this.output.warningMessage('Could not delete local branch');
          }
        },
      },
      {
        name: 'Deleting remote branch',
        action: async () => {
          try {
            await this.gitOps.deleteRemoteBranch(session.branchName);
          } catch (error) {
            this.output.warningMessage('Could not delete remote branch');
          }
        },
      },
      {
        name: 'Marking session complete',
        action: async () => {
          session.transitionTo('COMPLETE', 'ship_command');
          await this.sessionRepo.updateSession(session.id, session);
        },
      },
    ];

    await this.progress.runSteps(steps);

    this.output.successMessage('🎉 Workflow complete!');
    this.showCompletionSummary(session);
  }

  private async promptForCommitMessage(): Promise<string> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise(resolve => {
      rl.question('Enter commit message: ', message => {
        rl.close();
        resolve(message || 'feat: update changes');
      });
    });
  }

  private async confirmAction(message: string, ask: boolean = true): Promise<boolean> {
    if (!ask) {
      return true;
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise(resolve => {
      rl.question(`${message} (y/n): `, answer => {
        rl.close();
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      });
    });
  }

  private generatePRDescription(session: WorkflowSession): string {
    const lines = [
      '## Summary',
      `Branch: ${session.branchName}`,
      `Session ID: ${session.id}`,
      `Created: ${new Date(session.createdAt).toLocaleString()}`,
      '',
      '## Changes',
      '- [ ] Feature implementation',
      '- [ ] Tests added',
      '- [ ] Documentation updated',
      '',
      '## Testing',
      '- [ ] Unit tests pass',
      '- [ ] Integration tests pass',
      '- [ ] Manual testing complete',
      '',
      '---',
      '_Generated by han-solo workflow automation_',
    ];

    return lines.join('\n');
  }

  private showCompletionSummary(session: WorkflowSession): void {
    const duration = Date.now() - new Date(session.createdAt).getTime();
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));

    this.output.box(
      `Session ID: ${session.id.substring(0, 8)}\n` +
      `Branch: ${session.branchName}\n` +
      `Duration: ${hours}h ${minutes}m\n` +
      `State Transitions: ${session.stateHistory.length}\n\n` +
      'Workflow Timeline:\n' +
      session.stateHistory.map(t => {
        const time = new Date(t.timestamp).toLocaleTimeString();
        return `  ${time}: ${t.from} → ${t.to}`;
      }).join('\n'),
      '✨ Workflow Complete'
    );

    this.output.newline();
    this.output.dim('Tips:');
    this.output.dim('• Run "hansolo launch" to start a new workflow');
    this.output.dim('• Run "hansolo sessions" to see all workflows');
  }

  async quickShip(): Promise<void> {
    // Convenience method for shipping with all defaults
    await this.execute({
      yes: true,
      push: true,
      createPR: true,
    });
  }
}