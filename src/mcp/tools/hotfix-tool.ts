import { MCPTool, SessionToolResult, createErrorResult } from './base-tool';
import { WorkflowSession } from '../../models/workflow-session';
import { GitOperations } from '../../services/git-operations';
import { SessionRepository } from '../../services/session-repository';
import { ConfigurationManager } from '../../services/configuration-manager';

/**
 * Input for hotfix tool
 */
export interface HotfixToolInput {
  issue: string;
  severity?: 'critical' | 'high' | 'medium';
  skipTests?: boolean;
  skipReview?: boolean;
  autoMerge?: boolean;
  force?: boolean;
  yes?: boolean;
}

/**
 * Hotfix tool - Creates emergency hotfix workflow
 */
export class HotfixTool implements MCPTool<HotfixToolInput, SessionToolResult> {
  constructor(
    private gitOps: GitOperations,
    private sessionRepo: SessionRepository,
    private configManager: ConfigurationManager
  ) {}

  async execute(input: HotfixToolInput): Promise<SessionToolResult> {
    try {
      // Check initialization
      if (!(await this.configManager.isInitialized())) {
        return {
          success: false,
          errors: ['han-solo is not initialized. Run hansolo_init first.'],
        };
      }

      // Validate we're on main branch
      const currentBranch = await this.gitOps.getCurrentBranch();
      const mainBranch = 'main';

      if (currentBranch !== mainBranch && !input.force) {
        return {
          success: false,
          errors: [`Hotfixes must be created from ${mainBranch} branch`],
          warnings: ['Use force: true to override'],
        };
      }

      // Check for clean working directory
      const hasChanges = await this.gitOps.hasUncommittedChanges();

      if (hasChanges && !input.force) {
        return {
          success: false,
          errors: ['Working directory has uncommitted changes'],
          warnings: ['Commit or stash changes first, or use force: true'],
        };
      }

      // Generate hotfix branch name
      const severity = input.severity || 'high';
      const issueSlug = input.issue.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const branchName = `hotfix/${severity}-${issueSlug}`;

      // Check if branch already exists
      const branchExists = await this.gitOps.branchExists(branchName);

      if (branchExists && !input.force) {
        return {
          success: false,
          errors: [`Branch ${branchName} already exists`],
          warnings: ['Use a different issue description or force: true'],
        };
      }

      // Create hotfix session
      const session = new WorkflowSession({
        branchName,
        workflowType: 'hotfix',
        metadata: {
          projectPath: process.cwd(),
          startedAt: new Date().toISOString(),
          context: {
            issue: input.issue,
            severity,
            skipTests: input.skipTests,
            skipReview: input.skipReview,
            autoMerge: input.autoMerge,
          },
        },
      });

      await this.sessionRepo.createSession(session);

      // Create and checkout hotfix branch
      await this.gitOps.createBranch(branchName);
      await this.gitOps.checkoutBranch(branchName);

      // Update session state
      session.transitionTo('BRANCH_READY', 'user_action');
      await this.sessionRepo.updateSession(session.id, session);

      return {
        success: true,
        sessionId: session.id,
        branchName: session.branchName,
        state: session.currentState,
        nextSteps: [
          `Hotfix branch created: ${branchName}`,
          `Severity: ${severity}`,
          'Make your hotfix changes',
          'Use hansolo_commit to commit',
          'Use hansolo_ship to deploy hotfix',
          ...(input.skipTests ? ['⚠️  Tests will be skipped'] : []),
          ...(input.skipReview ? ['⚠️  Code review will be skipped'] : []),
          ...(input.autoMerge ? ['✅ Will auto-merge when checks pass'] : []),
        ],
      };
    } catch (error) {
      return createErrorResult(error, 'HotfixTool');
    }
  }
}
