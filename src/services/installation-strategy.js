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
exports.InstallationStrategyService = void 0;
const path = __importStar(require("path"));
const os = __importStar(require("os"));
class InstallationStrategyService {
    /**
     * Detects the current installation type
     */
    detectInstallationType() {
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
    async determineStrategy(installationType, userPreferences) {
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
    getUserMCPConfigPath() {
        const homeDir = os.homedir();
        // Return the most common location
        return path.join(homeDir, '.claude', 'mcp_servers.json');
    }
    /**
     * Gets the path to the project's MCP configuration
     */
    getProjectMCPConfigPath() {
        return path.join(process.cwd(), '.mcp.json');
    }
    /**
     * Gets the path for local override MCP configuration
     */
    getLocalMCPConfigPath() {
        return path.join(process.cwd(), '.mcp.local.json');
    }
    /**
     * Determines the appropriate MCP server command based on installation type
     */
    getMCPServerCommand(installationType) {
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
    isGlobalInstall() {
        return this.detectInstallationType() === 'global';
    }
    /**
     * Check if we're running via npx
     */
    isNpxExecution() {
        return this.detectInstallationType() === 'npx';
    }
    /**
     * Get recommended configuration based on installation type
     */
    getRecommendedConfiguration(installationType) {
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
    async hasClaudeCode() {
        try {
            const { execSync } = require('child_process');
            execSync('claude --version', { stdio: 'ignore' });
            return true;
        }
        catch {
            return false;
        }
    }
}
exports.InstallationStrategyService = InstallationStrategyService;
//# sourceMappingURL=installation-strategy.js.map