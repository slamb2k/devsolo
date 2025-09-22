/**
 * StateTransition model stub
 */

interface StateTransitionConfig {
  id?: string;
  sessionId: string;
  workflowType: string;
  fromState: string;
  toState: string;
  trigger: string;
  timestamp?: Date;
  completedAt?: Date;
  actor?: string;
  metadata?: any;
  preconditions?: any[];
  postconditions?: any[];
  guards?: any[];
  error?: any;
  retryCount?: number;
  maxRetries?: number;
  isRollback?: boolean;
  rollbackFrom?: string;
  rollbackReason?: string;
  isRecovery?: boolean;
  parentId?: string;
  correlationId?: string;
}

export class StateTransition {
  id: string;
  sessionId: string;
  workflowType: string;
  fromState: string;
  toState: string;
  trigger: string;
  timestamp: Date;
  completedAt?: Date;
  actor?: string;
  metadata: any;
  preconditions: any[];
  postconditions: any[];
  guards: any[];
  error?: any;
  retryCount: number;
  maxRetries: number;
  isRollback: boolean;
  rollbackFrom?: string;
  rollbackReason?: string;
  isRecovery?: boolean;
  parentId?: string;
  correlationId?: string;

  constructor(config: StateTransitionConfig) {
    this.id = config.id || `transition-${Math.random().toString(36).substr(2, 9)}`;
    this.sessionId = config.sessionId;
    this.workflowType = config.workflowType;
    this.fromState = config.fromState;
    this.toState = config.toState;
    this.trigger = config.trigger;
    this.timestamp = config.timestamp || new Date();
    this.completedAt = config.completedAt;
    this.actor = config.actor;
    this.metadata = config.metadata || {};
    this.preconditions = config.preconditions || [];
    this.postconditions = config.postconditions || [];
    this.guards = config.guards || [];
    this.error = config.error;
    this.retryCount = config.retryCount || 0;
    this.maxRetries = config.maxRetries || 3;
    this.isRollback = config.isRollback || false;
    this.rollbackFrom = config.rollbackFrom;
    this.rollbackReason = config.rollbackReason;
    this.isRecovery = config.isRecovery;
    this.parentId = config.parentId;
    this.correlationId = config.correlationId;
  }

  isValid(): boolean {
    // Simplified validation logic
    if (this.isRecovery) return true;
    if (this.fromState === 'COMPLETE') return false;
    return true;
  }

  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.fromState === 'COMPLETE') {
      errors.push('Cannot transition from terminal state');
    }

    if (this.workflowType === 'launch' && this.fromState.startsWith('HOTFIX_')) {
      errors.push('State mismatch with workflow type');
    }

    return { valid: errors.length === 0, errors };
  }

  getTriggerType(): string {
    if (this.trigger.includes('user')) return 'user';
    if (this.trigger.includes('system')) return 'system';
    if (this.trigger.includes('webhook')) return 'webhook';
    if (this.trigger.includes('timeout')) return 'timeout';
    return 'unknown';
  }

  isUserTriggered(): boolean {
    return this.getTriggerType() === 'user';
  }

  isSystemTriggered(): boolean {
    return this.getTriggerType() === 'system';
  }

  isWebhookTriggered(): boolean {
    return this.getTriggerType() === 'webhook';
  }

  isTimeoutTriggered(): boolean {
    return this.getTriggerType() === 'timeout';
  }

  checkPreconditions(conditions: any): boolean {
    for (const pre of this.preconditions) {
      if (pre.required && !conditions[pre.type]) {
        return false;
      }
    }
    return true;
  }

  checkPostconditions(conditions: any): boolean {
    for (const post of this.postconditions) {
      if (conditions[post.type] !== post.expected) {
        return false;
      }
    }
    return true;
  }

  allGuardsPassed(): boolean {
    return this.guards.every(g => g.passed);
  }

  getDuration(): number | null {
    if (!this.completedAt) return null;
    return this.completedAt.getTime() - this.timestamp.getTime();
  }

  getDurationSeconds(): number | null {
    const duration = this.getDuration();
    return duration ? duration / 1000 : null;
  }

  isComplete(): boolean {
    return !!this.completedAt;
  }

  complete(): void {
    this.completedAt = new Date();
  }

  hasError(): boolean {
    return !!this.error;
  }

  canRetry(): boolean {
    return this.retryCount < this.maxRetries;
  }

  incrementRetry(): void {
    this.retryCount++;
  }

  updateMetadata(metadata: any): void {
    this.metadata = { ...this.metadata, ...metadata };
  }

  equals(other: StateTransition): boolean {
    return this.id === other.id;
  }

  matches(pattern: any): boolean {
    if (pattern.workflowType && pattern.workflowType !== this.workflowType) return false;
    if (pattern.fromState && pattern.fromState !== this.fromState) return false;
    if (pattern.toState && pattern.toState !== this.toState) return false;
    return true;
  }

  isChildOf(parent: StateTransition): boolean {
    return this.parentId === parent.id;
  }

  isCorrelatedWith(other: StateTransition): boolean {
    return this.correlationId === other.correlationId;
  }

  getEvents(): any[] {
    const events = [];
    events.push({
      type: 'STATE_CHANGED',
      from: this.fromState,
      to: this.toState
    });
    if (this.error) {
      events.push({
        type: 'ERROR_OCCURRED',
        error: this.error.message,
        code: this.error.code
      });
    }
    return events;
  }

  toJSON(): any {
    return {
      id: this.id,
      sessionId: this.sessionId,
      workflowType: this.workflowType,
      fromState: this.fromState,
      toState: this.toState,
      trigger: this.trigger,
      timestamp: this.timestamp,
      actor: this.actor,
      metadata: this.metadata
    };
  }

  static fromJSON(json: any): StateTransition {
    return new StateTransition({
      ...json,
      timestamp: new Date(json.timestamp),
      completedAt: json.completedAt ? new Date(json.completedAt) : undefined
    });
  }
}