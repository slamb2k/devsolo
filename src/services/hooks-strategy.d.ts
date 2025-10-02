export type HookManager = 'husky' | 'lefthook' | 'simple' | 'none';
export interface HooksConfiguration {
    manager: HookManager;
    scope: 'team' | 'personal';
    installPath: string;
}
export declare class HooksStrategyService {
    /**
     * Determine the best hook manager based on project analysis
     */
    recommendHookManager(): Promise<HookManager>;
    /**
     * Analyze project characteristics
     */
    private analyzeProject;
    /**
     * Install hooks based on selected strategy
     */
    installHooks(config: HooksConfiguration): Promise<void>;
    /**
     * Install Husky hooks
     */
    private installHuskyHooks;
    /**
     * Install Lefthook hooks
     */
    private installLefthookHooks;
    /**
     * Install simple hooks (no dependencies)
     */
    private installSimpleHooks;
    /**
     * Install personal hooks (not shared with team)
     */
    private installPersonalHooks;
    /**
     * Prompt user for hook configuration
     */
    promptForHookConfiguration(isGlobalInstall: boolean): Promise<HooksConfiguration>;
}
//# sourceMappingURL=hooks-strategy.d.ts.map