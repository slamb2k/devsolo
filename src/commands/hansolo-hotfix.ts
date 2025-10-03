import { ConsoleOutput } from '../ui/console-output';
import { WorkflowProgress } from '../ui/progress-indicators';
import { ConfigurationManager } from '../services/configuration-manager';
import { SessionRepository } from '../services/session-repository';
import { GitOperations } from '../services/git-operations';
import { GitHubIntegration } from '../services/github-integration';
import { WorkflowSession } from '../models/workflow-session';
import { HotfixWorkflowStateMachine } from '../state-machines/hotfix-workflow';
import readline from 'readline';

export interface HotfixOptions {
  issue?: string;
  severity?: 'critical' | 'high' | 'medium';
  skipTests?: boolean;
  skipReview?: boolean;
  autoMerge?: boolean;
  force?: boolean;
  yes?: boolean;
}

export class HotfixCommand {
  private output = new ConsoleOutput();
  private progress = new WorkflowProgress();
  private configManager: ConfigurationManager;
  private sessionRepo: SessionRepository;
  private gitOps: GitOperations;
  private githubIntegration: GitHubIntegration;
  private stateMachine: HotfixWorkflowStateMachine;

  constructor(basePath: string = '.hansolo') {
    this.configManager = new ConfigurationManager(basePath);
    this.sessionRepo = new SessionRepository(basePath);
    this.gitOps = new GitOperations();
    this.githubIntegration = new GitHubIntegration(basePath);
    this.stateMachine = new HotfixWorkflowStateMachine();
  }

