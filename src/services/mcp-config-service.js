"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPConfigService = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const installation_strategy_1 = require("./installation-strategy");
class MCPConfigService {
    installationStrategy;
    constructor() {
        this.installationStrategy = new installation_strategy_1.InstallationStrategyService();
    }
    /**
     * Configure MCP server based on installation type and user preferences
     */
    async configureMCP(options) {
        // NPX installations cannot configure MCP
        if (options.installationType === 'npx') {
            console.log('📦 Running via npx - MCP configuration not available');
            console.log('To enable MCP integration:');
            console.log('  • Global: npm install -g hansolo-cli');
            console.log('  • Project: npm install --save-dev hansolo-cli');
            return;
        }
        const strategy = await this.installationStrategy.determineStrategy(options.installationType, { mcpScope: options.scope });
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
    async configureUserMCP(mcpCommand, force = false) {
        const configPath = this.installationStrategy.getUserMCPConfigPath();
        const configDir = path.dirname(configPath);
        // Ensure config directory exists
        await fs.mkdir(configDir, { recursive: true });
        let config = {};
        // Load existing config if it exists
        try {
            const existingContent = await fs.readFile(configPath, 'utf-8');
            config = JSON.parse(existingContent);
        }
        catch (error) {
            // File doesn't exist or is invalid, start with empty config
            config = {};
        }
        // Initialize mcpServers if not present
        if (!config.mcpServers) {
            config.mcpServers = {};
        }
        // Check if han-solo is already configured
        if (config.mcpServers['hansolo'] && !force) {
            console.log('✅ han-solo MCP server already configured in user settings');
            return;
        }
        // Add han-solo configuration
        config.mcpServers['hansolo'] = {
            command: mcpCommand.command,
            args: mcpCommand.args,
            env: {
                HANSOLO_BASE_PATH: '${HANSOLO_BASE_PATH:-.hansolo}',
            },
        };
        // Write the updated configuration
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
        console.log(`✅ Configured han-solo MCP server in ${configPath}`);
        console.log('   Restart Claude Code to activate the MCP server');
    }
    /**
     * Configure project-level MCP (.mcp.json in project root)
     */
    async configureProjectMCP(mcpCommand, force = false) {
        const configPath = this.installationStrategy.getProjectMCPConfigPath();
        let config = {};
        // Load existing config if it exists
        try {
            const existingContent = await fs.readFile(configPath, 'utf-8');
            config = JSON.parse(existingContent);
        }
        catch (error) {
            // File doesn't exist, start with empty config
            config = {};
        }
        // Initialize mcpServers if not present
        if (!config.mcpServers) {
            config.mcpServers = {};
        }
        // Check if han-solo is already configured
        if (config.mcpServers['hansolo'] && !force) {
            console.log('✅ han-solo MCP server already configured in .mcp.json');
            return;
        }
        // Add han-solo configuration
        config.mcpServers['hansolo'] = {
            command: mcpCommand.command,
            args: mcpCommand.args,
            env: {
                HANSOLO_BASE_PATH: '${HANSOLO_BASE_PATH:-.hansolo}',
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
    async configureLocalOverrideMCP(mcpCommand, personalSettings) {
        const configPath = this.installationStrategy.getLocalMCPConfigPath();
        const config = {
            mcpServers: {
                hansolo: {
                    command: mcpCommand.command,
                    args: mcpCommand.args,
                    env: {
                        HANSOLO_BASE_PATH: '${HANSOLO_BASE_PATH:-.hansolo}',
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
     * Remove han-solo MCP configuration
     */
    async removeMCPConfig(scope = 'both') {
        if (scope === 'user' || scope === 'both') {
            const userConfigPath = this.installationStrategy.getUserMCPConfigPath();
            try {
                const content = await fs.readFile(userConfigPath, 'utf-8');
                const config = JSON.parse(content);
                if (config.mcpServers?.hansolo) {
                    delete config.mcpServers.hansolo;
                    await fs.writeFile(userConfigPath, JSON.stringify(config, null, 2));
                    console.log('✅ Removed han-solo from user MCP configuration');
                }
            }
            catch (error) {
                // Config doesn't exist or is invalid, nothing to remove
            }
        }
        if (scope === 'project' || scope === 'both') {
            const projectConfigPath = this.installationStrategy.getProjectMCPConfigPath();
            try {
                const content = await fs.readFile(projectConfigPath, 'utf-8');
                const config = JSON.parse(content);
                if (config.mcpServers?.hansolo) {
                    delete config.mcpServers.hansolo;
                    // If no other servers, remove the file
                    if (Object.keys(config.mcpServers).length === 0) {
                        await fs.unlink(projectConfigPath);
                        console.log('✅ Removed .mcp.json (no other servers configured)');
                    }
                    else {
                        await fs.writeFile(projectConfigPath, JSON.stringify(config, null, 2));
                        console.log('✅ Removed han-solo from .mcp.json');
                    }
                }
            }
            catch (error) {
                // Config doesn't exist, nothing to remove
            }
        }
    }
    /**
     * Check if MCP is already configured
     */
    async isMCPConfigured() {
        let userConfigured = false;
        let projectConfigured = false;
        // Check user config
        try {
            const userConfigPath = this.installationStrategy.getUserMCPConfigPath();
            const content = await fs.readFile(userConfigPath, 'utf-8');
            const config = JSON.parse(content);
            userConfigured = !!config.mcpServers?.hansolo;
        }
        catch {
            // Not configured
        }
        // Check project config
        try {
            const projectConfigPath = this.installationStrategy.getProjectMCPConfigPath();
            const content = await fs.readFile(projectConfigPath, 'utf-8');
            const config = JSON.parse(content);
            projectConfigured = !!config.mcpServers?.hansolo;
        }
        catch {
            // Not configured
        }
        return { user: userConfigured, project: projectConfigured };
    }
    /**
     * Ensure a file is in .gitignore
     */
    async ensureGitignored(filename) {
        const gitignorePath = path.join(process.cwd(), '.gitignore');
        try {
            let content = await fs.readFile(gitignorePath, 'utf-8');
            if (!content.includes(filename)) {
                content += `\n# han-solo personal configuration\n${filename}\n`;
                await fs.writeFile(gitignorePath, content);
            }
        }
        catch {
            // No .gitignore, create one
            const content = `# han-solo personal configuration\n${filename}\n`;
            await fs.writeFile(gitignorePath, content);
        }
    }
}
exports.MCPConfigService = MCPConfigService;
//# sourceMappingURL=mcp-config-service.js.map