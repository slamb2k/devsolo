import * as path from 'path';
import * as os from 'os';

export type InstallationType = 'global' | 'local' | 'npx';
export type MCPConfigScope = 'user' | 'project' | 'both' | 'none';
export type HooksStrategy = 'team' | 'personal' | 'none';

export interface InstallationStrategy {
  type: InstallationType;
  mcpConfigPath: string | null;
  mcpConfigScope: MCPConfigScope;
  hooksStrategy: HooksStrategy;
  canConfigureMCP: boolean;
  isTeamInstall: boolean;
}

export class InstallationStrategyService {
  /**
   * Detects the current installation type
   */
  detectInstallationType(): InstallationType {
    // Check for NPX execution
    if (process.env['npm_command'] === 'exec' ||
        process.env['npm_lifecycle_event'] === 'npx' ||
        process.env['_']?.includes('npx') ||
        process.env['npm_config_user_agent']?.includes('npx')) {
      return 'npx';
    }

    // Check for global installation
    if (process.env['npm_config_global'] === 'true' ||
        __dirname.includes('npm/node_modules') ||
        __dirname.includes('.nvm/versions') ||
        __dirname.includes('/usr/local/lib/node_modules') ||
        __dirname.includes('/usr/lib/node_modules')) {
      return 'global';
    }

    // Default to local installation
    return 'local';
  }

  /**
   * Determines the appropriate installation strategy based on type and user preferences
   */
  async determineStrategy(
    installationType: InstallationType,
    userPreferences?: {
      mcpScope?: MCPConfigScope;
      hooksForTeam?: boolean;
    }
  ): Promise<InstallationStrategy> {
    switch (installationType) {
    case 'npx':
      return {
        type: 'npx',
        mcpConfigPath: null,
        mcpConfigScope: 'none',
        hooksStrategy: 'none',
        canConfigureMCP: false,
        isTeamInstall: false,
      };

    case 'global':
      return {
        type: 'global',
        mcpConfigPath: this.getUserMCPConfigPath(),
        mcpConfigScope: 'user',
        hooksStrategy: 'personal',
        canConfigureMCP: true,
        isTeamInstall: false,
      };

    case 'local': {
      const mcpScope = userPreferences?.mcpScope || 'project';
      const isTeam = userPreferences?.hooksForTeam ?? true;

      return {
        type: 'local',
        mcpConfigPath: mcpScope === 'user'
          ? this.getUserMCPConfigPath()
          : this.getProjectMCPConfigPath(),
        mcpConfigScope: mcpScope,
        hooksStrategy: isTeam ? 'team' : 'personal',
        canConfigureMCP: mcpScope !== 'none',
        isTeamInstall: isTeam,
      };
    }
    }
  }

  /**
   * Gets the path to the user's Claude Code MCP configuration
   */
  getUserMCPConfigPath(): string {
    const homeDir = os.homedir();
    // Claude Code stores user-level MCP config in ~/.claude.json
    return path.join(homeDir, '.claude.json');
  }

  /**
   * Gets the path to the project's MCP configuration
   */
  getProjectMCPConfigPath(): string {
    return path.join(process.cwd(), '.mcp.json');
  }

  /**
   * Gets the path for local override MCP configuration
   */
  getLocalMCPConfigPath(): string {
    return path.join(process.cwd(), '.mcp.local.json');
  }

  /**
   * Determines the appropriate MCP server command based on installation type
   */
  getMCPServerCommand(installationType: InstallationType): { command: string; args: string[] } {
    switch (installationType) {
    case 'global':
      // Global install - binary is in PATH
      return {
        command: 'hansolo-mcp',
        args: [],
      };

    case 'local':
      // Local install - use npx to run from node_modules
      return {
        command: 'npx',
        args: ['hansolo-mcp'],
      };

    case 'npx':
      // NPX - not applicable
      throw new Error('Cannot configure MCP server for npx execution');
    }
  }

  /**
   * Check if we're running in a global npm context
   */
  isGlobalInstall(): boolean {
    return this.detectInstallationType() === 'global';
  }

  /**
   * Check if we're running via npx
   */
  isNpxExecution(): boolean {
    return this.detectInstallationType() === 'npx';
  }

  /**
   * Get recommended configuration based on installation type
   */
  getRecommendedConfiguration(installationType: InstallationType): string {
    switch (installationType) {
    case 'global':
      return 'User-wide MCP configuration with personal git hooks';

    case 'local':
      return 'Project-scoped MCP configuration with team git hooks';

    case 'npx':
      return 'Temporary execution - no configuration will be saved';
    }
  }

  /**
   * Check if Claude Code is installed
   */
  async hasClaudeCode(): Promise<boolean> {
    try {
      const { execSync } = require('child_process');
      execSync('claude --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }
}