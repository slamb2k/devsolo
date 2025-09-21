import { randomUUID } from 'crypto';
import { AuditAction, AuditDetails, StateName } from './types';

export class AuditEntry {
  public id: string;
  public timestamp: string;
  public sessionId?: string;
  public action: AuditAction;
  public actor: string;
  public details: AuditDetails;
  public result: 'success' | 'failure' | 'aborted';
  public errorMessage?: string;

  constructor(options: {
    sessionId?: string;
    action: AuditAction;
    actor: string;
    details: AuditDetails;
    result: 'success' | 'failure' | 'aborted';
    errorMessage?: string;
  }) {
    this.id = randomUUID();
    this.timestamp = new Date().toISOString();
    this.sessionId = options.sessionId;
    this.action = options.action;
    this.actor = options.actor;
    this.details = options.details;
    this.result = options.result;
    this.errorMessage = options.errorMessage;

    // Validate error message requirement
    if (this.result === 'failure' && !this.errorMessage) {
      this.errorMessage = 'Unknown error';
    }
  }

  public getSeverity(): 'info' | 'warning' | 'error' {
    if (this.result === 'failure') {
      return 'error';
    }
    if (this.result === 'aborted') {
      return 'warning';
    }
    return 'info';
  }

  public getFormattedMessage(): string {
    const parts = [`[${this.timestamp}]`, `[${this.action}]`];

    if (this.sessionId) {
      parts.push(`[Session: ${this.sessionId.substring(0, 8)}]`);
    }

    parts.push(this.getActionDescription());

    if (this.result === 'failure' && this.errorMessage) {
      parts.push(`- Error: ${this.errorMessage}`);
    }

    return parts.join(' ');
  }

  private getActionDescription(): string {
    switch (this.action) {
      case 'session_created':
        return `Created new session for ${this.details.command}`;
      case 'session_resumed':
        return `Resumed session from branch ${this.details.gitOperation || 'unknown'}`;
      case 'state_transition':
        if (this.details.stateTransition) {
          return `State: ${this.details.stateTransition.from} → ${this.details.stateTransition.to}`;
        }
        return 'State transition occurred';
      case 'git_operation':
        return `Git: ${this.details.gitOperation || 'operation'}`;
      case 'api_call':
        return `API: ${this.details.command}`;
      case 'user_decision':
        return `User: ${this.details.userDecision || 'made decision'}`;
      case 'error_occurred':
        return `Error: ${this.errorMessage || 'Unknown error'}`;
      case 'session_completed':
        return 'Session completed successfully';
      case 'session_aborted':
        return `Session aborted: ${this.details.userDecision || 'by user'}`;
      default:
        return this.details.command || 'Action performed';
    }
  }

  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      timestamp: this.timestamp,
      sessionId: this.sessionId,
      action: this.action,
      actor: this.actor,
      details: this.details,
      result: this.result,
      errorMessage: this.errorMessage,
    };
  }

  public static fromJSON(json: Record<string, unknown>): AuditEntry {
    const entry = new AuditEntry({
      sessionId: json['sessionId'] as string | undefined,
      action: json['action'] as AuditAction,
      actor: json['actor'] as string,
      details: json['details'] as AuditDetails,
      result: json['result'] as 'success' | 'failure' | 'aborted',
      errorMessage: json['errorMessage'] as string | undefined,
    });

    entry.id = json['id'] as string;
    entry.timestamp = json['timestamp'] as string;

    return entry;
  }

  public static createForStateTransition(
    sessionId: string,
    from: StateName,
    to: StateName,
    actor: string
  ): AuditEntry {
    return new AuditEntry({
      sessionId,
      action: 'state_transition',
      actor,
      details: {
        command: 'state_transition',
        stateTransition: { from, to },
      },
      result: 'success',
    });
  }

  public static createForGitOperation(
    sessionId: string | undefined,
    operation: string,
    actor: string,
    success: boolean,
    errorMessage?: string
  ): AuditEntry {
    return new AuditEntry({
      sessionId,
      action: 'git_operation',
      actor,
      details: {
        command: 'git',
        gitOperation: operation,
      },
      result: success ? 'success' : 'failure',
      errorMessage,
    });
  }

  public static createForError(
    sessionId: string | undefined,
    error: Error,
    actor: string,
    context?: string
  ): AuditEntry {
    return new AuditEntry({
      sessionId,
      action: 'error_occurred',
      actor,
      details: {
        command: context || 'unknown',
        affectedFiles: [],
      },
      result: 'failure',
      errorMessage: error.message,
    });
  }
}