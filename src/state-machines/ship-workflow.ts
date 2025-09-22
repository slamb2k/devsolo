/**
 * ShipWorkflow state machine stub
 */

import { WorkflowSession } from '../models/workflow-session';

export class ShipWorkflow {
  private session: WorkflowSession;
  private states: string[] = [
    'INIT',
    'VALIDATING',
    'CHANGES_COMMITTED',
    'PUSHED',
    'PR_CREATED',
    'WAITING_APPROVAL',
    'APPROVED',
    'REBASING',
    'MERGING',
    'MERGED',
    'CLEANUP',
    'COMPLETE',
    'ERROR',
    'ABORTED',
    'MERGE_CONFLICT',
    'CHANGES_REQUESTED'
  ];
  private history: any[] = [];

  constructor(session: WorkflowSession) {
    this.session = session;
  }

  getStates(): string[] {
    return this.states;
  }

  isTerminalState(state: string): boolean {
    return ['COMPLETE', 'ABORTED'].includes(state);
  }

  isErrorState(state: string): boolean {
    return ['ERROR', 'MERGE_CONFLICT'].includes(state);
  }

  async transition(toState: string, options: any): Promise<any> {
    const fromState = this.session.currentState;

    // Basic validation
    if (!this.canTransitionTo(toState)) {
      return {
        success: false,
        error: `Invalid transition from ${fromState} to ${toState}`,
        fromState,
        toState
      };
    }

    // Special validations
    if (toState === 'PR_CREATED' && !this.session.metadata?.hasChanges) {
      return {
        success: false,
        error: 'No changes to create PR'
      };
    }

    if (toState === 'APPROVED' && this.session.metadata?.requiredApprovals) {
      const currentApprovals = this.session.metadata.currentApprovals || 0;
      if (currentApprovals < this.session.metadata.requiredApprovals) {
        return {
          success: false,
          error: `Insufficient approvals: ${currentApprovals} of ${this.session.metadata.requiredApprovals}`
        };
      }
    }

    if (toState === 'REBASING' && this.session.metadata?.ciStatus === 'failed') {
      return {
        success: false,
        error: 'CI checks failed'
      };
    }

    if (toState === 'ABORTED' && this.session.currentState === 'MERGING') {
      return {
        success: false,
        error: 'Cannot abort during merge'
      };
    }

    // Update session
    this.session.currentState = toState;
    if (options.metadata) {
      this.session.metadata = { ...this.session.metadata, ...options.metadata };
    }

    // Add to history
    const transition = {
      fromState,
      toState,
      trigger: options.trigger,
      actor: options.actor,
      metadata: options.metadata,
      timestamp: new Date(),
      isRecovery: options.isRecovery
    };
    this.history.push(transition);

    return {
      success: true,
      fromState,
      toState,
      metadata: options.metadata || {}
    };
  }

  canTransitionTo(toState: string): boolean {
    const validTransitions: { [key: string]: string[] } = {
      'INIT': ['VALIDATING', 'ABORTED'],
      'VALIDATING': ['CHANGES_COMMITTED', 'ERROR', 'ABORTED'],
      'CHANGES_COMMITTED': ['PUSHED', 'ERROR', 'ABORTED'],
      'PUSHED': ['PR_CREATED', 'ERROR', 'ABORTED'],
      'PR_CREATED': ['WAITING_APPROVAL', 'ABORTED'],
      'WAITING_APPROVAL': ['APPROVED', 'CHANGES_REQUESTED', 'ABORTED'],
      'APPROVED': ['REBASING', 'ABORTED'],
      'REBASING': ['MERGING', 'MERGE_CONFLICT', 'ABORTED'],
      'MERGING': ['MERGED', 'ERROR'],
      'MERGED': ['CLEANUP'],
      'CLEANUP': ['COMPLETE'],
      'ERROR': ['VALIDATING', 'ABORTED'],
      'MERGE_CONFLICT': ['REBASING'],
      'CHANGES_REQUESTED': ['PUSHED']
    };

    const allowedStates = validTransitions[this.session.currentState] || [];
    return allowedStates.includes(toState);
  }

  getNextStates(): string[] {
    const validTransitions: { [key: string]: string[] } = {
      'APPROVED': ['REBASING', 'ABORTED']
    };
    return validTransitions[this.session.currentState] || [];
  }

  getCurrentStateInfo(): any {
    return {
      name: this.session.currentState,
      description: `State: ${this.session.currentState}`,
      allowedTransitions: this.getNextStates()
    };
  }

  isComplete(): boolean {
    return this.session.currentState === 'COMPLETE';
  }

  getProgress(): number {
    const progressMap: { [key: string]: number } = {
      'INIT': 0,
      'VALIDATING': 10,
      'CHANGES_COMMITTED': 20,
      'PUSHED': 30,
      'PR_CREATED': 40,
      'WAITING_APPROVAL': 50,
      'APPROVED': 60,
      'REBASING': 70,
      'MERGING': 80,
      'MERGED': 90,
      'CLEANUP': 95,
      'COMPLETE': 100
    };
    return progressMap[this.session.currentState] || 0;
  }

  getHistory(): any[] {
    return this.history;
  }
}