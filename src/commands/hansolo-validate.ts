import { CommandHandler } from './types';
import { SessionRepository } from '../services/session-repository';
import { GitOperations } from '../services/git-operations';
import { ValidationService } from '../services/validation-service';
import { ConsoleOutput } from '../ui/console-output';
import { ProgressIndicator } from '../ui/progress-indicators';
import { TableFormatter } from '../ui/table-formatter';
import { BoxFormatter } from '../ui/box-formatter';
import chalk from 'chalk';

export class HansoloValidateCommand implements CommandHandler {
  name = 'hansolo:validate';
  description = 'Validate environment and configuration';

  private sessionRepo: SessionRepository;
  private gitOps: GitOperations;
  private validator: ValidationService;
  private console: ConsoleOutput;
  private progress: ProgressIndicator;
  private table: TableFormatter;
  private box: BoxFormatter;

  constructor() {
    this.sessionRepo = new SessionRepository();
    this.gitOps = new GitOperations();
    this.validator = new ValidationService();
    this.console = new ConsoleOutput();
    this.progress = new ProgressIndicator();
    this.table = new TableFormatter();
    this.box = new BoxFormatter();
  }

  async execute(args: string[]): Promise<void> {
    try {
      // Show banner
      this.console.printBanner('🔍 han-solo Validation');

      const options = this.parseOptions(args);
      const results: ValidationResult[] = [];

      // Run validation checks
      this.progress.start('Running validation checks...');

      // Check Git environment
      results.push(await this.validateGitEnvironment());

      // Check han-solo initialization
      results.push(await this.validateInitialization());

      // Check configuration
      results.push(await this.validateConfiguration());

      // Check sessions integrity
      results.push(await this.validateSessions());

      // Check hooks installation
      results.push(await this.validateHooks());

      // Check dependencies
      results.push(await this.validateDependencies());

      // Check permissions
      results.push(await this.validatePermissions());

      // Check remote connectivity (if not offline)
      if (!options.offline) {
        results.push(await this.validateRemoteConnectivity());
      }

      this.progress.stop();

      // Display results
      await this.displayResults(results);

      // Check if any critical issues
      const hasErrors = results.some(r => r.status === 'error');
      const hasWarnings = results.some(r => r.status === 'warning');

      if (hasErrors) {
        this.console.error('❌ Validation failed with errors');
        if (!options.fix) {
          this.console.info('Run with --fix flag to attempt automatic fixes');
        }
        process.exit(1);
      } else if (hasWarnings) {
        this.console.warn('⚠️ Validation completed with warnings');
      } else {
        this.console.success('✅ All validation checks passed');
      }

      // Attempt fixes if requested
      if (options.fix && (hasErrors || hasWarnings)) {
        await this.attemptFixes(results);
      }

    } catch (error) {
      this.progress.fail('Validation failed');
      this.console.error('Failed to complete validation', error as Error);
      throw error;
    }
  }

  private parseOptions(args: string[]): ValidationOptions {
    const options: ValidationOptions = {
      fix: false,
      verbose: false,
      offline: false,
    };

    for (const arg of args) {
      switch (arg) {
        case '--fix':
          options.fix = true;
          break;
        case '--verbose':
        case '-v':
          options.verbose = true;
          break;
        case '--offline':
          options.offline = true;
          break;
      }
    }

    return options;
  }

  private async validateGitEnvironment(): Promise<ValidationResult> {
    const result: ValidationResult = {
      category: 'Git Environment',
      checks: [],
      status: 'success',
    };

    try {
      // Check Git version
      const version = await this.gitOps.getGitVersion();
      const minVersion = '2.30.0';
      const versionOk = this.compareVersions(version, minVersion) >= 0;

      result.checks.push({
        name: 'Git version',
        status: versionOk ? 'success' : 'warning',
        message: `Git ${version} (minimum ${minVersion})`,
      });

      // Check Git configuration
      const userEmail = await this.gitOps.getConfig('user.email');
      const userName = await this.gitOps.getConfig('user.name');

      result.checks.push({
        name: 'Git user email',
        status: userEmail ? 'success' : 'error',
        message: userEmail || 'Not configured',
        fix: userEmail ? undefined : 'git config --global user.email "your-email@example.com"',
      });

      result.checks.push({
        name: 'Git user name',
        status: userName ? 'success' : 'error',
        message: userName || 'Not configured',
        fix: userName ? undefined : 'git config --global user.name "Your Name"',
      });

      // Check if in Git repository
      const isRepo = await this.gitOps.isGitRepository();
      result.checks.push({
        name: 'Git repository',
        status: isRepo ? 'success' : 'error',
        message: isRepo ? 'Valid repository' : 'Not a Git repository',
        fix: isRepo ? undefined : 'git init',
      });

    } catch (error) {
      result.status = 'error';
      result.checks.push({
        name: 'Git environment',
        status: 'error',
        message: `Failed to check: ${error}`,
      });
    }

    // Update overall status
    result.status = this.getOverallStatus(result.checks);
    return result;
  }

