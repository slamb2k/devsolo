import * as fs from 'fs/promises';
import * as path from 'path';
import { GitOperations } from './git-operations';
import { StateName, WorkflowType } from '../models/types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  info: string[];
}

export interface StateValidationContext {
  currentState: StateName;
  workflowType: WorkflowType;
  sessionId: string;
  branchName?: string;
  hasChanges?: boolean;
  hasPullRequest?: boolean;
  isRebasing?: boolean;
}

export class ValidationService {
  private gitOps: GitOperations;

  constructor(gitOps?: GitOperations) {
    this.gitOps = gitOps || new GitOperations();
  }

  public async validateEnvironment(): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      info: [],
    };

    // Check Git installation
    const gitVersion = await this.checkGitVersion();
    if (!gitVersion) {
      result.valid = false;
      result.errors.push('Git is not installed or not in PATH');
    } else {
      result.info.push(`Git version: ${gitVersion}`);
    }

    // Check if we're in a Git repository
    const isRepo = await this.checkIsGitRepo();
    if (!isRepo) {
      result.valid = false;
      result.errors.push('Not in a Git repository');
    }

    // Check for GitHub CLI (optional but recommended)
    const hasGhCli = await this.checkGitHubCli();
    if (!hasGhCli) {
      result.warnings.push('GitHub CLI (gh) not found - PR creation will be limited');
    } else {
      result.info.push('GitHub CLI is installed');
    }

    // Check Node version
    const nodeVersion = process.version;
    const versionParts = nodeVersion.slice(1).split('.');
    const majorVersion = parseInt(versionParts[0] || '0', 10);
    if (majorVersion < 18) {
      result.warnings.push(`Node.js version ${nodeVersion} is below recommended v18+`);
    } else {
      result.info.push(`Node.js version: ${nodeVersion}`);
    }

    // Check for .hansolo directory
    const hansoloDir = await this.checkHansoloDirectory();
    if (!hansoloDir) {
      result.info.push('Han-solo directory not initialized (will be created on first use)');
    }

    return result;
  }

  private async checkGitVersion(): Promise<string | null> {
    try {
      const result = await this.gitOps.execute(['--version']);
      return result.trim();
    } catch {
      return null;
    }
  }

  private async checkIsGitRepo(): Promise<boolean> {
    try {
      await this.gitOps.execute(['rev-parse', '--git-dir']);
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

  private async checkHansoloDirectory(): Promise<boolean> {
    try {
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

  public async validateStateTransition(
    from: StateName,
    to: StateName,
    context: StateValidationContext
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      info: [],
    };

    // Validate based on workflow type
    const validTransitions = this.getValidTransitions(context.workflowType);
    const allowedTransitions = validTransitions[from] || [];

    if (!allowedTransitions.includes(to)) {
      result.valid = false;
      result.errors.push(
        `Invalid state transition: ${from} -> ${to} for ${context.workflowType} workflow`
      );
    }

    // Additional validation based on state requirements
    await this.validateStateRequirements(to, context, result);

    return result;
  }

  private getValidTransitions(workflowType: WorkflowType): Partial<Record<StateName, StateName[]>> {
    switch (workflowType) {
    case 'launch':
      return {
        'INIT': ['BRANCH_READY'],
        'BRANCH_READY': ['CHANGES_COMMITTED', 'ABORTED'],
        'CHANGES_COMMITTED': ['PUSHED', 'ABORTED'],
        'PUSHED': ['PR_CREATED', 'ABORTED'],
        'PR_CREATED': ['WAITING_APPROVAL', 'ABORTED'],
        'WAITING_APPROVAL': ['COMPLETE', 'ABORTED'],
        'COMPLETE': [],
        'ABORTED': [],
      };

    case 'ship':
      return {
        'INIT': ['CHANGES_COMMITTED', 'PUSHED'],
        'CHANGES_COMMITTED': ['PUSHED', 'ABORTED'],
        'PUSHED': ['PR_CREATED', 'WAITING_APPROVAL', 'ABORTED'],
        'PR_CREATED': ['WAITING_APPROVAL', 'ABORTED'],
        'WAITING_APPROVAL': ['REBASING', 'ABORTED'],
        'REBASING': ['MERGING', 'ABORTED'],
        'MERGING': ['CLEANUP', 'ABORTED'],
        'CLEANUP': ['COMPLETE'],
        'COMPLETE': [],
        'ABORTED': [],
      };

    case 'hotfix':
      return {
        'HOTFIX_INIT': ['HOTFIX_READY'],
        'HOTFIX_READY': ['HOTFIX_COMMITTED', 'ABORTED'],
        'HOTFIX_COMMITTED': ['HOTFIX_PUSHED', 'ABORTED'],
        'HOTFIX_PUSHED': ['HOTFIX_VALIDATED', 'ABORTED'],
        'HOTFIX_VALIDATED': ['HOTFIX_DEPLOYED', 'ABORTED'],
        'HOTFIX_DEPLOYED': ['HOTFIX_CLEANUP', 'ABORTED'],
        'HOTFIX_CLEANUP': ['HOTFIX_COMPLETE'],
        'HOTFIX_COMPLETE': [],
        'COMPLETE': [],
        'ABORTED': [],
      };

    default:
      return {};
    }
  }

  private async validateStateRequirements(
    state: StateName,
    context: StateValidationContext,
    result: ValidationResult
  ): Promise<void> {
    switch (state) {
    case 'BRANCH_READY':
    case 'HOTFIX_READY':
      if (!context.branchName) {
        result.valid = false;
        result.errors.push('Branch name is required for BRANCH_READY state');
      }
      break;

    case 'CHANGES_COMMITTED':
    case 'HOTFIX_COMMITTED':
      if (!context.hasChanges) {
        result.warnings.push('No changes detected to commit');
      }
      break;

    case 'PUSHED':
    case 'HOTFIX_PUSHED':
      if (!context.branchName) {
        result.valid = false;
        result.errors.push('Branch must exist before pushing');
      }
      break;

    case 'PR_CREATED':
      if (!context.hasPullRequest) {
        result.warnings.push('Pull request not yet created');
      }
      break;

    case 'REBASING':
      if (context.isRebasing) {
        result.warnings.push('Already in rebasing state');
      }
      break;
    }
  }

  public validateBranchName(branchName: string): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      info: [],
    };

    // Check if branch name follows the pattern
    const pattern = /^\d{3}-[a-z0-9-]+$/;
    if (!pattern.test(branchName)) {
      result.valid = false;
      result.errors.push(
        'Branch name must follow pattern: NNN-feature-name (e.g., 001-add-auth)'
      );
    }

    // Check length
    if (branchName.length > 63) {
      result.valid = false;
      result.errors.push('Branch name must be 63 characters or less');
    }

    // Check for invalid characters
    const invalidChars = /[^a-z0-9-]/;
    if (invalidChars.test(branchName)) {
      result.valid = false;
      result.errors.push('Branch name can only contain lowercase letters, numbers, and hyphens');
    }

    // Check for consecutive hyphens
    if (branchName.includes('--')) {
      result.warnings.push('Avoid consecutive hyphens in branch names');
    }

    return result;
  }

  public validateCommitMessage(message: string): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      info: [],
    };

    // Check if message is empty
    if (!message || message.trim().length === 0) {
      result.valid = false;
      result.errors.push('Commit message cannot be empty');
      return result;
    }

    // Check length of first line
    const lines = message.split('\n');
    const firstLine = lines[0];

    if (!firstLine) {
      return result;
    }

    if (firstLine.length > 72) {
      result.warnings.push('First line of commit message should be 72 characters or less');
    }

    if (firstLine && firstLine.length < 10) {
      result.warnings.push('Commit message seems too short');
    }

    // Check for conventional commit format (optional)
    const conventionalPattern = /^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?: .+/;
    if (firstLine && !conventionalPattern.test(firstLine.toLowerCase())) {
      result.info.push('Consider using conventional commit format: type(scope): description');
    }

    // Check for issue references
    const issuePattern = /#\d+|GH-\d+|JIRA-\d+/i;
    if (!issuePattern.test(message)) {
      result.info.push('Consider referencing an issue in the commit message');
    }

    return result;
  }

  public async validateWorkflowPrerequisites(
    workflowType: WorkflowType
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      info: [],
    };

    // Check if on main branch for certain workflows
    if (workflowType === 'launch' || workflowType === 'hotfix') {
      const currentBranch = await this.gitOps.getCurrentBranch();
      const mainBranches = ['main', 'master', 'develop'];

      if (!mainBranches.includes(currentBranch)) {
        result.warnings.push(
          `Starting ${workflowType} workflow from branch '${currentBranch}' instead of main`
        );
      }
    }

    // Check for uncommitted changes
    const hasUncommittedChanges = await this.checkUncommittedChanges();
    if (hasUncommittedChanges) {
      if (workflowType === 'ship') {
        result.info.push('Uncommitted changes detected - they will be included in the ship');
      } else {
        result.warnings.push('You have uncommitted changes that may be lost');
      }
    }

    // Check for unpushed commits
    const hasUnpushedCommits = await this.checkUnpushedCommits();
    if (hasUnpushedCommits) {
      result.warnings.push('You have unpushed commits on the current branch');
    }

    return result;
  }

  private async checkUncommittedChanges(): Promise<boolean> {
    try {
      const status = await this.gitOps.execute(['status', '--porcelain']);
      return status.trim().length > 0;
    } catch {
      return false;
    }
  }

  private async checkUnpushedCommits(): Promise<boolean> {
    try {
      const result = await this.gitOps.execute([
        'rev-list',
        '@{upstream}..HEAD',
        '--count'
      ]);
      const count = parseInt(result.trim(), 10);
      return count > 0;
    } catch {
      // No upstream branch or other error
      return false;
    }
  }

  public validateConfiguration(config: Record<string, unknown>): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      info: [],
    };

    // Validate required fields
    const requiredFields = ['gitProvider'];
    for (const field of requiredFields) {
      if (!config[field]) {
        result.warnings.push(`Missing recommended configuration: ${field}`);
      }
    }

    // Validate git provider
    if (config['gitProvider']) {
      const validProviders = ['github', 'gitlab', 'bitbucket', 'local'];
      if (!validProviders.includes(config['gitProvider'] as string)) {
        result.errors.push(`Invalid git provider: ${config['gitProvider']}`);
        result.valid = false;
      }
    }

    // Validate GitHub token if GitHub is selected
    if (config['gitProvider'] === 'github' && !config['githubToken']) {
      result.warnings.push('GitHub token not configured - some features will be limited');
    }

    return result;
  }
}