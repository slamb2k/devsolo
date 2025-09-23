import { ValidationService } from '../../services/validation-service';
import { GitOperations } from '../../services/git-operations';

export interface ValidateEnvironmentInput {
  verbose?: boolean;
}

export interface ValidateEnvironmentOutput {
  success: boolean;
  valid: boolean;
  errors: string[];
  warnings: string[];
  info: string[];
  environment?: {
    gitVersion?: string;
    nodeVersion?: string;
    isGitRepo?: boolean;
    hasGitHubCli?: boolean;
    hansoloInitialized?: boolean;
  };
}

export class ValidateEnvironmentTool {
  name = 'validate-environment';
  description = 'Validate that the environment is properly configured for han-solo';

  inputSchema = {
    type: 'object' as const,
    properties: {
      verbose: {
        type: 'boolean',
        description: 'Include detailed environment information',
        default: false,
      },
    },
    required: [],
  };

  private validationService: ValidationService;

  constructor() {
    const gitOps = new GitOperations();
    this.validationService = new ValidationService(gitOps);
  }

  async execute(input: ValidateEnvironmentInput): Promise<ValidateEnvironmentOutput> {
    try {
      const result = await this.validationService.validateEnvironment();

      const output: ValidateEnvironmentOutput = {
        success: true,
        valid: result.valid,
        errors: result.errors,
        warnings: result.warnings,
        info: result.info,
      };

      if (input.verbose) {
        // Gather additional environment details
        const gitOps = new GitOperations();

        try {
          const gitVersion = await gitOps.execute(['--version']);
          const isGitRepo = await this.checkIsGitRepo(gitOps);
          const hasGitHubCli = await this.checkGitHubCli();
          const hansoloInitialized = await this.checkHansoloInit();

          output.environment = {
            gitVersion: gitVersion.trim(),
            nodeVersion: process.version,
            isGitRepo,
            hasGitHubCli,
            hansoloInitialized,
          };
        } catch (error) {
          // Include partial information even if some checks fail
        }
      }

      return output;
    } catch (error) {
      return {
        success: false,
        valid: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
        info: [],
      };
    }
  }

  private async checkIsGitRepo(gitOps: GitOperations): Promise<boolean> {
    try {
      await gitOps.execute(['rev-parse', '--git-dir']);
      return true;
    } catch {
      return false;
    }
  }

  private async checkGitHubCli(): Promise<boolean> {
    try {
      const { execSync } = require('child_process');
      execSync('gh --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  private async checkHansoloInit(): Promise<boolean> {
    try {
      const fs = require('fs').promises;
      const path = require('path');

      const dirs = [
        path.join(process.cwd(), '.hansolo'),
        path.join(process.env['HOME'] || '', '.hansolo'),
      ];

      for (const dir of dirs) {
        try {
          await fs.access(dir);
          return true;
        } catch {
          // Continue checking
        }
      }
      return false;
    } catch {
      return false;
    }
  }
}