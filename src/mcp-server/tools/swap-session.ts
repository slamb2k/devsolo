import { SessionRepository } from '../../services/session-repository';
import { GitOperations } from '../../services/git-operations';
import { AuditLogger } from '../../services/audit-logger';

export interface SwapSessionInput {
  sessionId: string;
  saveCurrentWork?: boolean;
}

export interface SwapSessionOutput {
  success: boolean;
  previousSessionId?: string;
  currentSessionId?: string;
  branchName?: string;
  message?: string;
  error?: string;
}

export class SwapSessionTool {
  name = 'swap-session';
  description = 'Swap between active workflow sessions';

  inputSchema = {
    type: 'object' as const,
    properties: {
      sessionId: {
        type: 'string',
        description: 'Session ID to swap to',
      },
      saveCurrentWork: {
        type: 'boolean',
        description: 'Save uncommitted work before swapping',
        default: true,
      },
    },
    required: ['sessionId'],
  };

  private sessionRepo: SessionRepository;
  private gitOps: GitOperations;
  private auditLogger: AuditLogger;

  constructor() {
    this.sessionRepo = new SessionRepository('.hansolo');
    this.gitOps = new GitOperations();
    this.auditLogger = new AuditLogger();
  }

  async execute(input: SwapSessionInput): Promise<SwapSessionOutput> {
    try {
      await this.auditLogger.initialize();

      // Get current session if any
      const currentBranch = await this.gitOps.getCurrentBranch();
      const currentSession = await this.sessionRepo.getSessionByBranch(currentBranch);

      // Load target session
      const targetSession = await this.sessionRepo.load(input.sessionId);

      if (!targetSession) {
        return {
          success: false,
          error: `Session ${input.sessionId} not found`,
        };
      }

      // Save current work if requested
      if (input.saveCurrentWork) {
        const hasChanges = await this.gitOps.hasUncommittedChanges();
        if (hasChanges) {
          await this.gitOps.execute(['stash', 'push', '-m', `Swap from ${currentBranch}`]);
        }
      }

      // Switch to target branch
      const targetBranch = targetSession.gitBranch;
      if (!targetBranch) {
        return {
          success: false,
          error: 'Target session has no associated branch',
        };
      }

      await this.gitOps.execute(['checkout', targetBranch]);

      // Check for stashed changes for this branch
      const stashList = await this.gitOps.execute(['stash', 'list']);
      if (stashList.includes(`Swap from ${targetBranch}`)) {
        await this.gitOps.execute(['stash', 'pop']);
      }

      // Update session as active
      targetSession.lastUpdated = new Date().toISOString();
      await this.sessionRepo.save(targetSession);

      await this.auditLogger.logCustom({
        sessionId: input.sessionId,
        action: 'session_resumed',
        details: {
          command: 'swap-session',
          gitOperation: `checkout ${targetBranch}`,
        },
        result: 'success',
      });

      return {
        success: true,
        previousSessionId: currentSession?.id,
        currentSessionId: targetSession.id,
        branchName: targetBranch,
        message: `Swapped to session ${targetSession.id.substring(0, 8)} on branch ${targetBranch}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.auditLogger.logError(
        error instanceof Error ? error : new Error(errorMessage),
        input.sessionId,
        'swap-session'
      );

      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}