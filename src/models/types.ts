export type WorkflowType = 'launch' | 'ship' | 'hotfix';

export type StateName =
  // Standard workflow states
  | 'INIT'
  | 'BRANCH_READY'
  | 'CHANGES_COMMITTED'
  | 'PUSHED'
  | 'PR_CREATED'
  | 'WAITING_APPROVAL'
  | 'REBASING'
  | 'MERGING'
  | 'CLEANUP'
  | 'COMPLETE'
  // Hotfix workflow states
  | 'HOTFIX_INIT'
  | 'HOTFIX_READY'
  | 'HOTFIX_COMMITTED'
  | 'HOTFIX_PUSHED'
  | 'HOTFIX_VALIDATED'
  | 'HOTFIX_DEPLOYED'
  | 'HOTFIX_CLEANUP'
  | 'HOTFIX_COMPLETE'
  // Error states
  | 'CONFLICT_RESOLUTION'
  | 'ROLLBACK'
  | 'ABORTED';

export type TransitionTrigger =
  | 'user_action'
  | 'auto_progression'
  | 'error_recovery'
  | 'abort_command';

export type AuditAction =
  | 'session_created'
  | 'session_resumed'
  | 'state_transition'
  | 'git_operation'
  | 'api_call'
  | 'user_decision'
  | 'error_occurred'
  | 'session_completed'
  | 'session_aborted';

export type Result<T, E = Error> =
  | {
      success: true;
      value: T;
    }
  | {
      success: false;
      error: E;
    };

export interface SessionMetadata {
  projectPath: string;
  remoteUrl?: string;
  gitPlatform?: 'github' | 'gitlab' | 'bitbucket';
  userEmail?: string;
  userName?: string;
  tags?: string[];
  context?: Record<string, unknown>;
}

export interface GitBranchStatus {
  ahead: number;
  behind: number;
  hasRemote: boolean;
  isClean: boolean;
  conflicted?: string[];
}

export interface StateTransitionRecord {
  from: StateName;
  to: StateName;
  trigger: TransitionTrigger;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'format' | 'custom';
  pattern?: string;
  message: string;
  validator?: (value: unknown) => boolean;
}

export interface ComponentConfig {
  mpcServer: boolean;
  statusLines: boolean;
  gitHooks: boolean;
  gitTemplates: boolean;
  utilityScripts: boolean;
}

export interface UserPreferences {
  defaultBranchPrefix: string;
  autoCleanup: boolean;
  confirmBeforePush: boolean;
  colorOutput: boolean;
  verboseLogging: boolean;
}

export interface AuditDetails {
  command: string;
  gitOperation?: string;
  stateTransition?: {
    from: StateName;
    to: StateName;
  };
  userDecision?: string;
  affectedFiles?: string[];
}

export interface GitPlatformConfig {
  type: 'github' | 'gitlab' | 'bitbucket';
  apiUrl?: string;
  token?: string;
  owner?: string;
  repo?: string;
}