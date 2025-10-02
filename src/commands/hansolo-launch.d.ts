export declare class LaunchCommand {
    private output;
    private progress;
    private configManager;
    private sessionRepo;
    private gitOps;
    private stateMachine;
    constructor(basePath?: string);
    execute(options?: {
        branchName?: string;
        force?: boolean;
        description?: string;
        template?: string;
    }): Promise<void>;
    private generateBranchName;
    private isValidBranchName;
    private createSession;
    private createBranch;
    private setupEnvironment;
    private initializeStateMachine;
    private showStatus;
    resume(branchName?: string): Promise<void>;
}
//# sourceMappingURL=hansolo-launch.d.ts.map