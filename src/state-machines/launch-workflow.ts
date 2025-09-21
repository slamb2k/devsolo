import { StateMachine } from './base-state-machine';
import { StateName } from '../models/types';

export class LaunchWorkflowStateMachine extends StateMachine {
  protected defineStates(): void {
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
        (context) => context.branchName != null,
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
        (context) => context.commitMessage != null,
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
        (context) => context.prNumber != null,
        (context) => context.prUrl != null,
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

  public getInitialState(): StateName {
    return 'INIT';
  }

  public canStartWorkflow(context: {
    gitClean: boolean;
    onMainBranch: boolean;
    branchName?: string;
  }): boolean {
    return this.validateState('INIT', context);
  }

  public canCommit(context: {
    hasChanges: boolean;
    commitMessage?: string;
  }): boolean {
    return this.validateState('CHANGES_COMMITTED', context);
  }

  public canPush(context: {
    hasRemote: boolean;
    pushedToRemote?: boolean;
  }): boolean {
    return context.hasRemote === true;
  }

  public canCreatePR(context: {
    pushedToRemote: boolean;
    prNumber?: number;
    prUrl?: string;
  }): boolean {
    return context.pushedToRemote === true;
  }

  public getNextAction(currentState: StateName): string | null {
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

  public getStateDescription(state: StateName): string {
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