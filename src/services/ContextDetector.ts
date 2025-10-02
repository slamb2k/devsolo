import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { InstallationContext } from '../models/InstallationContext';

export class ContextDetector {
  async detect(): Promise<InstallationContext> {
    const context = new InstallationContext();

    // Detect installation type
    context.installationType = this.detectInstallationType();

    // Detect environment
    context.isCI = this.detectCI();
    context.hasTTY = this.detectTTY();
    context.isDocker = this.detectDocker();

    // Detect paths
    context.globalPath = this.getGlobalPath();
    context.localPath = this.getLocalPath();
    context.currentPath = process.cwd();

    // Detect existing installation
    context.isUpgrade = this.detectExistingInstallation();
    if (context.isUpgrade) {
      context.currentVersion = this.getCurrentVersion();
    }

    // Detect Git platforms
    context.hasGitHub = this.detectGitHub();
    context.hasGitLab = this.detectGitLab();
    context.hasBitbucket = this.detectBitbucket();

    // Detect package manager
    context.packageManager = this.detectPackageManager();

    // Detect Node.js version
    context.nodeVersion = process.version;

    // Detect platform
    context.platform = process.platform;

    // Detect Claude Code
    context.hasClaudeCode = await this.detectClaudeCode();

    return context;
  }

  private detectInstallationType(): 'global' | 'local' | 'npx' {
    // Check if running via npx
    if (process.env['npm_config_user_agent']?.includes('npx') ||
        process.env['npm_command'] === 'exec' ||
        process.env['npm_lifecycle_event'] === 'npx' ||
        process.env['_']?.includes('npx')) {
      return 'npx';
    }

    // Check if installed globally
    try {
      const globalPrefix = execSync('npm config get prefix', {
        encoding: 'utf8',
      }).trim();

      const scriptPath = process.argv[1];
      if (scriptPath && scriptPath.startsWith(globalPrefix)) {
        return 'global';
      }
    } catch {}

    // Default to local
    return 'local';
  }

  private detectCI(): boolean {
    // Check common CI environment variables
    const ciVars = [
      'CI',
      'CONTINUOUS_INTEGRATION',
      'GITHUB_ACTIONS',
      'GITLAB_CI',
      'JENKINS_URL',
      'TRAVIS',
      'CIRCLECI',
      'BUILDKITE',
      'DRONE',
    ];

    return ciVars.some(varName => process.env[varName] !== undefined);
  }

  private detectTTY(): boolean {
    return process.stdin.isTTY === true && process.stdout.isTTY === true;
  }

  private detectDocker(): boolean {
    // Check for Docker container
    return fs.existsSync('/.dockerenv') ||
           fs.existsSync('/run/.containerenv');
  }

  private getGlobalPath(): string {
    const home = process.env['HOME'] || process.env['USERPROFILE'] || '';
    return path.join(home, '.hansolo');
  }

  private getLocalPath(): string {
    // Find project root (where package.json exists)
    let dir = process.cwd();
    while (dir !== path.dirname(dir)) {
      if (fs.existsSync(path.join(dir, 'package.json'))) {
        return path.join(dir, '.hansolo');
      }
      dir = path.dirname(dir);
    }
    return path.join(process.cwd(), '.hansolo');
  }

  private detectExistingInstallation(): boolean {
    const globalConfig = path.join(this.getGlobalPath(), 'config.yaml');
    const localConfig = path.join(this.getLocalPath(), 'config.yaml');

    return fs.existsSync(globalConfig) || fs.existsSync(localConfig);
  }

  private getCurrentVersion(): string | undefined {
    try {
      const configPath = fs.existsSync(path.join(this.getLocalPath(), 'config.yaml'))
        ? path.join(this.getLocalPath(), 'config.yaml')
        : path.join(this.getGlobalPath(), 'config.yaml');

      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf8');
        const versionMatch = content.match(/version:\s*(\d+\.\d+\.\d+)/);
        return versionMatch ? versionMatch[1] : undefined;
      }
    } catch {}
    return undefined;
  }

  private detectGitHub(): boolean {
    try {
      const remotes = execSync('git remote -v', {
        encoding: 'utf8',
        stdio: 'pipe',
      });
      return remotes.includes('github.com');
    } catch {
      return false;
    }
  }

  private detectGitLab(): boolean {
    try {
      const remotes = execSync('git remote -v', {
        encoding: 'utf8',
        stdio: 'pipe',
      });
      return remotes.includes('gitlab.com') ||
             fs.existsSync('.gitlab-ci.yml');
    } catch {
      return false;
    }
  }

  private detectBitbucket(): boolean {
    try {
      const remotes = execSync('git remote -v', {
        encoding: 'utf8',
        stdio: 'pipe',
      });
      return remotes.includes('bitbucket.org');
    } catch {
      return false;
    }
  }

  private detectPackageManager(): 'npm' | 'yarn' | 'pnpm' {
    // Check lock files
    if (fs.existsSync('yarn.lock')) {
      return 'yarn';
    }
    if (fs.existsSync('pnpm-lock.yaml')) {
      return 'pnpm';
    }

    // Check npm user agent
    if (process.env['npm_config_user_agent']?.includes('yarn')) {
      return 'yarn';
    }
    if (process.env['npm_config_user_agent']?.includes('pnpm')) {
      return 'pnpm';
    }

    // Default to npm
    return 'npm';
  }

  private async detectClaudeCode(): Promise<boolean> {
    try {
      execSync('claude --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }
}