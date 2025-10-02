export declare class InitCommand {
    private output;
    private progress;
    private configManager;
    private sessionRepo;
    private gitOps;
    private mcpConfigService;
    private installationStrategy;
    private hooksStrategy;
    constructor(basePath?: string);
    execute(options?: {
        force?: boolean;
        gitPlatform?: 'github' | 'gitlab';
        createRemote?: boolean;
    }): Promise<void>;
    private checkGitRepository;
    private createConfiguration;
    private setupDirectories;
    private installHooks;
    private createClaudeGuidance;
    private configureMCPServer;
    private createTemplates;
    private setupRemote;
    validate(): Promise<boolean>;
    showStatus(): Promise<void>;
}
//# sourceMappingURL=hansolo-init.d.ts.map