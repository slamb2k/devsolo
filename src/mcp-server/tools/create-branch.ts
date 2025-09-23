import { GitOperations } from '../../services/git-operations';
import { ValidationService } from '../../services/validation-service';
import { AuditLogger } from '../../services/audit-logger';

export interface CreateBranchInput {
  branchName: string;
  baseBranch?: string;
  checkout?: boolean;
}

export interface CreateBranchOutput {
  success: boolean;
  branchName?: string;
  baseBranch?: string;
  checkedOut?: boolean;
  message?: string;
  error?: string;
}

export class CreateBranchTool {
  name = 'create-branch';
  description = 'Create a new Git branch following han-solo naming conventions';

  inputSchema = {
    type: 'object' as const,
    properties: {
      branchName: {
        type: 'string',
        description: 'Name for the new branch (format: NNN-feature-name)',
      },
      baseBranch: {
        type: 'string',
        description: 'Base branch to create from (default: current branch)',
      },
      checkout: {
        type: 'boolean',
        description: 'Switch to the new branch after creation',
        default: true,
      },
    },
    required: ['branchName'],
  };

  private gitOps: GitOperations;
  private validationService: ValidationService;
  private auditLogger: AuditLogger;

  constructor() {
    this.gitOps = new GitOperations();
    this.validationService = new ValidationService(this.gitOps);
    this.auditLogger = new AuditLogger();
  }

  async execute(input: CreateBranchInput): Promise<CreateBranchOutput> {
    try {
      await this.auditLogger.initialize();

      // Validate branch name
      const validation = this.validationService.validateBranchName(input.branchName);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join('; '),
        };
      }

      // Check if branch already exists
      const branchExists = await this.checkBranchExists(input.branchName);
      if (branchExists) {
        return {
          success: false,
          error: `Branch '${input.branchName}' already exists`,
        };
      }

      // Get base branch
      const baseBranch = input.baseBranch || await this.gitOps.getCurrentBranch();

      // Ensure we're up to date with base branch
      if (input.baseBranch && input.baseBranch !== await this.gitOps.getCurrentBranch()) {
        await this.gitOps.execute(['checkout', input.baseBranch]);
      }

      // Create the branch
      if (input.checkout) {
        await this.gitOps.execute(['checkout', '-b', input.branchName]);
      } else {
        await this.gitOps.execute(['branch', input.branchName]);
      }

      await this.auditLogger.logGitOperation(
        undefined,
        `create branch ${input.branchName}`,
        true,
        'system'
      );

      return {
        success: true,
        branchName: input.branchName,
        baseBranch,
        checkedOut: input.checkout,
        message: `Created branch '${input.branchName}' from '${baseBranch}'${input.checkout ? ' and checked out' : ''}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.auditLogger.logError(
        error instanceof Error ? error : new Error(errorMessage),
        undefined,
        'create-branch'
      );

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  private async checkBranchExists(branchName: string): Promise<boolean> {
    try {
      await this.gitOps.execute(['show-ref', '--verify', `refs/heads/${branchName}`]);
      return true;
    } catch {
      return false;
    }
  }
}