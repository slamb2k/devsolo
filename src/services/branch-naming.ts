import { GitOperations } from './git-operations';

/**
 * Standard Git branch naming conventions
 * Based on: https://medium.com/@abhay.pixolo/naming-conventions-for-git-branches-a-cheatsheet-8549feca2534
 */

export type BranchType = 'feature' | 'bugfix' | 'hotfix' | 'release' | 'chore' | 'docs' | 'test' | 'refactor';

export interface BranchNameValidation {
  isValid: boolean;
  type?: BranchType;
  description?: string;
  suggestions?: string[];
  message?: string;
}

export interface BranchNameGenerationOptions {
  type?: BranchType;
  description?: string;
  useChanges?: boolean;
  useTimestamp?: boolean;
}

/**
 * Service for validating and generating Git branch names
 * following standard naming conventions
 */
export class BranchNamingService {
  private gitOps: GitOperations;

  // Standard branch type prefixes
  private readonly BRANCH_TYPES: BranchType[] = [
    'feature',
    'bugfix',
    'hotfix',
    'release',
    'chore',
    'docs',
    'test',
    'refactor',
  ];

  // Pattern: type/description-in-kebab-case
  private readonly BRANCH_NAME_PATTERN = /^(feature|bugfix|hotfix|release|chore|docs|test|refactor)\/([a-z0-9]+(?:-[a-z0-9]+)*)$/;

  constructor() {
    this.gitOps = new GitOperations();
  }

  /**
   * Validate a branch name against standard conventions
   */
  validate(branchName: string): BranchNameValidation {
    const match = branchName.match(this.BRANCH_NAME_PATTERN);

    if (match) {
      return {
        isValid: true,
        type: match[1] as BranchType,
        description: match[2],
      };
    }

    // Check if it's close to valid format and provide suggestions
    const suggestions = this.generateSuggestions(branchName);

    return {
      isValid: false,
      message: 'Branch name does not follow standard convention: type/description-in-kebab-case',
      suggestions,
    };
  }

  /**
   * Generate branch name suggestions for an invalid name
   */
  private generateSuggestions(branchName: string): string[] {
    const suggestions: string[] = [];

    // Check if it has a slash but wrong format
    if (branchName.includes('/')) {
      const [prefix, ...rest] = branchName.split('/');
      const description = rest.join('/');

      // If prefix is valid, just fix the description
      if (this.BRANCH_TYPES.includes(prefix as BranchType)) {
        suggestions.push(`${prefix}/${this.toKebabCase(description)}`);
      } else {
        // Try to guess the type
        const guessedType = this.guessType(branchName);
        suggestions.push(`${guessedType}/${this.toKebabCase(description)}`);
      }
    } else {
      // No slash, try to guess type and format the whole name as description
      const guessedType = this.guessType(branchName);
      suggestions.push(`${guessedType}/${this.toKebabCase(branchName)}`);
    }

    return suggestions;
  }

  /**
   * Guess branch type from branch name or description
   */
  private guessType(text: string): BranchType {
    const lower = text.toLowerCase();

    if (lower.includes('fix') || lower.includes('bug')) {
      return 'bugfix';
    }
    if (lower.includes('hotfix') || lower.includes('critical')) {
      return 'hotfix';
    }
    if (lower.includes('release') || lower.includes('version')) {
      return 'release';
    }
    if (lower.includes('doc') || lower.includes('readme')) {
      return 'docs';
    }
    if (lower.includes('test') || lower.includes('spec')) {
      return 'test';
    }
    if (lower.includes('refactor') || lower.includes('cleanup')) {
      return 'refactor';
    }
    if (lower.includes('chore') || lower.includes('update')) {
      return 'chore';
    }

    // Default to feature
    return 'feature';
  }

  /**
   * Convert text to kebab-case
   */
  private toKebabCase(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
      .replace(/-+/g, '-'); // Replace multiple hyphens with single
  }

  /**
   * Generate a branch name from description
   */
  generateFromDescription(description: string, type?: BranchType): string {
    const branchType = type || this.guessType(description);
    const kebabDescription = this.toKebabCase(description);

    return `${branchType}/${kebabDescription}`;
  }

