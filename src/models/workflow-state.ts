/**
 * WorkflowState model stub
 */

interface WorkflowStateConfig {
  name: string;
  workflowType: string;
  description?: string;
  isTerminal?: boolean;
  isError?: boolean;
  allowedTransitions?: string[];
  errorRecovery?: string[];
  entryActions?: string[];
  exitActions?: string[];
  requiredFields?: string[];
  validationRules?: any;
  preconditions?: any[];
  metadata?: any;
}

export class WorkflowState {
  name: string;
  workflowType: string;
  description?: string;
  isTerminal: boolean;
  isError: boolean;
  allowedTransitions: string[];
  errorRecovery: string[];
  entryActions: string[];
  exitActions: string[];
  requiredFields: string[];
  validationRules: any;
  preconditions: any[];
  metadata: any;

  constructor(config: WorkflowStateConfig) {
    if (!config.name.match(/^[A-Z_]+$/)) {
      throw new Error('Invalid state name format');
    }
    if (!['launch', 'ship', 'hotfix'].includes(config.workflowType)) {
      throw new Error('Invalid workflow type');
    }

    this.name = config.name;
    this.workflowType = config.workflowType;
    this.description = config.description;
    this.isTerminal = config.isTerminal || false;
    this.isError = config.isError || false;
    this.allowedTransitions = config.allowedTransitions || [];
    this.errorRecovery = config.errorRecovery || [];
    this.entryActions = config.entryActions || [];
    this.exitActions = config.exitActions || [];
    this.requiredFields = config.requiredFields || [];
    this.validationRules = config.validationRules || {};
    this.preconditions = config.preconditions || [];
    this.metadata = config.metadata || {};
  }

  canTransitionTo(targetState: string): boolean {
    if (this.isTerminal) return false;
    return this.allowedTransitions.includes(targetState);
  }

  canRecoverTo(targetState: string): boolean {
    return this.errorRecovery.includes(targetState);
  }

  validateFields(fields: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const field of this.requiredFields) {
      if (!fields[field]) {
        errors.push(`${field} is required`);
      } else if (this.validationRules[field]) {
        const rules = this.validationRules[field];
        if (rules.minLength && fields[field].length < rules.minLength) {
          errors.push(`${field} too short`);
        }
        if (rules.maxLength && fields[field].length > rules.maxLength) {
          errors.push(`${field} too long`);
        }
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  checkPreconditions(conditions: any): { met: boolean; failed: string[] } {
    const failed: string[] = [];

    for (const precondition of this.preconditions) {
      if (conditions[precondition.type] !== precondition.value) {
        failed.push(precondition.type);
      }
    }

    return { met: failed.length === 0, failed };
  }

  updateMetadata(metadata: any): void {
    this.metadata = { ...this.metadata, ...metadata };
  }

  equals(other: WorkflowState): boolean {
    return this.name === other.name && this.workflowType === other.workflowType;
  }

  belongsToWorkflow(workflowType: string): boolean {
    return this.workflowType === workflowType;
  }

  toJSON(): any {
    return {
      name: this.name,
      workflowType: this.workflowType,
      description: this.description,
      isTerminal: this.isTerminal,
      allowedTransitions: this.allowedTransitions,
      metadata: this.metadata
    };
  }

  static fromJSON(json: any): WorkflowState {
    return new WorkflowState(json);
  }
}