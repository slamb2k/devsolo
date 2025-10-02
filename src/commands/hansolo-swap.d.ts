export declare class SwapCommand {
    private output;
    private progress;
    private sessionRepo;
    private gitOps;
    private configManager;
    constructor(basePath?: string);
    execute(branchName?: string, options?: {
        force?: boolean;
        stash?: boolean;
    }): Promise<void>;
    private showAvailableSessions;
    private stashChanges;
    private performSwap;
    private showNewStatus;
    private showRecommendedAction;
    listSwappableSessions(): Promise<string[]>;
    quickSwap(index: number): Promise<void>;
}
//# sourceMappingURL=hansolo-swap.d.ts.map