import { GitOperations } from '../../services/git-operations';
import { SessionRepository } from '../../services/session-repository';
import { AuditLogger } from '../../services/audit-logger';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface CleanupOperationsInput {
  cleanupType: 'branch' | 'session' | 'all';
  branchName?: string;
  sessionId?: string;
  force?: boolean;
  includeRemote?: boolean;
}

export interface CleanupOperationsOutput {
  success: boolean;
  cleanedBranches?: string[];
  cleanedSessions?: string[];
  freedSpace?: string;
  message?: string;
  error?: string;
}

export class CleanupOperationsTool {
  name = 'cleanup-operations';
  description = 'Clean up completed workflows, branches, and sessions';

  inputSchema = {
    type: 'object' as const,
    properties: {
      cleanupType: {
        type: 'string',
        enum: ['branch', 'session', 'all'],
        description: 'Type of cleanup to perform',
      },
      branchName: {
        type: 'string',
        description: 'Specific branch to clean up',
      },
      sessionId: {
        type: 'string',
        description: 'Specific session to clean up',
      },
      force: {
        type: 'boolean',
        description: 'Force cleanup even if not merged',
        default: false,
      },
      includeRemote: {
        type: 'boolean',
        description: 'Also delete remote branches',
        default: false,
      },
    },
    required: ['cleanupType'],
  };

  private gitOps: GitOperations;
  private sessionRepo: SessionRepository;
  private auditLogger: AuditLogger;

  constructor() {
    this.gitOps = new GitOperations();
    this.sessionRepo = new SessionRepository('.hansolo');
    this.auditLogger = new AuditLogger();
  }

  async execute(input: CleanupOperationsInput): Promise<CleanupOperationsOutput> {
    try {
      await this.auditLogger.initialize();

      switch (input.cleanupType) {
      case 'branch':
        return await this.cleanupBranch(input);

      case 'session':
        return await this.cleanupSession(input);

      case 'all':
        return await this.cleanupAll(input);

      default:
        return {
          success: false,
          error: `Unknown cleanup type: ${input.cleanupType}`,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.auditLogger.logError(
        error instanceof Error ? error : new Error(errorMessage),
        undefined,
        'cleanup-operations'
      );

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  private async cleanupBranch(input: CleanupOperationsInput): Promise<CleanupOperationsOutput> {
    const cleanedBranches: string[] = [];

    if (input.branchName) {
      // Clean specific branch
      const success = await this.deleteBranch(input.branchName, input.force || false, input.includeRemote || false);
      if (success) {
        cleanedBranches.push(input.branchName);
      } else {
        return {
          success: false,
          error: `Failed to delete branch ${input.branchName}`,
        };
      }
    } else {
      // Clean all merged branches
      const branches = await this.getMergedBranches();
      for (const branch of branches) {
        if (branch !== 'main' && branch !== 'master') {
          const success = await this.deleteBranch(branch, false, input.includeRemote || false);
          if (success) {
            cleanedBranches.push(branch);
          }
        }
      }
    }

    await this.auditLogger.logCustom({
      action: 'git_operation',
      details: {
        command: 'cleanup',
        gitOperation: `deleted ${cleanedBranches.length} branches`,
      },
      result: 'success',
    });

    return {
      success: true,
      cleanedBranches,
      message: `Cleaned up ${cleanedBranches.length} branch(es)`,
    };
  }

  private async cleanupSession(input: CleanupOperationsInput): Promise<CleanupOperationsOutput> {
    const cleanedSessions: string[] = [];

    if (input.sessionId) {
      // Clean specific session
      const session = await this.sessionRepo.load(input.sessionId);
      if (session && (session.currentState === 'COMPLETE' || session.currentState === 'ABORTED' || input.force)) {
        await this.sessionRepo.delete(input.sessionId);
        cleanedSessions.push(input.sessionId);
      } else {
        return {
          success: false,
          error: `Session ${input.sessionId} is not in a completed state`,
        };
      }
    } else {
      // Clean all completed sessions
      const sessions = await this.sessionRepo.listSessions();
      for (const session of sessions) {
        if (session.currentState === 'COMPLETE' || session.currentState === 'ABORTED') {
          await this.sessionRepo.delete(session.id);
          cleanedSessions.push(session.id);
        }
      }
    }

    return {
      success: true,
      cleanedSessions,
      message: `Cleaned up ${cleanedSessions.length} session(s)`,
    };
  }

  private async cleanupAll(input: CleanupOperationsInput): Promise<CleanupOperationsOutput> {
    const branchResult = await this.cleanupBranch({ ...input, cleanupType: 'branch' });
    const sessionResult = await this.cleanupSession({ ...input, cleanupType: 'session' });

    // Clean up old audit logs
    const freedSpace = await this.cleanupAuditLogs();

    return {
      success: branchResult.success && sessionResult.success,
      cleanedBranches: branchResult.cleanedBranches,
      cleanedSessions: sessionResult.cleanedSessions,
      freedSpace,
      message: `Cleaned up ${branchResult.cleanedBranches?.length || 0} branch(es), ${sessionResult.cleanedSessions?.length || 0} session(s)`,
    };
  }

  private async getMergedBranches(): Promise<string[]> {
    try {
      const result = await this.gitOps.execute(['branch', '--merged', 'main']);
      return result
        .split('\n')
        .map(b => b.trim().replace('* ', ''))
        .filter(b => b && b !== 'main' && b !== 'master');
    } catch {
      return [];
    }
  }

  private async deleteBranch(branchName: string, force: boolean, includeRemote: boolean): Promise<boolean> {
    try {
      // Delete local branch
      const deleteFlag = force ? '-D' : '-d';
      await this.gitOps.execute(['branch', deleteFlag, branchName]);

      // Delete remote branch if requested
      if (includeRemote) {
        try {
          await this.gitOps.execute(['push', 'origin', '--delete', branchName]);
        } catch {
          // Remote branch might not exist
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  private async cleanupAuditLogs(): Promise<string> {
    try {
      const auditDir = path.join(process.cwd(), '.hansolo', 'audit');
      const files = await fs.readdir(auditDir);

      const now = Date.now();
      const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

      let totalSize = 0;

      for (const file of files) {
        const filePath = path.join(auditDir, file);
        const stats = await fs.stat(filePath);

        if (stats.mtimeMs < thirtyDaysAgo) {
          totalSize += stats.size;
          await fs.unlink(filePath);
        }
      }

      return `${(totalSize / 1024).toFixed(2)} KB`;
    } catch {
      return '0 KB';
    }
  }
}