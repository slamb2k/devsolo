export declare class AbortCommand {
    private output;
    private progress;
    private sessionRepo;
    private gitOps;
    private configManager;
    constructor(basePath?: string);
    execute(options?: {
        branchName?: string;
        force?: boolean;
        deleteBranch?: boolean;
        yes?: boolean;
    }): Promise<void>;
    private confirmAction;
    private stashChanges;
    private performAbort;
    private showAbortSummary;
    abortAll(options?: {
        force?: boolean;
        yes?: boolean;
    }): Promise<void>;
}
//# sourceMappingURL=hansolo-abort.d.ts.map