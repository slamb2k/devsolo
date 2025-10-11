import * as fs from 'fs/promises';
import * as path from 'path';
import { InstallationStrategyService } from './installation-strategy';

interface MCPServerConfig {
  type: 'stdio' | 'sse' | 'http';
  command: string;
  args: string[];
  env?: Record<string, string>;
}

interface MCPConfigFile {
  mcpServers?: Record<string, MCPServerConfig>;
}

export class MCPConfigService {
  private installationStrategy: InstallationStrategyService;

  constructor() {
    this.installationStrategy = new InstallationStrategyService();
  }

  /**
   * Configure MCP server based on installation type and user preferences
   */
  async configureMCP(options: {
    installationType: 'global' | 'local' | 'npx';
    scope?: 'user' | 'project' | 'both' | 'none';
    force?: boolean;
  }): Promise<void> {
    // NPX installations cannot configure MCP
    if (options.installationType === 'npx') {
      console.log('📦 Running via npx - MCP configuration not available');
      console.log('To enable MCP integration:');
      console.log('  • Global: npm install -g devsolo-cli');
      console.log('  • Project: npm install --save-dev devsolo-cli');
      return;
    }

    const strategy = await this.installationStrategy.determineStrategy(
      options.installationType,
      { mcpScope: options.scope }
    );

    if (!strategy.canConfigureMCP) {
      console.log('MCP configuration skipped');
      return;
    }

    // Get the appropriate MCP server command
    const mcpCommand = this.installationStrategy.getMCPServerCommand(options.installationType);

    // Configure based on scope
    switch (strategy.mcpConfigScope) {
    case 'user':
      await this.configureUserMCP(mcpCommand, options.force);
      break;

    case 'project':
      await this.configureProjectMCP(mcpCommand, options.force);
      break;

    case 'both':
      await this.configureUserMCP(mcpCommand, options.force);
      await this.configureProjectMCP(mcpCommand, options.force);
      break;
    }
  }

  /**
   * Configure user-level MCP (Claude Code global config)
   */
  private async configureUserMCP(
    mcpCommand: { command: string; args: string[] },
    force: boolean = false
  ): Promise<void> {
    const configPath = this.installationStrategy.getUserMCPConfigPath();
    const configDir = path.dirname(configPath);

    // Ensure config directory exists
    await fs.mkdir(configDir, { recursive: true });

    let config: MCPConfigFile = {};

    // Load existing config if it exists
    try {
      const existingContent = await fs.readFile(configPath, 'utf-8');
      config = JSON.parse(existingContent);
    } catch (error) {
      // File doesn't exist or is invalid, start with empty config
      config = {};
    }

    // Initialize mcpServers if not present
    if (!config.mcpServers) {
      config.mcpServers = {};
    }

    // Check if devsolo is already configured
    if (config.mcpServers['devsolo'] && !force) {
      console.log('✅ devsolo MCP server already configured in user settings');
      return;
    }

    // Add devsolo configuration
    config.mcpServers['devsolo'] = {
      type: 'stdio',
      command: mcpCommand.command,
      args: mcpCommand.args,
      env: {
        DEVSOLO_BASE_PATH: '${DEVSOLO_BASE_PATH:-.devsolo}',
      },
    };

    // Write the updated configuration
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    console.log(`✅ Configured devsolo MCP server in ${configPath}`);
    console.log('   Restart Claude Code to activate the MCP server');
  }

  /**
   * Configure project-level MCP (.mcp.json in project root)
   */
  private async configureProjectMCP(
    mcpCommand: { command: string; args: string[] },
    force: boolean = false
  ): Promise<void> {
    const configPath = this.installationStrategy.getProjectMCPConfigPath();

    let config: MCPConfigFile = {};

    // Load existing config if it exists
    try {
      const existingContent = await fs.readFile(configPath, 'utf-8');
      config = JSON.parse(existingContent);
    } catch (error) {
      // File doesn't exist, start with empty config
      config = {};
    }

    // Initialize mcpServers if not present
    if (!config.mcpServers) {
      config.mcpServers = {};
    }

    // Check if devsolo is already configured
    if (config.mcpServers['devsolo'] && !force) {
      console.log('✅ devsolo MCP server already configured in .mcp.json');
      return;
    }

    // Add devsolo configuration
    config.mcpServers['devsolo'] = {
      type: 'stdio',
      command: mcpCommand.command,
      args: mcpCommand.args,
      env: {
        DEVSOLO_BASE_PATH: '${DEVSOLO_BASE_PATH:-.devsolo}',
      },
    };

    // Write the configuration
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    console.log(`✅ Created ${configPath} for team MCP configuration`);
    console.log('   This file should be committed to version control');
  }