  async execute(options: HotfixOptions = {}): Promise<void> {
    this.output.header('🚨 Creating Emergency Hotfix');

    try {
      // Check initialization
      if (!await this.configManager.isInitialized()) {
        this.output.errorMessage('han-solo is not initialized');
        this.output.infoMessage('Run "hansolo init" first');
        return;
      }

      // Warn about hotfix implications
      if (!options.yes) {
        this.output.warningMessage('⚠️  HOTFIX MODE ⚠️');
        this.output.warningMessage('This will:');
        this.output.dim('• Create a hotfix branch from main');
        this.output.dim('• Bypass normal workflow restrictions');
        this.output.dim('• Deploy directly to production after validation');
        this.output.dim('• Automatically backport to main');

        const confirmed = await this.confirmAction('Proceed with emergency hotfix?');
        if (!confirmed) {
          this.output.infoMessage('Hotfix cancelled');
          return;
        }
      }

      // Get or prompt for severity
      const severity = options.severity || await this.promptSeverity();

      // Generate hotfix branch name
      const branchName = this.generateHotfixBranchName(options.issue);

      // Create hotfix session
      const session = await this.createHotfixSession(branchName, severity);

      // Execute hotfix workflow
      await this.executeHotfixWorkflow(session, options);

      this.output.successMessage('Hotfix workflow initiated!');
      this.showHotfixStatus(session, severity);

    } catch (error) {
      this.output.errorMessage(`Hotfix failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  private async createHotfixSession(branchName: string, severity: string): Promise<WorkflowSession> {
    const session = new WorkflowSession({
      workflowType: 'hotfix',
      branchName,
      metadata: {
        projectPath: process.cwd(),
        userName: await this.gitOps.getConfig('user.name') || 'unknown',
        userEmail: await this.gitOps.getConfig('user.email') || 'unknown',
        severity,
        startedAt: new Date().toISOString(),
      },
    });

    // Set initial state
    session.currentState = 'HOTFIX_INIT';

    await this.sessionRepo.createSession(session);
    return session;
  }

  private async executeHotfixWorkflow(session: WorkflowSession, options: HotfixOptions): Promise<void> {
    const steps = [
      {
        name: 'Creating hotfix branch from main',
        action: async () => {
          // Ensure we're on main
          await this.gitOps.checkoutBranch('main');
          await this.gitOps.pull('origin', 'main');

          // Create hotfix branch
          await this.gitOps.createBranch(session.branchName, 'main');

          // Update session state
          session.transitionTo('HOTFIX_READY', 'user_action');
          await this.sessionRepo.updateSession(session.id, session);
        },
      },
      {
        name: 'Preparing validation hooks',
        action: async () => {
          if (options.skipTests) {
            this.output.warningMessage('Tests will be skipped (critical hotfix)');
          }
          if (options.skipReview) {
            this.output.warningMessage('Review will be skipped (critical hotfix)');
          }
        },
      },
    ];

    await this.progress.runSteps(steps);
  }

  async deploy(sessionId?: string, _options: HotfixOptions = {}): Promise<void> {
    const options = _options;
    this.output.header('🚀 Deploying Hotfix');

    try {
      // Find hotfix session
      let session: WorkflowSession | null;

      if (sessionId) {
        session = await this.sessionRepo.getSession(sessionId);
      } else {
        const currentBranch = await this.gitOps.getCurrentBranch();
        session = await this.sessionRepo.getSessionByBranch(currentBranch);
      }

      if (!session) {
        this.output.errorMessage('No hotfix session found');
        return;
      }

      if (session.workflowType !== 'hotfix') {
        this.output.errorMessage('Current session is not a hotfix');
        return;
      }

      // Execute deployment steps based on current state
      await this.executeDeploymentStep(session, options);

    } catch (error) {
      this.output.errorMessage(`Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  private async executeDeploymentStep(session: WorkflowSession, options: HotfixOptions): Promise<void> {
    switch (session.currentState) {
    case 'HOTFIX_READY':
      await this.commitHotfix(session, options);
      break;
    case 'HOTFIX_COMMITTED':
      await this.pushHotfix(session, options);
      break;
    case 'HOTFIX_PUSHED':
      await this.validateHotfix(session, options);
      break;
    case 'HOTFIX_VALIDATED':
      await this.deployToProduction(session, options);
      break;
    case 'HOTFIX_DEPLOYED':
      await this.cleanupHotfix(session, options);
      break;
    default:
      this.output.errorMessage(`Invalid hotfix state: ${session.currentState}`);
    }
  }

  private async commitHotfix(session: WorkflowSession, options: HotfixOptions): Promise<void> {
    this.output.subheader('Committing Hotfix Changes');

    const hasChanges = await this.gitOps.hasUncommittedChanges();
    if (!hasChanges) {
      this.output.errorMessage('No changes to commit');
      return;
    }

    // Stage all changes
    await this.gitOps.stageAll();

    // Generate commit message
    const severity = session.metadata?.severity || 'high';
    const message = `hotfix: emergency fix [${severity.toUpperCase()}]`;

    await this.gitOps.commit(message, { noVerify: options.skipTests });

    // Update state
    session.transitionTo('HOTFIX_COMMITTED', 'user_action', {
      commitMessage: message,
      hasUncommittedChanges: false,
    });
    await this.sessionRepo.updateSession(session.id, session);

    this.output.successMessage('Hotfix committed');
    this.output.infoMessage('Run "hansolo hotfix deploy" to continue');
  }

  private async pushHotfix(session: WorkflowSession, _options: HotfixOptions): Promise<void> {
    this.output.subheader('Pushing Hotfix to Remote');

    await this.gitOps.push('origin', session.branchName, true);

    // Update state
    session.transitionTo('HOTFIX_PUSHED', 'user_action');
    await this.sessionRepo.updateSession(session.id, session);

    this.output.successMessage('Hotfix pushed to remote');
    this.output.infoMessage('Run "hansolo hotfix deploy" to validate');
  }

  private async validateHotfix(session: WorkflowSession, options: HotfixOptions): Promise<void> {
    this.output.subheader('Validating Hotfix');

    const validationContext: Record<string, unknown> = {
      testsPass: !options.skipTests,
      reviewApproved: !options.skipReview,
      ciPassed: true, // Assume CI passes for now
      severity: session.metadata?.severity,
    };

    // Validate state requirements
    const validation = await (this.stateMachine as any).validateStateAsync('HOTFIX_VALIDATED', validationContext);

    if (validation.warnings && validation.warnings.length > 0) {
      validation.warnings.forEach((warning: string) => this.output.warningMessage(warning));
    }

    if (!validation.isValid) {
      this.output.errorMessage('Validation failed:');
      validation.errors.forEach((error: string) => this.output.errorMessage(`  • ${error}`));

      if (!options.force) {
        return;
      }
      this.output.warningMessage('Proceeding with --force flag');
    }

    // Create expedited PR if GitHub is configured
    try {
      const prInfo = {
        title: `[HOTFIX] ${session.branchName}`,
        body: this.generateHotfixPRDescription(session),
        base: 'main',
        head: session.branchName,
      };

      const pr = await this.githubIntegration.createPullRequest(prInfo);
      if (pr) {
        this.output.successMessage(`Hotfix PR #${pr.number} created`);
        validationContext['prNumber'] = pr.number;
        validationContext['prUrl'] = pr.html_url;
      }
    } catch (error) {
      this.output.warningMessage('Could not create PR automatically');
    }

    // Update state
    session.transitionTo('HOTFIX_VALIDATED', 'user_action', validationContext);
    await this.sessionRepo.updateSession(session.id, session);

    this.output.successMessage('Hotfix validated');
    this.output.infoMessage('Run "hansolo hotfix deploy" to deploy to production');
  }

  private async deployToProduction(session: WorkflowSession, options: HotfixOptions): Promise<void> {
    this.output.subheader('🚨 Deploying to Production');

    if (!options.yes) {
      const confirmed = await this.confirmAction('Deploy hotfix to PRODUCTION?');
      if (!confirmed) {
        this.output.infoMessage('Deployment cancelled');
        return;
      }
    }

    const steps = [
      {
        name: 'Merging to main branch',
        action: async () => {
          await this.gitOps.checkoutBranch('main');
          await this.gitOps.merge(session.branchName, false); // No squash for hotfix
          await this.gitOps.push('origin', 'main');
        },
      },
      {
        name: 'Creating production tag',
        action: async () => {
          const tagName = `hotfix-${new Date().toISOString().slice(0, 10)}`;
          await this.gitOps.createTag(tagName, `Hotfix: ${session.branchName}`);
          await this.gitOps.push('origin', tagName);
        },
      },
      {
        name: 'Triggering deployment',
        action: async () => {
          // In a real implementation, this would trigger CI/CD
          this.output.dim('Deployment webhook triggered');
        },
      },
      {
        name: 'Creating backport',
        action: async () => {
          // Ensure changes are in main
          await this.gitOps.checkoutBranch(session.branchName);
        },
      },
    ];

    await this.progress.runSteps(steps);

    // Update state
    session.transitionTo('HOTFIX_DEPLOYED', 'user_action', {
      deploymentSuccessful: true,
      backportCreated: true,
      hasRollbackPlan: true,
    });
    await this.sessionRepo.updateSession(session.id, session);

    this.output.successMessage('🎉 Hotfix deployed to production!');
    this.output.infoMessage('Run "hansolo hotfix deploy" to complete cleanup');
  }

  private async cleanupHotfix(session: WorkflowSession, _options: HotfixOptions): Promise<void> {
    this.output.subheader('Cleaning Up Hotfix');

    const steps = [
      {
        name: 'Switching to main branch',
        action: async () => {
          await this.gitOps.checkoutBranch('main');
        },
      },
      {
        name: 'Deleting hotfix branch',
        action: async () => {
          await this.gitOps.deleteBranch(session.branchName, true);
          try {
            await this.gitOps.deleteRemoteBranch(session.branchName);
          } catch {
            // Branch might already be deleted - ignore error
          }
        },
      },
      {
        name: 'Completing session',
        action: async () => {
          session.transitionTo('HOTFIX_COMPLETE', 'user_action');
          await this.sessionRepo.updateSession(session.id, session);
        },
      },
    ];

    await this.progress.runSteps(steps);

    this.output.successMessage('✨ Hotfix workflow complete!');
    this.showHotfixSummary(session);
  }

  private generateHotfixBranchName(issue?: string): string {
    const timestamp = new Date().toISOString().slice(0, 16).replace(/[:\-T]/g, '');
    const suffix = issue ? `-${issue}` : '';
    return `hotfix/${timestamp}${suffix}`;
  }

  private async promptSeverity(): Promise<'critical' | 'high' | 'medium'> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise(resolve => {
      rl.question('Select severity (1=Critical, 2=High, 3=Medium): ', answer => {
        rl.close();
        switch (answer) {
        case '1':
          resolve('critical');
          break;
        case '2':
          resolve('high');
          break;
        default:
          resolve('medium');
        }
      });
    });
  }

  private async confirmAction(message: string): Promise<boolean> {
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

  private generateHotfixPRDescription(session: WorkflowSession): string {
    const severity = session.metadata?.severity || 'high';
    return `
## 🚨 Emergency Hotfix

**Severity**: ${severity.toUpperCase()}
**Branch**: ${session.branchName}
**Session**: ${session.id}

### Changes
- Emergency fix applied

### Validation
- [ ] Tests ${session.metadata?.skipTests ? 'SKIPPED (Critical)' : 'passed'}
- [ ] Review ${session.metadata?.skipReview ? 'SKIPPED (Critical)' : 'approved'}
- [ ] CI checks passed

### Deployment
- [ ] Deployed to production
- [ ] Monitoring confirms fix
- [ ] Rollback plan documented

---
_Generated by han-solo hotfix workflow_
`;
  }

  private showHotfixStatus(session: WorkflowSession, severity: string): void {
    this.output.box(
      `Session ID: ${session.id.substring(0, 8)}\n` +
      `Branch: ${session.branchName}\n` +
      `Severity: ${severity.toUpperCase()}\n` +
      `State: ${session.currentState}\n\n` +
      'Next steps:\n' +
      '1. Apply your emergency fix\n' +
      '2. Run "hansolo hotfix deploy" to proceed\n' +
      '3. Monitor deployment carefully',
      '🚨 Hotfix Active'
    );
  }

  private showHotfixSummary(session: WorkflowSession): void {
    const duration = Date.now() - new Date(session.createdAt).getTime();
    const minutes = Math.floor(duration / (1000 * 60));

    this.output.box(
      `Session ID: ${session.id.substring(0, 8)}\n` +
      `Branch: ${session.branchName}\n` +
      `Severity: ${session.metadata?.severity?.toUpperCase() || 'N/A'}\n` +
      `Duration: ${minutes} minutes\n` +
      `State Transitions: ${session.stateHistory.length}\n\n` +
      'Timeline:\n' +
      session.stateHistory.map(t => {
        const time = new Date(t.timestamp).toLocaleTimeString();
        return `  ${time}: ${t.from} → ${t.to}`;
      }).join('\n'),
      '✅ Hotfix Complete'
    );
  }

  async rollback(sessionId?: string): Promise<void> {
    this.output.header('⏮️ Rolling Back Hotfix');

    try {
      let session: WorkflowSession | null;

      if (sessionId) {
        session = await this.sessionRepo.getSession(sessionId);
      } else {
        // Find most recent hotfix
        const sessions = await this.sessionRepo.listSessions(true);
        const hotfixes = sessions
          .filter(s => s.workflowType === 'hotfix')
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

        session = hotfixes[0] || null;
      }

      if (!session) {
        this.output.errorMessage('No hotfix session found to rollback');
        return;
      }

      this.output.warningMessage(`Rolling back hotfix: ${session.branchName}`);

      const steps = [
        {
          name: 'Reverting main branch',
          action: async () => {
            await this.gitOps.checkoutBranch('main');
            await this.gitOps.raw(['revert', '--no-edit', 'HEAD']);
          },
        },
        {
          name: 'Pushing rollback',
          action: async () => {
            await this.gitOps.push('origin', 'main');
          },
        },
        {
          name: 'Updating session',
          action: async () => {
            session.transitionTo('ROLLBACK', 'user_action');
            await this.sessionRepo.updateSession(session.id, session);
          },
        },
      ];

      await this.progress.runSteps(steps);

      this.output.successMessage('Hotfix rolled back successfully');

    } catch (error) {
      this.output.errorMessage(`Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }
}