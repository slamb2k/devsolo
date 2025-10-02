"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateMachine = void 0;
class StateMachine {
    states;
    hooks;
    constructor() {
        this.states = new Map();
        this.hooks = new Map();
        this.defineStates();
    }
    hasState(state) {
        return this.states.has(state);
    }
    isTerminal(state) {
        const stateDefinition = this.states.get(state);
        return stateDefinition?.isTerminal || false;
    }
    isReversible(state) {
        const stateDefinition = this.states.get(state);
        return stateDefinition?.isReversible || false;
    }
    requiresUserInput(state) {
        const stateDefinition = this.states.get(state);
        return stateDefinition?.requiresUserInput || false;
    }
    canTransition(fromState, toState) {
        const stateDefinition = this.states.get(fromState);
        if (!stateDefinition) {
            return false;
        }
        // Terminal states cannot transition
        if (stateDefinition.isTerminal) {
            return false;
        }
        return stateDefinition.allowedTransitions.includes(toState);
    }
    async transition(fromState, toState, metadata) {
        const timestamp = new Date().toISOString();
        if (!this.canTransition(fromState, toState)) {
            return {
                success: false,
                fromState,
                toState,
                timestamp,
                error: `Invalid transition from ${fromState} to ${toState}`,
            };
        }
        // Run validation hook if present
        const validateHook = this.hooks.get(`${toState}:validate`);
        if (validateHook) {
            try {
                await validateHook({ fromState, toState, metadata });
                // If the hook throws, validation failed
            }
            catch (error) {
                return {
                    success: false,
                    fromState,
                    toState,
                    timestamp,
                    error: error instanceof Error ? error.message : 'Validation error',
                };
            }
        }
        // Run exit hook for current state
        const exitHook = this.hooks.get(`${fromState}:onExit`);
        if (exitHook) {
            await exitHook({ fromState, toState, metadata });
        }
        // Run enter hook for new state
        const enterHook = this.hooks.get(`${toState}:onEnter`);
        if (enterHook) {
            await enterHook({ fromState, toState, metadata });
        }
        return {
            success: true,
            fromState,
            toState,
            timestamp,
            metadata,
        };
    }
    validateState(state, context) {
        const stateDefinition = this.states.get(state);
        if (!stateDefinition) {
            return false;
        }
        if (!stateDefinition.validationRules) {
            return true;
        }
        return stateDefinition.validationRules.every(rule => rule(context));
    }
    getAllowedActions(state) {
        const stateDefinition = this.states.get(state);
        if (!stateDefinition || stateDefinition.isTerminal) {
            return [];
        }
        const actions = [];
        // Map transitions to actions
        for (const nextState of stateDefinition.allowedTransitions) {
            switch (nextState) {
                case 'BRANCH_READY':
                    actions.push('start');
                    break;
                case 'CHANGES_COMMITTED':
                    actions.push('commit');
                    break;
                case 'PUSHED':
                    actions.push('push');
                    break;
                case 'PR_CREATED':
                    actions.push('create_pr');
                    break;
                case 'WAITING_APPROVAL':
                    actions.push('wait');
                    break;
                case 'REBASING':
                    actions.push('rebase');
                    break;
                case 'MERGING':
                    actions.push('merge');
                    break;
                case 'COMPLETE':
                    actions.push('complete');
                    break;
                case 'ABORTED':
                    actions.push('abort');
                    break;
                default:
                    // Handle workflow-specific states
                    if (nextState.startsWith('HOTFIX_')) {
                        actions.push(nextState.toLowerCase().replace('hotfix_', ''));
                    }
            }
        }
        return [...new Set(actions)]; // Remove duplicates
    }
    setHook(state, type, hook) {
        this.hooks.set(`${state}:${type}`, hook);
    }
    addState(definition) {
        this.states.set(definition.name, definition);
    }
    getStateDefinition(state) {
        return this.states.get(state);
    }
    getAllStates() {
        return Array.from(this.states.keys());
    }
}
exports.StateMachine = StateMachine;
//# sourceMappingURL=base-state-machine.js.map