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
export declare class InstallationStrategyService {
    /**
     * Detects the current installation type
     */
    detectInstallationType(): InstallationType;
    /**
     * Determines the appropriate installation strategy based on type and user preferences
     */
    determineStrategy(installationType: InstallationType, userPreferences?: {
        mcpScope?: MCPConfigScope;
        hooksForTeam?: boolean;
    }): Promise<InstallationStrategy>;
    /**
     * Gets the path to the user's Claude Code MCP configuration
     */
    getUserMCPConfigPath(): string;
    /**
     * Gets the path to the project's MCP configuration
     */
    getProjectMCPConfigPath(): string;
    /**
     * Gets the path for local override MCP configuration
     */
    getLocalMCPConfigPath(): string;
    /**
     * Determines the appropriate MCP server command based on installation type
     */
    getMCPServerCommand(installationType: InstallationType): {
        command: string;
        args: string[];
    };
    /**
     * Check if we're running in a global npm context
     */
    isGlobalInstall(): boolean;
    /**
     * Check if we're running via npx
     */
    isNpxExecution(): boolean;
    /**
     * Get recommended configuration based on installation type
     */
    getRecommendedConfiguration(installationType: InstallationType): string;
    /**
     * Check if Claude Code is installed
     */
    hasClaudeCode(): Promise<boolean>;
}
//# sourceMappingURL=installation-strategy.d.ts.map