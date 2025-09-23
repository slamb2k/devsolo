import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'yaml';
import { Configuration } from '../models/configuration';

export class ConfigurationManager {
  private configPath: string;
  private config: Configuration | null = null;
  private fileWatcher: any | null = null;

  constructor(basePath: string = '.hansolo') {
    this.configPath = path.join(basePath, 'config.yaml');
  }

  async load(): Promise<Configuration> {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8');
      const parsed = yaml.parse(data);
      this.config = Configuration.fromJSON(parsed);
      return this.config;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // Config doesn't exist yet, return default
        this.config = Configuration.getDefault();
        return this.config;
      }
      throw error;
    }
  }

  async save(config?: Configuration): Promise<void> {
    const configToSave = config || this.config;
    if (!configToSave) {
      throw new Error('No configuration to save');
    }

    const dir = path.dirname(this.configPath);
    await fs.mkdir(dir, { recursive: true });

    const data = yaml.stringify(configToSave.toJSON());

    // Write atomically
    const tempFile = `${this.configPath}.tmp`;
    await fs.writeFile(tempFile, data);
    await fs.rename(tempFile, this.configPath);

    this.config = configToSave;
  }

  // Alias for load to match MCP tool expectations
  async loadConfig(): Promise<Configuration> {
    return this.load();
  }

  // Alias for save to match MCP tool expectations
  async saveConfig(config: Configuration): Promise<void> {
    return this.save(config);
  }

  async initialize(): Promise<Configuration> {
    const existingConfig = await this.exists();

    if (existingConfig) {
      throw new Error('Configuration already exists. Use "hansolo config" to modify.');
    }

    const config = new Configuration({
      initialized: true,
      scope: 'project',
      version: '1.0.0',
    });

    await this.save(config);

    // Create marker file
    const markerPath = path.join(path.dirname(this.configPath), 'hansolo.yaml');
    await fs.writeFile(markerPath, `# han-solo project marker file
# This file indicates that han-solo has been initialized in this project
version: 1.0.0
initialized: true
created: ${new Date().toISOString()}
`);

    return config;
  }

  async exists(): Promise<boolean> {
    try {
      await fs.access(this.configPath);
      return true;
    } catch {
      return false;
    }
  }

  async isInitialized(): Promise<boolean> {
    const markerPath = path.join(path.dirname(this.configPath), 'hansolo.yaml');
    try {
      await fs.access(markerPath);
      return true;
    } catch {
      return false;
    }
  }

  async validate(): Promise<boolean> {
    if (!await this.isInitialized()) {
      throw new Error('han-solo not initialized. Run "/hansolo:init" first.');
    }

    const config = await this.load();
    const errors = config.validate();

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }

    return true;
  }

  async getInstallPath(): Promise<string> {
    const config = this.config || await this.load();
    return config.getInstallPath();
  }

  async getSessionsPath(): Promise<string> {
    const config = this.config || await this.load();
    return config.getSessionsPath();
  }

  async getAuditPath(): Promise<string> {
    const config = this.config || await this.load();
    return config.getAuditPath();
  }

  async getHooksPath(): Promise<string> {
    const config = this.config || await this.load();
    return config.getHooksPath();
  }

  async getTemplatesPath(): Promise<string> {
    const config = this.config || await this.load();
    return config.getTemplatesPath();
  }

  async updatePreferences(preferences: Partial<typeof Configuration.prototype.preferences>): Promise<Configuration> {
    const config = await this.load();
    config.preferences = {
      ...config.preferences,
      ...preferences,
    };
    await this.save(config);
    return config;
  }

  async updateGitPlatform(platform: typeof Configuration.prototype.gitPlatform): Promise<Configuration> {
    const config = await this.load();
    config.gitPlatform = platform;
    await this.save(config);
    return config;
  }

  async enableComponent(component: keyof typeof Configuration.prototype.components): Promise<Configuration> {
    const config = await this.load();
    config.components[component] = true;
    await this.save(config);
    return config;
  }

  async disableComponent(component: keyof typeof Configuration.prototype.components): Promise<Configuration> {
    const config = await this.load();

    if (component === 'mpcServer') {
      throw new Error('Cannot disable MCP Server - it is required for han-solo to function');
    }

    config.components[component] = false;
    await this.save(config);
    return config;
  }

  async watchForChanges(callback: (config: Configuration) => void): Promise<void> {
    if (this.fileWatcher) {
      await this.stopWatching();
    }

    // Use fs.watch for file changes
    const fs = await import('fs');
    this.fileWatcher = fs.watch(this.configPath, async (eventType) => {
      if (eventType === 'change') {
        try {
          const config = await this.load();
          callback(config);
        } catch (error) {
          console.error('Error reloading config:', error);
        }
      }
    });
  }

  async stopWatching(): Promise<void> {
    if (this.fileWatcher) {
      this.fileWatcher.close();
      this.fileWatcher = null;
    }
  }

  async getGitPlatformToken(): Promise<string | null> {
    const config = await this.load();

    if (!config.gitPlatform?.token) {
      // Try to get from environment variables
      const platform = config.gitPlatform?.type;

      if (platform === 'github') {
        return process.env['GITHUB_TOKEN'] || process.env['GH_TOKEN'] || null;
      } else if (platform === 'gitlab') {
        return process.env['GITLAB_TOKEN'] || process.env['GL_TOKEN'] || null;
      }
    }

    return config.gitPlatform?.token || null;
  }

  async installHooks(): Promise<void> {
    const hooksPath = await this.getHooksPath();
    await fs.mkdir(hooksPath, { recursive: true });

    // Pre-commit hook
    const preCommitHook = `#!/bin/bash
# han-solo pre-commit hook
# Prevents direct commits to main/master branches

branch=$(git branch --show-current)

if [[ "$branch" == "main" || "$branch" == "master" ]]; then
  echo "❌ Direct commits to $branch are not allowed!"
  echo "Use '/hansolo:launch' to create a feature branch"
  exit 1
fi

exit 0
`;

    await fs.writeFile(path.join(hooksPath, 'pre-commit'), preCommitHook, { mode: 0o755 });

    // Pre-push hook
    const prePushHook = `#!/bin/bash
# han-solo pre-push hook
# Validates branch state before pushing

branch=$(git branch --show-current)

if [[ "$branch" == "main" || "$branch" == "master" ]]; then
  echo "❌ Direct pushes to $branch are not allowed!"
  exit 1
fi

echo "✅ Push validation passed"
exit 0
`;

    await fs.writeFile(path.join(hooksPath, 'pre-push'), prePushHook, { mode: 0o755 });

    // Link hooks to Git
    const gitHooksPath = path.join('.git', 'hooks');
    try {
      await fs.symlink(path.join('..', '..', hooksPath, 'pre-commit'), path.join(gitHooksPath, 'pre-commit'));
      await fs.symlink(path.join('..', '..', hooksPath, 'pre-push'), path.join(gitHooksPath, 'pre-push'));
    } catch (error: any) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  async installTemplates(): Promise<void> {
    const templatesPath = await this.getTemplatesPath();
    await fs.mkdir(templatesPath, { recursive: true });

    // Commit message template
    const commitTemplate = `# <type>: <subject>

# <body>

# <footer>

# Type should be one of: feat, fix, docs, style, refactor, test, chore
# Subject: imperative mood, max 50 chars
# Body: explain what and why, not how
# Footer: references to issues, breaking changes
`;

    await fs.writeFile(path.join(templatesPath, 'commit-message.txt'), commitTemplate);

    // PR template
    const prTemplate = `## Summary
<!-- Brief description of changes -->

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] Added new tests for changes

## Checklist
- [ ] Code follows project style
- [ ] Self-reviewed code
- [ ] Updated documentation
- [ ] No merge conflicts

## Related Issues
<!-- Link to related issues -->
Closes #
`;

    await fs.writeFile(path.join(templatesPath, 'pull-request.md'), prTemplate);
  }

  // Additional methods for test compatibility

  async setSetting(key: string, value: any): Promise<void> {
    if (!this.config) {
      await this.load();
    }
    if (this.config) {
      (this.config as any)[key] = value;
      await this.save(this.config);
    }
  }

  async setWorkflowConfig(workflowType: string, config: any): Promise<void> {
    if (!this.config) {
      await this.load();
    }
    if (this.config) {
      if (!(this.config as any).workflows) {
        (this.config as any).workflows = {};
      }
      (this.config as any).workflows[workflowType] = config;
      await this.save(this.config);
    }
  }

  // Alias methods for compatibility with new tools
  get(key: string): any {
    if (!this.config) {
      return undefined;
    }
    const keys = key.split('.');
    let value: any = this.config;
    for (const k of keys) {
      value = value?.[k];
    }
    return value;
  }

  async set(key: string, value: any): Promise<void> {
    if (!this.config) {
      await this.load();
    }
    if (this.config) {
      const keys = key.split('.');
      let target: any = this.config;
      for (let i = 0; i < keys.length - 1; i++) {
        const currentKey = keys[i];
        if (!currentKey) continue;
        if (!target[currentKey]) {
          target[currentKey] = {};
        }
        target = target[currentKey];
      }
      const lastKey = keys[keys.length - 1];
      if (lastKey) {
        target[lastKey] = value;
      }
    }
  }
}