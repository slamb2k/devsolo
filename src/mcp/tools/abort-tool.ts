import {
  BaseMCPTool,
  WorkflowToolInput,
  WorkflowContext,
  WorkflowExecutionResult,
} from './workflow-tool-base';
import { SessionToolResult } from './base-tool';
import { SessionRepository } from '../../services/session-repository';
import { GitOperations } from '../../services/git-operations';
import { ConfigurationManager } from '../../services/configuration-manager';
import { WorkflowSession } from '../../models/workflow-session';
import { PreFlightVerificationResult, PreFlightCheckResult } from '../../services/validation/pre-flight-check-service';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

/**
 * Input for abort tool
 */
export interface AbortToolInput extends WorkflowToolInput {
  branchName?: string;
  deleteBranch?: boolean;
}

/**
 * Abort tool - Aborts a workflow session
 */
export class AbortTool extends BaseMCPTool<AbortToolInput, SessionToolResult> {
  constructor(
    private sessionRepo: SessionRepository,
    private gitOps: GitOperations,
    configManager: ConfigurationManager,
    server?: Server
  ) {
    super(configManager, server);
  }

  protected getBanner(): string {
    return `░█▀█░█▀▄░█▀█░█▀▄░▀█▀░▀█▀░█▀█░█▀▀░
░█▀█░█▀▄░█░█░█▀▄░░█░░░█░░█░█░█░█░
░▀░▀░▀▀░░▀▀▀░▀░▀░░▀░░▀▀▀░▀░▀░▀▀▀░`;
  }

  protected getSlashCommand(): string | null {
    return '/devsolo:abort';
  }

  protected async createContext(input: AbortToolInput): Promise<Record<string, unknown>> {
    // Get session to abort (will be validated in pre-flight checks)
    const targetBranch = input.branchName || (await this.gitOps.getCurrentBranch());
    const session = await this.sessionRepo.getSessionByBranch(targetBranch);

    return { session, targetBranch };
  }

  protected async runPreFlightChecks(
    context: WorkflowContext
  ): Promise<PreFlightVerificationResult> {
    const input = context.input as AbortToolInput;
    const session = context['session'] as WorkflowSession | undefined;
    const targetBranch = context['targetBranch'] as string;

    const checks: PreFlightCheckResult[] = [];

    // Check 1: Session exists
    const sessionExistsCheck: PreFlightCheckResult = session
      ? {
        name: 'Session Exists',
        passed: true,
        message: `Session found for branch '${targetBranch}'`,
        level: 'info',
      }
      : {
        name: 'Session Exists',
        passed: false,
        message: `No session found for branch '${targetBranch}'`,
        level: 'error',
        suggestions: ['Use devsolo_sessions to list available sessions'],
      };
    checks.push(sessionExistsCheck);

    // Check 2: Session is active (not already aborted/complete) - only if not in auto mode
    if (session && !input.auto) {
      const sessionActiveCheck: PreFlightCheckResult = session.isActive()
        ? {
          name: 'Session Active',
          passed: true,
          message: 'Session is active and can be aborted',
          level: 'info',
        }
        : {
          name: 'Session Active',
          passed: false,
          message: `Session already in terminal state: ${session.currentState}`,
          level: 'error',
          suggestions: ['Session is already aborted or complete'],
        };
      checks.push(sessionActiveCheck);
    }

    // Build result
    const failures = checks
      .filter(c => !c.passed && c.level === 'error')
      .map(c => c.message || c.name);

    const allPassed = checks.every(c => c.passed);
    const passedCount = checks.filter(c => c.passed).length;
    const failedCount = checks.filter(c => !c.passed && c.level === 'error').length;

    return {
      allPassed,
      checks,
      failures,
      warnings: [],
      prompts: [],
      passedCount,
      failedCount,
      warningCount: 0,
      promptCount: 0,
    };
  }

  protected async executeWorkflow(
    context: WorkflowContext
  ): Promise<WorkflowExecutionResult> {
    const input = context.input as AbortToolInput;
    const session = context['session'] as WorkflowSession;
    const targetBranch = context['targetBranch'] as string;

    // Transition session to aborted
    session.transitionTo('ABORTED', 'user_action');
    await this.sessionRepo.updateSession(session.id, session);

    // Clean up aborted session to prevent accumulation
    try {
      await this.sessionRepo.deleteSession(session.id);
    } catch (error) {
      // Non-fatal - session marked aborted even if cleanup fails
      console.error('Failed to cleanup session:', error);
    }

    const warnings: string[] = [];

    // Delete branch if requested
    if (input.deleteBranch) {
      try {
        const currentBranch = await this.gitOps.getCurrentBranch();

        // Switch to main if currently on the target branch
        if (currentBranch === targetBranch) {
          const mainBranch = 'main';
          await this.gitOps.checkoutBranch(mainBranch);
        }

        // Delete local branch
        await this.gitOps.deleteBranch(targetBranch, true);

        // Delete remote branch if exists
        try {
          await this.gitOps.deleteRemoteBranch(targetBranch);

          // Prune stale remote-tracking refs after deletion
          try {
            await this.gitOps.pruneRemoteRefs();
          } catch {
            // Non-fatal - remote refs may still be cleaned up later
          }
        } catch {
          // Remote branch might not exist
        }
      } catch (error) {
        warnings.push(`Branch deletion failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return {
      success: true,
      data: {
        sessionId: session.id,
        branchName: session.branchName,
        state: session.currentState,
        nextSteps: [
          'Session has been aborted',
          input.deleteBranch ? 'Branch has been deleted' : 'Branch still exists (use --delete-branch to remove it)',
          'Use devsolo_launch to start a new workflow',
        ],
      },
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }
}