  /**
   * Configure local override MCP (.mcp.local.json - gitignored)
   */
  async configureLocalOverrideMCP(
    mcpCommand: { command: string; args: string[] },
    personalSettings?: Record<string, any>
  ): Promise<void> {
    const configPath = this.installationStrategy.getLocalMCPConfigPath();

    const config: MCPConfigFile = {
      mcpServers: {
        devsolo: {
          type: 'stdio',
          command: mcpCommand.command,
          args: mcpCommand.args,
          env: {
            DEVSOLO_BASE_PATH: '${DEVSOLO_BASE_PATH:-.devsolo}',
            ...personalSettings,
          },
        },
      },
    };

    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    console.log(`✅ Created ${configPath} for personal MCP configuration`);
    console.log('   This file is gitignored and won\'t be shared with the team');

    // Ensure it's in .gitignore
    await this.ensureGitignored('.mcp.local.json');
  }

  /**
   * Remove devsolo MCP configuration
   */
  async removeMCPConfig(scope: 'user' | 'project' | 'both' = 'both'): Promise<void> {
    if (scope === 'user' || scope === 'both') {
      const userConfigPath = this.installationStrategy.getUserMCPConfigPath();
      try {
        const content = await fs.readFile(userConfigPath, 'utf-8');
        const config = JSON.parse(content);

        if (config.mcpServers?.devsolo) {
          delete config.mcpServers.devsolo;
          await fs.writeFile(userConfigPath, JSON.stringify(config, null, 2));
          console.log('✅ Removed devsolo from user MCP configuration');
        }
      } catch (error) {
        // Config doesn't exist or is invalid, nothing to remove
      }
    }

    if (scope === 'project' || scope === 'both') {
      const projectConfigPath = this.installationStrategy.getProjectMCPConfigPath();
      try {
        const content = await fs.readFile(projectConfigPath, 'utf-8');
        const config = JSON.parse(content);

        if (config.mcpServers?.devsolo) {
          delete config.mcpServers.devsolo;

          // If no other servers, remove the file
          if (Object.keys(config.mcpServers).length === 0) {
            await fs.unlink(projectConfigPath);
            console.log('✅ Removed .mcp.json (no other servers configured)');
          } else {
            await fs.writeFile(projectConfigPath, JSON.stringify(config, null, 2));
            console.log('✅ Removed devsolo from .mcp.json');
          }
        }
      } catch (error) {
        // Config doesn't exist, nothing to remove
      }
    }
  }

  /**
   * Check if MCP is already configured
   */
  async isMCPConfigured(): Promise<{ user: boolean; project: boolean }> {
    let userConfigured = false;
    let projectConfigured = false;

    // Check user config
    try {
      const userConfigPath = this.installationStrategy.getUserMCPConfigPath();
      const content = await fs.readFile(userConfigPath, 'utf-8');
      const config = JSON.parse(content);
      userConfigured = !!config.mcpServers?.devsolo;
    } catch {
      // Not configured
    }

    // Check project config
    try {
      const projectConfigPath = this.installationStrategy.getProjectMCPConfigPath();
      const content = await fs.readFile(projectConfigPath, 'utf-8');
      const config = JSON.parse(content);
      projectConfigured = !!config.mcpServers?.devsolo;
    } catch {
      // Not configured
    }

    return { user: userConfigured, project: projectConfigured };
  }

  /**
   * Ensure a file is in .gitignore
   */
  private async ensureGitignored(filename: string): Promise<void> {
    const gitignorePath = path.join(process.cwd(), '.gitignore');

    try {
      let content = await fs.readFile(gitignorePath, 'utf-8');

      if (!content.includes(filename)) {
        content += `\n# devsolo personal configuration\n${filename}\n`;
        await fs.writeFile(gitignorePath, content);
      }
    } catch {
      // No .gitignore, create one
      const content = `# devsolo personal configuration\n${filename}\n`;
      await fs.writeFile(gitignorePath, content);
    }
  }
}