#!/usr/bin/env node

import * as fs from 'fs/promises';
import * as path from 'path';
import chalk from 'chalk';
import { ConsoleOutput } from '../ui/console-output';
import { ProgressIndicator } from '../ui/progress-indicators';

/**
 * Installs han-solo Git hooks into the repository
 */
export class HookInstaller {
  private console: ConsoleOutput;
  private progress: ProgressIndicator;
  private hooks: HookDefinition[] = [
    {
      name: 'pre-commit',
      description: 'Prevents direct commits to protected branches',
      source: 'pre-commit.ts',
    },
    {
      name: 'pre-push',
      description: 'Validates workflow state before pushing',
      source: 'pre-push.ts',
    },
    {
      name: 'post-merge',
      description: 'Performs cleanup after merging',
      source: 'post-merge.ts',
    },
  ];

  constructor() {
    this.console = new ConsoleOutput();
    this.progress = new ProgressIndicator();
  }

  async install(options: InstallOptions = {}): Promise<void> {
    try {
      this.console.printBanner('🪝 Installing han-solo Git Hooks');

      // Validate Git repository
      await this.validateGitRepo();

      // Create directories
      await this.createDirectories();

      // Install each hook
      for (const hook of this.hooks) {
        await this.installHook(hook, options);
      }

      // Install hook runner
      await this.installHookRunner();

      // Link hooks to Git
      await this.linkHooksToGit(options);

      this.console.success('✅ Git hooks installed successfully');

      // Show summary
      this.showSummary();

    } catch (error) {
      this.progress.fail('Hook installation failed');
      throw error;
    }
  }

  async uninstall(): Promise<void> {
    try {
      this.console.printBanner('🧹 Uninstalling han-solo Git Hooks');

      // Remove Git hook links
      const gitHooksDir = path.join('.git', 'hooks');

      for (const hook of this.hooks) {
        const hookPath = path.join(gitHooksDir, hook.name);

        try {
          // Check if it's our hook
          const content = await fs.readFile(hookPath, 'utf-8');
          if (content.includes('han-solo')) {
            await fs.unlink(hookPath);
            this.console.info(`  Removed ${hook.name}`);
          }
        } catch {
          // Hook doesn't exist or can't read
        }
      }

      this.console.success('✅ Git hooks uninstalled');

    } catch (error) {
      this.console.error('Failed to uninstall hooks', error as Error);
      throw error;
    }
  }

  private async validateGitRepo(): Promise<void> {
    try {
      await fs.access('.git');
    } catch {
      throw new Error('Not in a Git repository. Run "git init" first.');
    }
  }