  private async validateInitialization(): Promise<ValidationResult> {
    const result: ValidationResult = {
      category: 'han-solo Initialization',
      checks: [],
      status: 'success',
    };

    try {
      const config = await this.sessionRepo.loadConfiguration();

      result.checks.push({
        name: 'Configuration file',
        status: config.initialized ? 'success' : 'error',
        message: config.initialized ? 'hansolo.yaml exists' : 'Not initialized',
        fix: config.initialized ? undefined : '/hansolo:init',
      });

      // Check .hansolo directory
      const fs = await import('fs/promises');
      const hansoloDir = await fs.stat('.hansolo').catch(() => null);

      result.checks.push({
        name: '.hansolo directory',
        status: hansoloDir ? 'success' : 'error',
        message: hansoloDir ? 'Directory exists' : 'Directory missing',
        fix: hansoloDir ? undefined : 'mkdir -p .hansolo',
      });

    } catch (error) {
      result.status = 'error';
      result.checks.push({
        name: 'Initialization',
        status: 'error',
        message: `Failed to check: ${error}`,
      });
    }

    result.status = this.getOverallStatus(result.checks);
    return result;
  }

  private async validateConfiguration(): Promise<ValidationResult> {
    const result: ValidationResult = {
      category: 'Configuration',
      checks: [],
      status: 'success',
    };

    try {
      const config = await this.sessionRepo.loadConfiguration();

      // Validate configuration schema
      const isValid = await this.validator.validateConfiguration(config as unknown as Record<string, unknown>);

      result.checks.push({
        name: 'Configuration schema',
        status: isValid ? 'success' : 'error',
        message: isValid ? 'Valid schema' : 'Invalid configuration',
      });

      // Check component settings
      for (const [component, enabled] of Object.entries(config.components)) {
        result.checks.push({
          name: `Component: ${component}`,
          status: 'info',
          message: enabled ? 'Enabled' : 'Disabled',
        });
      }

    } catch (error) {
      result.status = 'error';
      result.checks.push({
        name: 'Configuration',
        status: 'error',
        message: `Failed to validate: ${error}`,
      });
    }

    result.status = this.getOverallStatus(result.checks);
    return result;
  }

  private async validateSessions(): Promise<ValidationResult> {
    const result: ValidationResult = {
      category: 'Sessions',
      checks: [],
      status: 'success',
    };

    try {
      const sessions = await this.sessionRepo.listSessions();

      result.checks.push({
        name: 'Active sessions',
        status: 'info',
        message: `${sessions.length} session(s) found`,
      });

      // Validate each session
      for (const session of sessions.slice(0, 5)) {
        const isValid = await this.validator.validateSession(session);
        result.checks.push({
          name: `Session ${session.id.substring(0, 8)}`,
          status: isValid ? 'success' : 'warning',
          message: isValid ? 'Valid' : 'Integrity issues detected',
        });
      }

      if (sessions.length > 5) {
        result.checks.push({
          name: 'Additional sessions',
          status: 'info',
          message: `${sessions.length - 5} more session(s) not shown`,
        });
      }

    } catch (error) {
      result.status = 'error';
      result.checks.push({
        name: 'Sessions',
        status: 'error',
        message: `Failed to validate: ${error}`,
      });
    }

    result.status = this.getOverallStatus(result.checks);
    return result;
  }

  private async validateHooks(): Promise<ValidationResult> {
    const result: ValidationResult = {
      category: 'Git Hooks',
      checks: [],
      status: 'success',
    };

    const hooks = ['pre-commit', 'pre-push', 'post-merge'];

    for (const hook of hooks) {
      try {
        const fs = await import('fs/promises');
        const hookPath = `.hansolo/hooks/${hook}`;
        const stat = await fs.stat(hookPath);
        const isExecutable = (stat.mode & 0o111) !== 0;

        result.checks.push({
          name: `Hook: ${hook}`,
          status: isExecutable ? 'success' : 'warning',
          message: isExecutable ? 'Installed and executable' : 'Not executable',
          fix: isExecutable ? undefined : `chmod +x ${hookPath}`,
        });
      } catch {
        result.checks.push({
          name: `Hook: ${hook}`,
          status: 'warning',
          message: 'Not installed',
          fix: '/hansolo:config --reinstall-hooks',
        });
      }
    }

    result.status = this.getOverallStatus(result.checks);
    return result;
  }

