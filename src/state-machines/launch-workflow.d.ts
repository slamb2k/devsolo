import { StateMachine } from './base-state-machine';
import { StateName } from '../models/types';
export declare class LaunchWorkflowStateMachine extends StateMachine {
    getFinalStates(): StateName[];
    isFinalState(state: StateName): boolean;
    isValidState(state: StateName): boolean;
    getNextStates(state: StateName): StateName[];
    protected defineStates(): void;
    getInitialState(): StateName;
    canStartWorkflow(context: {
        gitClean: boolean;
        onMainBranch: boolean;
        branchName?: string;
    }): boolean;
    canCommit(context: {
        hasChanges: boolean;
        commitMessage?: string;
    }): boolean;
    canPush(context: {
        hasRemote: boolean;
        pushedToRemote?: boolean;
    }): boolean;
    canCreatePR(context: {
        pushedToRemote: boolean;
        prNumber?: number;
        prUrl?: string;
    }): boolean;
    getNextAction(currentState: StateName): string | null;
    getStateDescription(state: StateName): string;
}
//# sourceMappingURL=launch-workflow.d.ts.map