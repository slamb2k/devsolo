import { StateMachine } from './base-state-machine';
import { StateName, ValidationResult } from '../models/types';

export class HotfixWorkflowStateMachine extends StateMachine {
  protected defineStates(): void {
    // Define hotfix states
    this.addState({
      name: 'HOTFIX_INIT',
      allowedTransitions: ['HOTFIX_READY', 'ABORTED'],
      requiresUserInput: false,
      isTerminal: false,
      isReversible: false,
    });

    this.addState({
      name: 'HOTFIX_READY',
      allowedTransitions: ['HOTFIX_COMMITTED', 'ABORTED'],
      requiresUserInput: true,
      isTerminal: false,
      isReversible: false,
    });

    this.addState({
      name: 'HOTFIX_COMMITTED',
      allowedTransitions: ['HOTFIX_PUSHED', 'ABORTED'],
      requiresUserInput: false,
      isTerminal: false,
      isReversible: false,
    });

    this.addState({
      name: 'HOTFIX_PUSHED',
      allowedTransitions: ['HOTFIX_VALIDATED', 'ABORTED'],
      requiresUserInput: false,
      isTerminal: false,
      isReversible: false,
    });

    this.addState({
      name: 'HOTFIX_VALIDATED',
      allowedTransitions: ['HOTFIX_DEPLOYED', 'ROLLBACK', 'ABORTED'],
      requiresUserInput: true,
      isTerminal: false,
      isReversible: true,
    });

    this.addState({
      name: 'HOTFIX_DEPLOYED',
      allowedTransitions: ['HOTFIX_CLEANUP', 'ABORTED'],
      requiresUserInput: false,
      isTerminal: false,
      isReversible: false,
    });

    this.addState({
      name: 'HOTFIX_CLEANUP',
      allowedTransitions: ['HOTFIX_COMPLETE', 'ABORTED'],
      requiresUserInput: false,
      isTerminal: false,
      isReversible: false,
    });

    this.addState({
      name: 'HOTFIX_COMPLETE',
      allowedTransitions: [],
      requiresUserInput: false,
      isTerminal: true,
      isReversible: false,
    });

    this.addState({
      name: 'ABORTED',
      allowedTransitions: [],
      requiresUserInput: false,
      isTerminal: true,
      isReversible: false,
    });

    this.addState({
      name: 'ROLLBACK',
      allowedTransitions: ['HOTFIX_VALIDATED', 'ABORTED'],
      requiresUserInput: true,
      isTerminal: false,
      isReversible: false,
    });
  }

  getInitialState(): StateName {
    return 'HOTFIX_INIT';
  }

  getFinalStates(): StateName[] {
    return ['HOTFIX_COMPLETE', 'ABORTED'];
  }

  isFinalState(state: StateName): boolean {
    return this.getFinalStates().includes(state);
  }

  canTransition(from: StateName, to: StateName): boolean {
    // Use parent class implementation which checks the state definitions
    return super.canTransition(from, to);
  }

  getAllowedActions(state: StateName): string[] {
    // Override parent implementation for hotfix-specific actions
    const stateDefinition = this.getStateDefinition(state);
    if (!stateDefinition || stateDefinition.isTerminal) {
      return [];
    }

    const actions: string[] = [];

    // Map hotfix transitions to actions
    for (const nextState of stateDefinition.allowedTransitions) {
      switch (nextState) {
      case 'HOTFIX_READY':
        actions.push('start');
        break;
      case 'HOTFIX_COMMITTED':
        actions.push('commit');
        break;
      case 'HOTFIX_PUSHED':
        actions.push('push');
        break;
      case 'HOTFIX_VALIDATED':
        actions.push('validate');
        break;
      case 'HOTFIX_DEPLOYED':
        actions.push('deploy');
        break;
      case 'HOTFIX_CLEANUP':
        actions.push('cleanup');
        break;
      case 'HOTFIX_COMPLETE':
        actions.push('complete');
        break;
      case 'ROLLBACK':
        actions.push('rollback');
        break;
      case 'ABORTED':
        actions.push('abort');
        break;
      }
    }

    return [...new Set(actions)];
  }

