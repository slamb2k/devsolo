import { WorkflowType, StateName, SessionMetadata, StateTransitionRecord, TransitionTrigger, ValidationResult } from './types';
export declare class WorkflowSession {
    id: string;
    branchName: string;
    workflowType: WorkflowType;
    currentState: StateName;
    stateHistory: StateTransitionRecord[];
    metadata: SessionMetadata;
    createdAt: string;
    updatedAt: string;
    expiresAt: string;
    lastUpdated?: string;
    gitBranch?: string;
    constructor(options: {
        workflowType: WorkflowType;
        branchName?: string;
        metadata?: SessionMetadata;
    });
    private getInitialState;
    private generateBranchName;
    isValidId(): boolean;
    isValidBranchName(): boolean;
    isValidState(state: StateName): boolean;
    isExpired(): boolean;
    isActive(): boolean;
    canResume(): boolean;
    transitionTo(newState: StateName, trigger?: TransitionTrigger, metadata?: Record<string, unknown>): void;
    getAge(): string;
    getTimeRemaining(): string;
    validate(): ValidationResult;
    toJSON(): Record<string, unknown>;
    static fromJSON(json: Record<string, unknown>): WorkflowSession;
}
//# sourceMappingURL=workflow-session.d.ts.map