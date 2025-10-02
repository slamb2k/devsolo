export declare class ProgressIndicator {
    private spinner;
    private useSpinner;
    constructor();
    start(text: string): void;
    update(text: string): void;
    succeed(text?: string): void;
    fail(text?: string): void;
    warn(text?: string): void;
    info(text?: string): void;
    stop(): void;
    stopAndPersist(symbol?: string, text?: string): void;
    runSteps<T>(steps: Array<{
        name: string;
        action: () => Promise<T>;
    }>): Promise<T[]>;
    progressBar(current: number, total: number, text?: string): void;
    countdown(seconds: number, text?: string): Promise<void>;
    loadingAnimation(text: string, duration?: number): Promise<void>;
}
export declare class WorkflowProgress extends ProgressIndicator {
    gitOperation(operation: string, action: () => Promise<void>): Promise<void>;
    apiCall(platform: string, operation: string, action: () => Promise<void>): Promise<void>;
    stateTransition(from: string, to: string, action: () => Promise<void>): Promise<void>;
    fileOperation(operation: string, path: string, action: () => Promise<void>): Promise<void>;
}
export declare const progress: WorkflowProgress;
//# sourceMappingURL=progress-indicators.d.ts.map