  protected async validateHotfixReady(context: Record<string, unknown>): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!context['branchName'] || typeof context['branchName'] !== 'string') {
      errors.push('Hotfix branch name is required');
    } else if (!context['branchName'].toString().startsWith('hotfix/')) {
      errors.push('Branch name must start with "hotfix/"');
    }

    if (!context['severity'] || !['critical', 'high', 'medium'].includes(context['severity'] as string)) {
      errors.push('Hotfix severity must be specified (critical, high, medium)');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  protected async validateHotfixCommitted(context: Record<string, unknown>): Promise<ValidationResult> {
    const errors: string[] = [];

    if (context['hasUncommittedChanges']) {
      errors.push('All changes must be committed before proceeding');
    }

    if (!context['commitMessage'] || typeof context['commitMessage'] !== 'string') {
      errors.push('Commit message is required');
    } else if (!context['commitMessage'].toString().toLowerCase().includes('hotfix')) {
      errors.push('Commit message must mention "hotfix"');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  protected async validateHotfixValidated(context: Record<string, unknown>): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!context['testsPass']) {
      errors.push('All tests must pass before deployment');
    }

    if (!context['reviewApproved']) {
      if (context['severity'] === 'critical') {
        warnings.push('Critical hotfix proceeding without review approval');
      } else {
        errors.push('Review approval required for non-critical hotfix');
      }
    }

    if (!context['ciPassed']) {
      if (context['severity'] === 'critical') {
        warnings.push('CI checks bypassed for critical hotfix');
      } else {
        errors.push('CI checks must pass for non-critical hotfix');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  protected async validateHotfixDeployed(context: Record<string, unknown>): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!context['deploymentSuccessful']) {
      errors.push('Deployment must be successful before cleanup');
    }

    if (!context['backportCreated']) {
      errors.push('Backport to main branch must be created');
    }

    if (context['hasRollbackPlan'] === false) {
      errors.push('Rollback plan must be documented');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  async validateStateAsync(state: StateName, context: Record<string, unknown>): Promise<ValidationResult> {
    switch (state) {
    case 'HOTFIX_READY':
      return this.validateHotfixReady(context);
    case 'HOTFIX_COMMITTED':
      return this.validateHotfixCommitted(context);
    case 'HOTFIX_VALIDATED':
      return this.validateHotfixValidated(context);
    case 'HOTFIX_DEPLOYED':
      return this.validateHotfixDeployed(context);
    default:
      return { isValid: true, errors: [] };
    }
  }

  // Override parent's validateState to use async validation
  validateState(state: StateName, _context: any): boolean {
    // For synchronous compatibility, just check basic state existence
    return this.hasState(state);
  }

  /**
   * Get required validation context for a state
   */
  getRequiredContext(state: StateName): string[] {
    const requirements: Record<StateName, string[]> = {
      HOTFIX_INIT: [],
      HOTFIX_READY: ['branchName', 'severity'],
      HOTFIX_COMMITTED: ['hasUncommittedChanges', 'commitMessage'],
      HOTFIX_PUSHED: [],
      HOTFIX_VALIDATED: ['testsPass', 'reviewApproved', 'ciPassed', 'severity'],
      HOTFIX_DEPLOYED: ['deploymentSuccessful', 'backportCreated', 'hasRollbackPlan'],
      HOTFIX_CLEANUP: [],
      HOTFIX_COMPLETE: [],
      ABORTED: [],
      // Standard states
      INIT: [],
      BRANCH_READY: [],
      CHANGES_COMMITTED: [],
      PUSHED: [],
      PR_CREATED: [],
      WAITING_APPROVAL: [],
      REBASING: [],
      MERGING: [],
      MERGED: [],
      CLEANUP: [],
      COMPLETE: [],
      CONFLICT_RESOLUTION: [],
      ROLLBACK: [],
    };

    return requirements[state] || [];
  }
}