  /**
   * Generate a branch name from git changes (staged/unstaged files)
   */
  async generateFromChanges(): Promise<string | null> {
    try {
      // Get list of changed files
      const status = await this.gitOps.getStatus();

      if (!status || status.files.length === 0) {
        return null;
      }

      // Analyze file changes to determine type and description
      const files = status.files.map(f => f.path);
      const type = this.inferTypeFromFiles(files);
      const description = this.inferDescriptionFromFiles(files);

      if (!description) {
        return null;
      }

      return `${type}/${this.toKebabCase(description)}`;
    } catch {
      return null;
    }
  }

  /**
   * Infer branch type from changed files
   */
  private inferTypeFromFiles(files: string[]): BranchType {
    const hasTests = files.some(f => f.includes('test') || f.includes('spec'));
    const hasDocs = files.some(f => f.includes('doc') || f.includes('readme') || f.endsWith('.md'));
    const hasConfig = files.some(f => f.includes('config') || f.includes('package.json'));
    const hasFix = files.some(f => f.includes('fix') || f.includes('bug'));

    if (hasTests && files.length <= 3) {
      return 'test';
    }
    if (hasDocs && files.length <= 3) {
      return 'docs';
    }
    if (hasConfig) {
      return 'chore';
    }
    if (hasFix) {
      return 'bugfix';
    }

    return 'feature';
  }

  /**
   * Infer description from changed files
   */
  private inferDescriptionFromFiles(files: string[]): string | null {
    if (files.length === 0) {
      return null;
    }

    // If single file, use filename
    if (files.length === 1 && files[0]) {
      const parts = files[0].split('/');
      const filename = parts[parts.length - 1]?.replace(/\.[^.]+$/, '');
      return filename || null;
    }

    // If multiple files, try to find common path or theme
    const commonPath = this.findCommonPath(files);
    if (commonPath && commonPath !== '.') {
      const parts = commonPath.split('/');
      const lastPart = parts[parts.length - 1];
      return lastPart || null;
    }

    // Look for common words in filenames
    const fileNames = files.map(f => {
      const parts = f.split('/');
      const filename = parts[parts.length - 1] || '';
      return filename.replace(/\.[^.]+$/, '');
    });
    const commonWords = this.findCommonWords(fileNames);

    if (commonWords.length > 0) {
      return commonWords.slice(0, 3).join('-');
    }

    return 'changes';
  }

  /**
   * Find common path prefix for files
   */
  private findCommonPath(files: string[]): string {
    if (files.length === 0) {
      return '';
    }
    if (files.length === 1 && files[0]) {
      return files[0].split('/').slice(0, -1).join('/');
    }

    const paths = files.map(f => f.split('/'));
    const minLength = Math.min(...paths.map(p => p.length));
    const common: string[] = [];

    for (let i = 0; i < minLength - 1; i++) {
      const firstPath = paths[0];
      if (!firstPath) {
        break;
      }

      const segment = firstPath[i];
      if (!segment) {
        break;
      }

      if (paths.every(p => p[i] === segment)) {
        common.push(segment);
      } else {
        break;
      }
    }

    return common.join('/');
  }

  /**
   * Find common words in a list of strings
   */
  private findCommonWords(strings: string[]): string[] {
    const wordCounts = new Map<string, number>();

    strings.forEach(str => {
      const words = str.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2);
      words.forEach(word => {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      });
    });

    // Return words that appear in more than half the strings
    const threshold = Math.ceil(strings.length / 2);
    return Array.from(wordCounts.entries())
      .filter(([, count]) => count >= threshold)
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word);
  }

  /**
   * Generate a timestamp-based branch name
   */
  generateFromTimestamp(type: BranchType = 'feature'): string {
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '-')
      .substring(0, 19);

    return `${type}/${timestamp}`;
  }

  /**
   * Generate a branch name with fallback logic
   */
  async generate(options: BranchNameGenerationOptions = {}): Promise<string> {
    // 1. Try to generate from description
    if (options.description) {
      return this.generateFromDescription(options.description, options.type);
    }

    // 2. Try to generate from git changes
    if (options.useChanges) {
      const fromChanges = await this.generateFromChanges();
      if (fromChanges) {
        return fromChanges;
      }
    }

    // 3. Fall back to timestamp
    return this.generateFromTimestamp(options.type || 'feature');
  }
}
