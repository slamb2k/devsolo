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

export abstract class StateMachine {
  protected states: Map<StateName, StateDefinition>;
  protected hooks: Map<string, StateHook>;

  constructor() {
    this.states = new Map();
    this.hooks = new Map();
    this.defineStates();
  }

  protected abstract defineStates(): void;

  public abstract getInitialState(): StateName;

  public hasState(state: StateName): boolean {
    return this.states.has(state);
  }

  public isTerminal(state: StateName): boolean {
    const stateDefinition = this.states.get(state);
    return stateDefinition?.isTerminal || false;
  }

  public isReversible(state: StateName): boolean {
    const stateDefinition = this.states.get(state);
    return stateDefinition?.isReversible || false;
  }

  public requiresUserInput(state: StateName): boolean {
    const stateDefinition = this.states.get(state);
    return stateDefinition?.requiresUserInput || false;
  }

  public canTransition(fromState: StateName, toState: StateName): boolean {
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

  public async transition(
    fromState: StateName,
    toState: StateName,
    metadata?: Record<string, unknown>
  ): Promise<TransitionResult> {
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
      } catch (error) {
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

  public validateState(state: StateName, context: any): boolean {
    const stateDefinition = this.states.get(state);
    if (!stateDefinition) {
      return false;
    }

    if (!stateDefinition.validationRules) {
      return true;
    }

    return stateDefinition.validationRules.every(rule => rule(context));
  }

  public getAllowedActions(state: StateName): string[] {
    const stateDefinition = this.states.get(state);
    if (!stateDefinition || stateDefinition.isTerminal) {
      return [];
    }

    const actions: string[] = [];

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

  public setHook(state: StateName, type: 'onEnter' | 'onExit' | 'validate', hook: StateHook): void {
    this.hooks.set(`${state}:${type}`, hook);
  }

  protected addState(definition: StateDefinition): void {
    this.states.set(definition.name, definition);
  }

  public getStateDefinition(state: StateName): StateDefinition | undefined {
    return this.states.get(state);
  }

  public getAllStates(): StateName[] {
    return Array.from(this.states.keys());
  }
}