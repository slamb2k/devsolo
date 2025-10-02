import { StateName } from '../models/types';
export interface StateDefinition {
    name: StateName;
    allowedTransitions: StateName[];
    requiresUserInput: boolean;
    isTerminal: boolean;
    isReversible: boolean;
    validationRules?: Array<(context: any) => boolean>;
}
export interface TransitionResult {
    success: boolean;
    fromState: StateName;
    toState: StateName;
    timestamp: string;
    metadata?: Record<string, unknown>;
    error?: string;
}
export type StateHook = (context: {
    fromState: StateName;
    toState: StateName;
    metadata?: Record<string, unknown>;
}) => Promise<void> | void;
export declare abstract class StateMachine {
    protected states: Map<StateName, StateDefinition>;
    protected hooks: Map<string, StateHook>;
    constructor();
    protected abstract defineStates(): void;
    abstract getInitialState(): StateName;
    hasState(state: StateName): boolean;
    isTerminal(state: StateName): boolean;
    isReversible(state: StateName): boolean;
    requiresUserInput(state: StateName): boolean;
    canTransition(fromState: StateName, toState: StateName): boolean;
    transition(fromState: StateName, toState: StateName, metadata?: Record<string, unknown>): Promise<TransitionResult>;
    validateState(state: StateName, context: any): boolean;
    getAllowedActions(state: StateName): string[];
    setHook(state: StateName, type: 'onEnter' | 'onExit' | 'validate', hook: StateHook): void;
    protected addState(definition: StateDefinition): void;
    getStateDefinition(state: StateName): StateDefinition | undefined;
    getAllStates(): StateName[];
}
//# sourceMappingURL=base-state-machine.d.ts.map