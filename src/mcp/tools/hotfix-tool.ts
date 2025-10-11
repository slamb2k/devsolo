import {
  BaseMCPTool,
  WorkflowToolInput,
  WorkflowContext,
  PromptCollectionResult,
  WorkflowExecutionResult,
} from './workflow-tool-base';
import { SessionToolResult } from './base-tool';
import { WorkflowSession } from '../../models/workflow-session';
import { GitOperations } from '../../services/git-operations';
import { SessionRepository } from '../../services/session-repository';
import { ConfigurationManager } from '../../services/configuration-manager';
import { GitHubIntegration } from '../../services/github-integration';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

/**
 * Input for hotfix tool
 */
export interface HotfixToolInput extends WorkflowToolInput {
  issue?: string;
  severity?: 'critical' | 'high' | 'medium';
  skipTests?: boolean;
  skipReview?: boolean;
  autoMerge?: boolean;
}

/**
 * Hotfix tool - Creates emergency hotfix workflow
 */
export class HotfixTool extends BaseMCPTool<HotfixToolInput, SessionToolResult> {
  constructor(
    private gitOps: GitOperations,
    private sessionRepo: SessionRepository,
    configManager: ConfigurationManager,
    private githubIntegration: GitHubIntegration,
    server?: Server
  ) {
    super(configManager, server);
  }

  protected getBanner(): string {
    return `░█░█░█▀█░▀█▀░█▀▀░▀█▀░█░█░
░█▀█░█░█░░█░░█▀▀░░█░░▄▀▄░
░▀░▀░▀▀▀░░▀░░▀░░░▀▀▀░▀░▀░`;
  }

  protected async collectMissingParameters(
    input: HotfixToolInput
  ): Promise<PromptCollectionResult> {
    // Prompt-based parameter collection: handle missing issue
    if (!input.issue) {
      try {
        // Get recent commits for context
        const recentCommits = await this.gitOps.getCommitsSince('main');
        const lastCommits = recentCommits.slice(0, 10);

        // Check GitHub availability (issues fetching not yet implemented)
        let githubAvailable = false;
        try {
          githubAvailable = await this.githubIntegration.initialize();
        } catch {
          // GitHub integration not available - that's okay
        }

        return {
          collected: false,
          result: {
            success: true,
            message: 'No issue provided. Analyze the context below and either generate an issue description from recent commits or ask the user.',
            data: {
              // Raw commits for analysis
              recentCommits: lastCommits.map(c => ({
                message: c.message,
                hash: c.hash.substring(0, 7),
                author: c.author_name,
                date: c.date,
              })),

              // Additional context
              severity: input.severity || 'high',
              githubAvailable: githubAvailable,
            },
            nextSteps: [
              'Option 1: Analyze recent commits to generate an issue description',
              'Option 2: Ask the user what issue they want to fix',
              'Call devsolo_hotfix again with issue parameter',
            ],
          } as SessionToolResult,
        };
      } catch (error) {
        return {
          collected: false,
          result: {
            success: false,
            errors: [`Failed to gather issue context: ${error instanceof Error ? error.message : String(error)}`],
          },
        };
      }
    }

    return { collected: true };
  }

  protected async createContext(input: HotfixToolInput): Promise<Record<string, unknown>> {
    // Generate hotfix branch name
    const severity = input.severity || 'high';
    const issueSlug = input.issue!.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const branchName = `hotfix/${severity}-${issueSlug}`;

    return {
      branchName,
      severity,
      issue: input.issue,
    };
  }

  protected async executeWorkflow(
    context: WorkflowContext
  ): Promise<WorkflowExecutionResult> {
    const input = context.input as HotfixToolInput;
    const branchName = context['branchName'] as string;
    const severity = context['severity'] as string;
    const issue = context['issue'] as string;

    // Create hotfix session
    const session = new WorkflowSession({
      branchName,
      workflowType: 'hotfix',
      metadata: {
        projectPath: process.cwd(),
        startedAt: new Date().toISOString(),
        context: {
          issue,
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
      data: {
        sessionId: session.id,
        branchName: session.branchName,
        state: session.currentState,
        nextSteps: [
          `Hotfix branch created: ${branchName}`,
          `Severity: ${severity}`,
          'Make your hotfix changes',
          'Use devsolo_commit to commit',
          'Use devsolo_ship to deploy hotfix',
          ...(input.skipTests ? ['⚠️  Tests will be skipped'] : []),
          ...(input.skipReview ? ['⚠️  Code review will be skipped'] : []),
          ...(input.autoMerge ? ['✅ Will auto-merge when checks pass'] : []),
        ],
      },
    };
  }
}
