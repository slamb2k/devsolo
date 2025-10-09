import { ComponentConfig, UserPreferences, GitPlatformConfig } from './types';

export class Configuration {
  public version: string;
  public scope: 'user' | 'project';
  public initialized: boolean;
  public components: ComponentConfig;
  public preferences: UserPreferences;
  public gitPlatform?: GitPlatformConfig;
  public installPath: string;

  constructor(options?: Partial<Configuration>) {
    this.version = options?.version || '1.0.0';
    this.scope = options?.scope || 'project';
    this.initialized = options?.initialized || false;
    this.installPath = options?.installPath || '.hansolo';

    this.components = options?.components || {
      mpcServer: true,
      statusLines: true,
      gitHooks: true,
      gitTemplates: true,
      utilityScripts: true,
    };

    // Merge preferences with defaults to ensure new fields are populated
    const defaultPreferences = {
      defaultBranchPrefix: 'feature/',
      autoCleanup: true,
      confirmBeforePush: true,
      colorOutput: true,
      logLevel: 'warn' as const,
      commitTemplate: {
        footer: '๋🚀 Generated with [Han Solo](https://github.com/slamb2k/hansolo)',
      },
      prTemplate: {
        footer: '๋🚀 Generated with [Han Solo](https://github.com/slamb2k/hansolo)',
      },
    };

    this.preferences = {
      ...defaultPreferences,
      ...options?.preferences,
      // Deep merge template objects
      commitTemplate: {
        ...defaultPreferences.commitTemplate,
        ...options?.preferences?.commitTemplate,
      },
      prTemplate: {
        ...defaultPreferences.prTemplate,
        ...options?.preferences?.prTemplate,
      },
    };

    this.gitPlatform = options?.gitPlatform;
  }

  public validate(): string[] {
    const errors: string[] = [];

    // Check version compatibility
    const [major] = this.version.split('.');
    if (major !== '1') {
      errors.push(`Incompatible configuration version: ${this.version}`);
    }

    // Check required components
    if (!this.components.mpcServer) {
      errors.push('MCP Server component is required');
    }

    // Validate install path
    if (!this.installPath) {
      errors.push('Install path is required');
    }

    // Validate branch prefix
    if (this.preferences.defaultBranchPrefix.endsWith('/')) {
      // This is actually valid, just ensure it's not empty
      if (this.preferences.defaultBranchPrefix === '/') {
        errors.push('Default branch prefix cannot be just "/"');
      }
    }

    // Validate Git platform if configured
    if (this.gitPlatform) {
      if (!this.gitPlatform.type) {
        errors.push('Git platform type is required when platform is configured');
      }
      if (this.gitPlatform.apiUrl && !this.isValidUrl(this.gitPlatform.apiUrl)) {
        errors.push('Invalid Git platform API URL');
      }
    }

    return errors;
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public getInstallPath(): string {
    return this.installPath;
  }

  public getConfigPath(): string {
    return `${this.installPath}/config.yaml`;
  }

  public getSessionsPath(): string {
    return `${this.installPath}/sessions`;
  }

  public getAuditPath(): string {
    return `${this.installPath}/audit`;
  }

  public getHooksPath(): string {
    return `${this.installPath}/hooks`;
  }

  public getTemplatesPath(): string {
    return `${this.installPath}/templates`;
  }

  public merge(other: Partial<Configuration>): Configuration {
    return new Configuration({
      ...this,
      ...other,
      components: {
        ...this.components,
        ...(other.components || {}),
      },
      preferences: {
        ...this.preferences,
        ...(other.preferences || {}),
      },
      gitPlatform: other.gitPlatform || this.gitPlatform,
    });
  }

  public toJSON(): Record<string, unknown> {
    return {
      version: this.version,
      scope: this.scope,
      initialized: this.initialized,
      components: this.components,
      preferences: this.preferences,
      gitPlatform: this.gitPlatform,
      installPath: this.installPath,
    };
  }

  public static fromJSON(json: Record<string, unknown>): Configuration {
    return new Configuration(json as Partial<Configuration>);
  }

  public static getDefault(): Configuration {
    return new Configuration();
  }
}