  private async createDirectories(): Promise<void> {
    const dirs = [
      '.hansolo',
      '.hansolo/hooks',
      path.join('.git', 'hooks'),
    ];

    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  private async installHook(hook: HookDefinition, _options: InstallOptions): Promise<void> {
    this.progress.start(`Installing ${hook.name} hook...`);

    try {
      const targetPath = path.join('.hansolo', 'hooks', hook.name);

      // Create hook script
      const script = this.generateHookScript(hook);
      await fs.writeFile(targetPath, script, { mode: 0o755 });

      // Also create TypeScript source
      const tsPath = path.join('.hansolo', 'hooks', `${hook.name}.ts`);
      const tsSource = await this.getTypeScriptSource(hook);
      await fs.writeFile(tsPath, tsSource);

      this.progress.succeed(`Installed ${hook.name}: ${hook.description}`);

    } catch (error) {
      this.progress.fail(`Failed to install ${hook.name}`);
      throw error;
    }
  }

  private generateHookScript(hook: HookDefinition): string {
    return `#!/bin/sh
# han-solo ${hook.name} hook
# ${hook.description}
#
# This hook is managed by han-solo
# DO NOT EDIT MANUALLY

# Check if han-solo is installed
if ! command -v hansolo &> /dev/null; then
  echo "⚠️ han-solo not found, skipping ${hook.name} hook"
  exit 0
fi

# Check if hook should be skipped
if [ "$HANSOLO_SKIP_HOOKS" = "1" ] || [ "$HANSOLO_SKIP_${hook.name.toUpperCase().replace('-', '_')}" = "1" ]; then
  exit 0
fi

# Run the actual hook
exec npx ts-node .hansolo/hooks/${hook.name}.ts "$@"
`;
  }

  private async getTypeScriptSource(hook: HookDefinition): Promise<string> {
    // Read the source from our hooks directory
    const sourcePath = path.join(__dirname, hook.source);

    try {
      return await fs.readFile(sourcePath, 'utf-8');
    } catch {
      // Return a minimal hook if source not found
      return this.generateMinimalHook(hook);
    }
  }

  private generateMinimalHook(hook: HookDefinition): string {
    return `#!/usr/bin/env node
// han-solo ${hook.name} hook
// ${hook.description}

console.log('[han-solo] Running ${hook.name} hook...');

// Add your ${hook.name} logic here

process.exit(0);
`;
  }

  private async installHookRunner(): Promise<void> {
    const runnerPath = path.join('.hansolo', 'hooks', 'runner.js');

    const runnerScript = `#!/usr/bin/env node
/**
 * han-solo hook runner
 * Executes TypeScript hooks with proper error handling
 */

const { spawn } = require('child_process');
const path = require('path');

const hookName = process.argv[2];
if (!hookName) {
  console.error('No hook name provided');
  process.exit(1);
}

const hookPath = path.join(__dirname, hookName + '.ts');

// Run the hook with ts-node
const child = spawn('npx', ['ts-node', hookPath, ...process.argv.slice(3)], {
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => {
  process.exit(code || 0);
});

child.on('error', (error) => {
  console.error('Failed to run hook:', error);
  process.exit(1);
});
`;

    await fs.writeFile(runnerPath, runnerScript, { mode: 0o755 });
  }

  private async linkHooksToGit(options: InstallOptions): Promise<void> {
    this.progress.start('Linking hooks to Git...');

    const gitHooksDir = path.join('.git', 'hooks');

    for (const hook of this.hooks) {
      const gitHookPath = path.join(gitHooksDir, hook.name);
      const hansoloHookPath = path.join('..', '..', '.hansolo', 'hooks', hook.name);

      try {
        // Check if hook already exists
        const exists = await fs.access(gitHookPath).then(() => true).catch(() => false);

        if (exists && !options.force) {
          const existingContent = await fs.readFile(gitHookPath, 'utf-8');

          if (!existingContent.includes('han-solo')) {
            // Backup existing hook
            await fs.rename(gitHookPath, `${gitHookPath}.backup`);
            this.console.warn(`  Backed up existing ${hook.name} to ${hook.name}.backup`);
          }
        }

        // Create symlink or copy
        if (options.symlink !== false && process.platform !== 'win32') {
          // Use symlink on Unix-like systems
          try {
            await fs.unlink(gitHookPath);
          } catch {
            // Ignore if doesn't exist
          }
          await fs.symlink(hansoloHookPath, gitHookPath);
        } else {
          // Copy on Windows or if symlink disabled
          const source = path.join('.hansolo', 'hooks', hook.name);
          await fs.copyFile(source, gitHookPath);
          await fs.chmod(gitHookPath, 0o755);
        }
      } catch (error) {
        this.console.warn(`  Failed to link ${hook.name}: ${error}`);
      }
    }

    this.progress.succeed('Hooks linked to Git');
  }

  private showSummary(): void {
    console.log();
    console.log(chalk.blue('📋 Installed Hooks:'));
    console.log();

    for (const hook of this.hooks) {
      console.log(chalk.green(`  ✓ ${hook.name.padEnd(15)}`), chalk.gray(hook.description));
    }

    console.log();
    console.log(chalk.gray('To skip hooks temporarily, use:'));
    console.log(chalk.cyan('  HANSOLO_SKIP_HOOKS=1 git commit'));
    console.log();
    console.log(chalk.gray('To skip a specific hook:'));
    console.log(chalk.cyan('  HANSOLO_SKIP_PRE_COMMIT=1 git commit'));
    console.log();
  }

  async verify(): Promise<boolean> {
    try {
      const gitHooksDir = path.join('.git', 'hooks');
      let allInstalled = true;

      for (const hook of this.hooks) {
        const hookPath = path.join(gitHooksDir, hook.name);

        try {
          const stat = await fs.stat(hookPath);

          // Check if executable
          const isExecutable = (stat.mode & 0o111) !== 0;
          if (!isExecutable) {
            this.console.warn(`${hook.name} is not executable`);
            allInstalled = false;
          }

          // Check if it's our hook
          const content = await fs.readFile(hookPath, 'utf-8');
          if (!content.includes('han-solo')) {
            this.console.warn(`${hook.name} is not a han-solo hook`);
            allInstalled = false;
          }
        } catch {
          this.console.warn(`${hook.name} is not installed`);
          allInstalled = false;
        }
      }

      return allInstalled;

    } catch (error) {
      this.console.error('Failed to verify hooks', error as Error);
      return false;
    }
  }
}

interface HookDefinition {
  name: string;
  description: string;
  source: string;
}

interface InstallOptions {
  force?: boolean;
  symlink?: boolean;
}

// CLI execution
if (require.main === module) {
  const installer = new HookInstaller();
  const command = process.argv[2];

  switch (command) {
    case 'uninstall':
      installer.uninstall().catch(console.error);
      break;
    case 'verify':
      installer.verify().then(result => {
        console.log(result ? '✅ All hooks installed' : '❌ Some hooks missing');
        process.exit(result ? 0 : 1);
      });
      break;
    default:
      installer.install({ force: process.argv.includes('--force') }).catch(console.error);
  }
}