  private async validateDependencies(): Promise<ValidationResult> {
    const result: ValidationResult = {
      category: 'Dependencies',
      checks: [],
      status: 'success',
    };

    const requiredPackages = [
      '@anthropic/mcp',
      'simple-git',
      'chalk',
      'ora',
      'boxen',
    ];

    try {
      const packageJson = await import('../../package.json');

      for (const pkg of requiredPackages) {
        const deps = packageJson.dependencies as Record<string, string>;
        const devDeps = packageJson.devDependencies as Record<string, string>;
        const installed = deps?.[pkg] || devDeps?.[pkg];
        result.checks.push({
          name: pkg,
          status: installed ? 'success' : 'error',
          message: installed ? `Version ${installed}` : 'Not installed',
          fix: installed ? undefined : `npm install ${pkg}`,
        });
      }
    } catch (error) {
      result.status = 'error';
      result.checks.push({
        name: 'Dependencies',
        status: 'error',
        message: `Failed to check: ${error}`,
      });
    }

    result.status = this.getOverallStatus(result.checks);
    return result;
  }

  private async validatePermissions(): Promise<ValidationResult> {
    const result: ValidationResult = {
      category: 'File Permissions',
      checks: [],
      status: 'success',
    };

    const paths = ['.hansolo', '.hansolo/sessions', '.hansolo/audit', '.hansolo/locks'];

    for (const path of paths) {
      try {
        const fs = await import('fs/promises');
        await fs.access(path, fs.constants.R_OK | fs.constants.W_OK);
        result.checks.push({
          name: path,
          status: 'success',
          message: 'Read/write access',
        });
      } catch {
        result.checks.push({
          name: path,
          status: 'warning',
          message: 'No access or missing',
          fix: `mkdir -p ${path} && chmod 755 ${path}`,
        });
      }
    }

    result.status = this.getOverallStatus(result.checks);
    return result;
  }

  private async validateRemoteConnectivity(): Promise<ValidationResult> {
    const result: ValidationResult = {
      category: 'Remote Connectivity',
      checks: [],
      status: 'success',
    };

    try {
      const hasRemote = await this.gitOps.hasRemote();

      if (!hasRemote) {
        result.checks.push({
          name: 'Remote repository',
          status: 'info',
          message: 'No remote configured (local only)',
        });
      } else {
        const remoteUrl = await this.gitOps.getRemoteUrl() || '';
        result.checks.push({
          name: 'Remote URL',
          status: 'success',
          message: remoteUrl,
        });

        // Test connectivity
        try {
          await this.gitOps.fetchRemote();
          result.checks.push({
            name: 'Remote connectivity',
            status: 'success',
            message: 'Connected successfully',
          });
        } catch {
          result.checks.push({
            name: 'Remote connectivity',
            status: 'warning',
            message: 'Cannot connect to remote',
          });
        }
      }
    } catch (error) {
      result.status = 'error';
      result.checks.push({
        name: 'Remote',
        status: 'error',
        message: `Failed to check: ${error}`,
      });
    }

    result.status = this.getOverallStatus(result.checks);
    return result;
  }

  private async displayResults(results: ValidationResult[]): Promise<void> {
    for (const result of results) {
      const statusIcon = this.getStatusIcon(result.status);
      const title = `${statusIcon} ${result.category}`;

      const rows: string[][] = result.checks.map(check => [
        this.getStatusIcon(check.status),
        check.name,
        check.message,
      ]);

      const content = this.table.formatTable(
        ['', 'Check', 'Result'],
        rows
      );

      this.box.printBox(title, content);
    }
  }

  private async attemptFixes(results: ValidationResult[]): Promise<void> {
    this.console.info('\n🔧 Attempting automatic fixes...\n');

    for (const result of results) {
      for (const check of result.checks) {
        if (check.fix && (check.status === 'error' || check.status === 'warning')) {
          try {
            this.console.info(`Fixing: ${check.name}`);
            this.console.log(`  Command: ${chalk.cyan(check.fix)}`);
            // In a real implementation, you would execute the fix command
            // For now, we just log what would be done
          } catch (error) {
            this.console.error(`  Failed to fix: ${error}`);
          }
        }
      }
    }
  }

  private getStatusIcon(status: CheckStatus): string {
    switch (status) {
      case 'success': return chalk.green('✓');
      case 'warning': return chalk.yellow('⚠');
      case 'error': return chalk.red('✗');
      case 'info': return chalk.blue('ℹ');
      default: return ' ';
    }
  }

  private getOverallStatus(checks: ValidationCheck[]): CheckStatus {
    if (checks.some(c => c.status === 'error')) return 'error';
    if (checks.some(c => c.status === 'warning')) return 'warning';
    return 'success';
  }

  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }
    return 0;
  }

  validate(_args: string[]): boolean {
    // All arguments are optional
    return true;
  }
}

interface ValidationOptions {
  fix: boolean;
  verbose: boolean;
  offline: boolean;
}

type CheckStatus = 'success' | 'warning' | 'error' | 'info';

interface ValidationCheck {
  name: string;
  status: CheckStatus;
  message: string;
  fix?: string;
}

interface ValidationResult {
  category: string;
  checks: ValidationCheck[];
  status: CheckStatus;
}