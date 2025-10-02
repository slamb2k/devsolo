export declare class MCPConfigService {
    private installationStrategy;
    constructor();
    /**
     * Configure MCP server based on installation type and user preferences
     */
    configureMCP(options: {
        installationType: 'global' | 'local' | 'npx';
        scope?: 'user' | 'project' | 'both' | 'none';
        force?: boolean;
    }): Promise<void>;
    /**
     * Configure user-level MCP (Claude Code global config)
     */
    private configureUserMCP;
    /**
     * Configure project-level MCP (.mcp.json in project root)
     */
    private configureProjectMCP;
    /**
     * Configure local override MCP (.mcp.local.json - gitignored)
     */
    configureLocalOverrideMCP(mcpCommand: {
        command: string;
        args: string[];
    }, personalSettings?: Record<string, any>): Promise<void>;
    /**
     * Remove han-solo MCP configuration
     */
    removeMCPConfig(scope?: 'user' | 'project' | 'both'): Promise<void>;
    /**
     * Check if MCP is already configured
     */
    isMCPConfigured(): Promise<{
        user: boolean;
        project: boolean;
    }>;
    /**
     * Ensure a file is in .gitignore
     */
    private ensureGitignored;
}
//# sourceMappingURL=mcp-config-service.d.ts.map