import { randomUUID } from 'crypto';
import {
  WorkflowType,
  StateName,
  SessionMetadata,
  StateTransitionRecord,
  TransitionTrigger,
} from './types';

export class WorkflowSession {
  public id: string;
  public branchName: string;
  public workflowType: WorkflowType;
  public currentState: StateName;
  public stateHistory: StateTransitionRecord[];
  public metadata: SessionMetadata;
  public createdAt: string;
  public updatedAt: string;
  public expiresAt: string;

  constructor(options: {
    workflowType: WorkflowType;
    branchName?: string;
    metadata?: SessionMetadata;
  }) {
    this.id = randomUUID();
    this.workflowType = options.workflowType;
    this.branchName = options.branchName || this.generateBranchName();
    this.currentState = this.getInitialState();
    this.stateHistory = [];
    this.metadata = options.metadata || { projectPath: process.cwd() };

    const now = new Date();
    this.createdAt = now.toISOString();
    this.updatedAt = now.toISOString();

    // Sessions expire after 30 days
    const expirationDate = new Date(now);
    expirationDate.setDate(expirationDate.getDate() + 30);
    this.expiresAt = expirationDate.toISOString();
  }

  private getInitialState(): StateName {
    switch (this.workflowType) {
      case 'launch':
        return 'INIT';
      case 'ship':
        return 'BRANCH_READY';
      case 'hotfix':
        return 'HOTFIX_INIT';
    }
  }

  private generateBranchName(): string {
    const prefix = this.workflowType === 'hotfix' ? 'hotfix' : 'feature';
    const timestamp = Date.now().toString().slice(-3);
    const randomWords = ['update', 'fix', 'add', 'improve', 'refactor'];
    const word = randomWords[Math.floor(Math.random() * randomWords.length)];
    return `${prefix}/${timestamp}-${word}-feature`;
  }

  public isValidId(): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(this.id);
  }

  public isValidBranchName(): boolean {
    // Cannot be protected branches
    const protectedBranches = ['main', 'master', 'develop'];
    if (protectedBranches.includes(this.branchName)) {
      return false;
    }

    // Must follow Git naming rules
    const validBranchRegex = /^[^/][\w\-./]+$/;
    if (!validBranchRegex.test(this.branchName)) {
      return false;
    }

    // Cannot have spaces
    if (this.branchName.includes(' ')) {
      return false;
    }

    return true;
  }

  public isValidState(state: StateName): boolean {
    const standardStates: StateName[] = [
      'INIT', 'BRANCH_READY', 'CHANGES_COMMITTED', 'PUSHED',
      'PR_CREATED', 'WAITING_APPROVAL', 'REBASING', 'MERGING',
      'CLEANUP', 'COMPLETE', 'CONFLICT_RESOLUTION', 'ABORTED',
    ];

    const hotfixStates: StateName[] = [
      'HOTFIX_INIT', 'HOTFIX_READY', 'HOTFIX_COMMITTED',
      'HOTFIX_PUSHED', 'HOTFIX_VALIDATED', 'HOTFIX_DEPLOYED',
      'HOTFIX_CLEANUP', 'HOTFIX_COMPLETE', 'ROLLBACK',
    ];

    if (this.workflowType === 'hotfix') {
      return hotfixStates.includes(state) || state === 'ABORTED';
    } else {
      return standardStates.includes(state);
    }
  }

  public isExpired(): boolean {
    return new Date(this.expiresAt) < new Date();
  }

  public isActive(): boolean {
    const terminalStates: StateName[] = [
      'COMPLETE', 'HOTFIX_COMPLETE', 'ABORTED',
    ];
    return !terminalStates.includes(this.currentState);
  }

  public canResume(): boolean {
    return this.isActive() && !this.isExpired();
  }

  public transitionTo(
    newState: StateName,
    trigger: TransitionTrigger = 'user_action',
    metadata?: Record<string, unknown>
  ): void {
    if (!this.isValidState(newState)) {
      throw new Error(`Invalid state transition: ${newState} is not valid for ${this.workflowType} workflow`);
    }

    const transition: StateTransitionRecord = {
      from: this.currentState,
      to: newState,
      trigger,
      timestamp: new Date().toISOString(),
      metadata,
    };

    this.stateHistory.push(transition);
    this.currentState = newState;
    this.updatedAt = new Date().toISOString();
  }

  public getAge(): string {
    const created = new Date(this.createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else {
      const minutes = Math.floor(diffMs / (1000 * 60));
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
  }

  public getTimeRemaining(): string {
    const expires = new Date(this.expiresAt);
    const now = new Date();
    const diffMs = expires.getTime() - now.getTime();

    if (diffMs <= 0) {
      return 'Expired';
    }

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else {
      const minutes = Math.floor(diffMs / (1000 * 60));
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
  }

  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      branchName: this.branchName,
      workflowType: this.workflowType,
      currentState: this.currentState,
      stateHistory: this.stateHistory,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      expiresAt: this.expiresAt,
    };
  }

  public static fromJSON(json: Record<string, unknown>): WorkflowSession {
    const session = new WorkflowSession({
      workflowType: json['workflowType'] as WorkflowType,
      branchName: json['branchName'] as string,
      metadata: json['metadata'] as SessionMetadata,
    });

    session.id = json['id'] as string;
    session.currentState = json['currentState'] as StateName;
    session.stateHistory = json['stateHistory'] as StateTransitionRecord[];
    session.createdAt = json['createdAt'] as string;
    session.updatedAt = json['updatedAt'] as string;
    session.expiresAt = json['expiresAt'] as string;

    return session;
  }
}