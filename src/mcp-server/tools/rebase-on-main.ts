import { GitOperations } from '../../services/git-operations';
import { SessionRepository } from '../../services/session-repository';
import { AuditLogger } from '../../services/audit-logger';

export interface RebaseOnMainInput {
  sessionId?: string;
  branchName?: string;
  interactive?: boolean;
  autosquash?: boolean;
}

export interface RebaseOnMainOutput {
  success: boolean;
  branchName?: string;
  commitCount?: number;
  conflicts?: string[];
  message?: string;
  error?: string;
}

export class RebaseOnMainTool {
  name = 'rebase-on-main';
  description = 'Rebase current branch on latest main to maintain linear history';

  inputSchema = {
    type: 'object' as const,
    properties: {
      sessionId: {
        type: 'string',
        description: 'Session ID to rebase',
      },
      branchName: {
        type: 'string',
        description: 'Branch name to rebase',
      },
      interactive: {
        type: 'boolean',
        description: 'Use interactive rebase',
        default: false,
      },
      autosquash: {
        type: 'boolean',
        description: 'Automatically squash fixup commits',
        default: true,
      },
    },
    required: [],
  };

  private gitOps: GitOperations;
  private sessionRepo: SessionRepository;
  private auditLogger: AuditLogger;

  constructor() {
    this.gitOps = new GitOperations();
    this.sessionRepo = new SessionRepository('.hansolo');
    this.auditLogger = new AuditLogger();
  }

  async execute(input: RebaseOnMainInput): Promise<RebaseOnMainOutput> {
    try {
      await this.auditLogger.initialize();

      // Determine branch to rebase
      let branchName: string;

      if (input.sessionId) {
        const session = await this.sessionRepo.load(input.sessionId);
        if (!session) {
          return {
            success: false,
            error: `Session ${input.sessionId} not found`,
          };
        }
        branchName = session.gitBranch || '';
      } else if (input.branchName) {
        branchName = input.branchName;
      } else {
        branchName = await this.gitOps.getCurrentBranch();
      }

      if (!branchName || branchName === 'main' || branchName === 'master') {
        return {
          success: false,
          error: 'Cannot rebase main/master branch',
        };
      }

      // Ensure we're on the right branch
      const currentBranch = await this.gitOps.getCurrentBranch();
      if (currentBranch !== branchName) {
        await this.gitOps.execute(['checkout', branchName]);
      }

      // Fetch latest main
      await this.gitOps.execute(['fetch', 'origin', 'main:main']);

      // Get commit count
      const commitCount = await this.getCommitCount(branchName);

      // Check for uncommitted changes
      const hasChanges = await this.gitOps.hasUncommittedChanges();
      if (hasChanges) {
        return {
          success: false,
          error: 'Cannot rebase with uncommitted changes. Please commit or stash them first.',
        };
      }

      // Perform the rebase
      const rebaseArgs = ['rebase'];

      if (input.interactive) {
        // Note: Interactive rebase requires manual intervention
        return {
          success: false,
          error: 'Interactive rebase is not supported in automated mode. Please run manually.',
        };
      }

      if (input.autosquash) {
        rebaseArgs.push('--autosquash');
      }

      rebaseArgs.push('main');

      try {
        await this.gitOps.execute(rebaseArgs);

        await this.auditLogger.logGitOperation(
          input.sessionId,
          `rebase on main (${commitCount} commits)`,
          true,
          'system'
        );

        return {
          success: true,
          branchName,
          commitCount,
          message: `Successfully rebased ${branchName} on main (${commitCount} commits)`,
        };
      } catch (rebaseError) {
        // Check if we have conflicts
        const conflicts = await this.checkForConflicts();

        if (conflicts.length > 0) {
          // Abort the rebase
          try {
            await this.gitOps.execute(['rebase', '--abort']);
          } catch {
            // Ignore abort errors
          }

          await this.auditLogger.logGitOperation(
            input.sessionId,
            'rebase failed - conflicts',
            false,
            'system',
            `Conflicts in ${conflicts.length} files`
          );

          return {
            success: false,
            branchName,
            conflicts,
            error: `Rebase failed due to conflicts in ${conflicts.length} file(s). Rebase aborted.`,
          };
        }

        throw rebaseError;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.auditLogger.logError(
        error instanceof Error ? error : new Error(errorMessage),
        input.sessionId,
        'rebase-on-main'
      );

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  private async getCommitCount(branchName: string): Promise<number> {
    try {
      const result = await this.gitOps.execute([
        'rev-list',
        '--count',
        `main..${branchName}`,
      ]);
      return parseInt(result.trim(), 10) || 0;
    } catch {
      return 0;
    }
  }

  private async checkForConflicts(): Promise<string[]> {
    try {
      const result = await this.gitOps.execute(['diff', '--name-only', '--diff-filter=U']);
      return result
        .split('\n')
        .map(f => f.trim())
        .filter(f => f);
    } catch {
      return [];
    }
  }
}