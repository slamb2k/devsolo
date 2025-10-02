"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LaunchWorkflowStateMachine = void 0;
const base_state_machine_1 = require("./base-state-machine");
class LaunchWorkflowStateMachine extends base_state_machine_1.StateMachine {
    getFinalStates() {
        return ['COMPLETE', 'ABORTED'];
    }
    isFinalState(state) {
        return this.getFinalStates().includes(state);
    }
    isValidState(state) {
        return this.hasState(state);
    }
    getNextStates(state) {
        const stateDefinition = this.getStateDefinition(state);
        return stateDefinition?.allowedTransitions || [];
    }
    defineStates() {
        // Initial state
        this.addState({
            name: 'INIT',
            allowedTransitions: ['BRANCH_READY', 'ABORTED'],
            requiresUserInput: false,
            isTerminal: false,
            isReversible: false,
            validationRules: [
                (context) => context.gitClean === true,
                (context) => context.onMainBranch === true,
            ],
        });
        // Branch created and ready for work
        this.addState({
            name: 'BRANCH_READY',
            allowedTransitions: ['CHANGES_COMMITTED', 'ABORTED'],
            requiresUserInput: true,
            isTerminal: false,
            isReversible: false,
            validationRules: [
                (context) => context.branchName !== null && context.branchName !== undefined,
                (context) => context.gitClean === true,
            ],
        });
        // Changes have been committed
        this.addState({
            name: 'CHANGES_COMMITTED',
            allowedTransitions: ['PUSHED', 'BRANCH_READY', 'ABORTED'],
            requiresUserInput: true,
            isTerminal: false,
            isReversible: true,
            validationRules: [
                (context) => context.hasChanges === true,
                (context) => context.commitMessage !== null && context.commitMessage !== undefined,
            ],
        });
        // Changes pushed to remote
        this.addState({
            name: 'PUSHED',
            allowedTransitions: ['PR_CREATED', 'ABORTED'],
            requiresUserInput: false,
            isTerminal: false,
            isReversible: false,
            validationRules: [
                (context) => context.hasRemote === true,
                (context) => context.pushedToRemote === true,
            ],
        });
        // Pull request created
        this.addState({
            name: 'PR_CREATED',
            allowedTransitions: ['COMPLETE', 'ABORTED'],
            requiresUserInput: false,
            isTerminal: false,
            isReversible: false,
            validationRules: [
                (context) => context.prNumber !== null && context.prNumber !== undefined,
                (context) => context.prUrl !== null && context.prUrl !== undefined,
            ],
        });
        // Workflow completed successfully
        this.addState({
            name: 'COMPLETE',
            allowedTransitions: [],
            requiresUserInput: false,
            isTerminal: true,
            isReversible: false,
        });
        // Workflow aborted
        this.addState({
            name: 'ABORTED',
            allowedTransitions: [],
            requiresUserInput: false,
            isTerminal: true,
            isReversible: false,
        });
    }
    getInitialState() {
        return 'INIT';
    }
    canStartWorkflow(context) {
        return this.validateState('INIT', context);
    }
    canCommit(context) {
        return this.validateState('CHANGES_COMMITTED', context);
    }
    canPush(context) {
        return context.hasRemote === true;
    }
    canCreatePR(context) {
        return context.pushedToRemote === true;
    }
    getNextAction(currentState) {
        switch (currentState) {
            case 'INIT':
                return 'start';
            case 'BRANCH_READY':
                return 'commit';
            case 'CHANGES_COMMITTED':
                return 'push';
            case 'PUSHED':
                return 'create_pr';
            case 'PR_CREATED':
                return 'complete';
            case 'COMPLETE':
            case 'ABORTED':
                return null;
            default:
                return null;
        }
    }
    getStateDescription(state) {
        switch (state) {
            case 'INIT':
                return 'Workflow initialized, ready to create branch';
            case 'BRANCH_READY':
                return 'Branch created, ready for development';
            case 'CHANGES_COMMITTED':
                return 'Changes committed locally';
            case 'PUSHED':
                return 'Changes pushed to remote';
            case 'PR_CREATED':
                return 'Pull request created and ready for review';
            case 'COMPLETE':
                return 'Workflow completed successfully';
            case 'ABORTED':
                return 'Workflow aborted';
            default:
                return 'Unknown state';
        }
    }
}
exports.LaunchWorkflowStateMachine = LaunchWorkflowStateMachine;
//# sourceMappingURL=launch-workflow.js.map