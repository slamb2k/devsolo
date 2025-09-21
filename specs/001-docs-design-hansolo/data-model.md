# Data Model: han-solo Git Workflow Automation

**Generated**: 2025-09-21
**Status**: Complete

## Overview
This document defines the data entities, their relationships, and state management for the han-solo Git workflow automation tool.

## Core Entities

### 1. WorkflowSession
Represents an active workflow with persistent state across tool invocations.

**Fields**:
```typescript
interface WorkflowSession {
  id: string;                    // UUID v4
  branchName: string;            // Associated Git branch
  workflowType: WorkflowType;    // 'launch' | 'ship' | 'hotfix'
  currentState: StateName;       // Current position in state machine
  stateHistory: StateTransition[];
  metadata: SessionMetadata;
  createdAt: ISO8601;
  updatedAt: ISO8601;
  expiresAt: ISO8601;           // createdAt + 30 days
}
```

**Validation Rules**:
- id must be valid UUID v4
- branchName must match Git branch naming rules
- currentState must be valid for workflowType
- expiresAt must be future date

**State Transitions**:
- See WorkflowState entity for allowed transitions

### 2. WorkflowState
Represents a position in the workflow state machine.

**Fields**:
```typescript
interface WorkflowState {
  name: StateName;
  workflowType: WorkflowType;
  allowedTransitions: StateName[];
  requiresUserInput: boolean;
  isTerminal: boolean;
  isReversible: boolean;
  validationRules: ValidationRule[];
}
```

**Standard Workflow States**:
```
INIT → BRANCH_READY → CHANGES_COMMITTED → PUSHED →
PR_CREATED → WAITING_APPROVAL → REBASING → MERGING →
CLEANUP → COMPLETE
```

**Hotfix Workflow States**:
```
HOTFIX_INIT → HOTFIX_READY → HOTFIX_COMMITTED →
HOTFIX_PUSHED → HOTFIX_VALIDATED → HOTFIX_DEPLOYED →
HOTFIX_CLEANUP → HOTFIX_COMPLETE
```

**Validation Rules**:
- Transitions must be in allowedTransitions
- Terminal states accept no transitions
- User input required states must wait for confirmation

### 3. Configuration
Represents user and project preferences.

**Fields**:
```typescript
interface Configuration {
  version: string;              // Config schema version
  scope: 'user' | 'project';
  initialized: boolean;         // hansolo.yaml exists
  components: ComponentConfig;
  preferences: UserPreferences;
  gitPlatform: GitPlatform;
  installPath: string;          // .hansolo directory location
}

interface ComponentConfig {
  mpcServer: boolean;           // Always true
  statusLines: boolean;
  gitHooks: boolean;
  gitTemplates: boolean;
  utilityScripts: boolean;
}

interface UserPreferences {
  defaultBranchPrefix: string;  // e.g., 'feature/', 'fix/'
  autoCleanup: boolean;
  confirmBeforePush: boolean;
  colorOutput: boolean;
  verboseLogging: boolean;
}
```

**Validation Rules**:
- version must match current schema
- initialized must be true for non-init commands
- installPath must exist and be writable

### 4. GitBranch
Represents a Git branch with han-solo metadata.

**Fields**:
```typescript
interface GitBranch {
  name: string;
  session?: WorkflowSession;    // Associated session if exists
  parentCommit: string;         // SHA of base commit
  isProtected: boolean;
  hasRemote: boolean;
  behindMain: number;           // Commits behind main
  aheadOfMain: number;          // Commits ahead of main
  lastActivity: ISO8601;
}
```

**Validation Rules**:
- name must not be 'main', 'master', 'develop'
- Protected branches cannot be deleted
- Parent commit must exist in repository

### 5. AuditEntry
Represents a logged operation for compliance and debugging.

**Fields**:
```typescript
interface AuditEntry {
  id: string;                   // UUID v4
  timestamp: ISO8601;
  sessionId?: string;           // Related session if applicable
  action: AuditAction;
  actor: string;                // User identifier
  details: AuditDetails;
  result: 'success' | 'failure' | 'aborted';
  errorMessage?: string;
}

interface AuditDetails {
  command: string;              // han-solo command executed
  gitOperation?: string;        // Underlying Git command
  stateTransition?: {
    from: StateName;
    to: StateName;
  };
  userDecision?: string;        // User's choice when prompted
  affectedFiles?: string[];
}
```

**Validation Rules**:
- timestamp must be in chronological order
- errorMessage required when result is 'failure'
- stateTransition must be valid for workflow

### 6. StateTransition
Represents a single state change in a workflow.

**Fields**:
```typescript
interface StateTransition {
  from: StateName;
  to: StateName;
  trigger: TransitionTrigger;
  timestamp: ISO8601;
  metadata?: Record<string, any>;
}

type TransitionTrigger =
  | 'user_action'
  | 'auto_progression'
  | 'error_recovery'
  | 'abort_command';
```

**Validation Rules**:
- Transition must be allowed from source state
- Timestamp must be after session creation
- Metadata must be JSON-serializable

## Relationships

### Session ↔ Branch (1:1)
- Each session is associated with exactly one Git branch
- Branch name is used as session lookup key
- Deleting branch archives associated session

### Session ↔ AuditEntries (1:N)
- Each session has multiple audit entries
- Audit entries persist after session deletion
- Used for compliance and debugging

### Session ↔ StateTransitions (1:N)
- Each session tracks its state history
- Transitions are immutable once created
- Used for recovery and resumption

### Configuration ↔ Sessions (1:N)
- One configuration affects all sessions
- Configuration changes don't affect active sessions
- Each session snapshots config at creation

## State Machine Definitions

### Launch Workflow State Machine
```yaml
states:
  INIT:
    transitions: [BRANCH_READY]
    requires_input: false
  BRANCH_READY:
    transitions: [CHANGES_COMMITTED, ABORT]
    requires_input: true
  CHANGES_COMMITTED:
    transitions: [PUSHED, BRANCH_READY]
    requires_input: true
  PUSHED:
    transitions: [PR_CREATED]
    requires_input: false
  PR_CREATED:
    transitions: [COMPLETE]
    requires_input: false
  COMPLETE:
    transitions: []
    terminal: true
```

### Ship Workflow State Machine
```yaml
states:
  BRANCH_READY:
    transitions: [CHANGES_COMMITTED, ABORT]
    requires_input: true
  CHANGES_COMMITTED:
    transitions: [PUSHED]
    requires_input: true
  PUSHED:
    transitions: [PR_CREATED]
    requires_input: false
  PR_CREATED:
    transitions: [WAITING_APPROVAL]
    requires_input: false
  WAITING_APPROVAL:
    transitions: [REBASING, ABORT]
    requires_input: false
  REBASING:
    transitions: [MERGING, CONFLICT_RESOLUTION]
    requires_input: false
  MERGING:
    transitions: [CLEANUP]
    requires_input: false
  CLEANUP:
    transitions: [COMPLETE]
    requires_input: false
  COMPLETE:
    transitions: []
    terminal: true
```

### Hotfix Workflow State Machine
```yaml
states:
  HOTFIX_INIT:
    transitions: [HOTFIX_READY]
    requires_input: false
  HOTFIX_READY:
    transitions: [HOTFIX_COMMITTED, ABORT]
    requires_input: true
  HOTFIX_COMMITTED:
    transitions: [HOTFIX_PUSHED]
    requires_input: true
  HOTFIX_PUSHED:
    transitions: [HOTFIX_VALIDATED]
    requires_input: false
  HOTFIX_VALIDATED:
    transitions: [HOTFIX_DEPLOYED, ROLLBACK]
    requires_input: true
  HOTFIX_DEPLOYED:
    transitions: [HOTFIX_CLEANUP]
    requires_input: false
  HOTFIX_CLEANUP:
    transitions: [HOTFIX_COMPLETE]
    requires_input: false
  HOTFIX_COMPLETE:
    transitions: []
    terminal: true
```

## Persistence Strategy

### File Structure
```
.hansolo/
├── config.yaml                 # Configuration
├── sessions/
│   ├── {session-id}.json      # Session state
│   └── index.json              # Session index
├── audit/
│   ├── {yyyy-mm}/
│   │   └── {dd}.jsonl         # Daily audit logs
│   └── index.json              # Audit index
└── locks/
    └── {session-id}.lock       # Session locks
```

### Data Access Patterns
- **Read Session**: Load from sessions/{id}.json
- **Write Session**: Atomic write with temp file
- **List Sessions**: Read index.json
- **Audit Log**: Append to current day file
- **Lock Session**: Create lock file with PID

### Migration Strategy
- Version field in all persisted entities
- Migration scripts in .hansolo/migrations/
- Automatic backup before migration
- Rollback capability for failed migrations

## Data Validation

### Schema Validation
All entities validated against JSON Schema:
```typescript
const sessionSchema = {
  type: 'object',
  required: ['id', 'branchName', 'workflowType', 'currentState'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    branchName: { type: 'string', pattern: '^[^/].*' },
    workflowType: { enum: ['launch', 'ship', 'hotfix'] },
    currentState: { type: 'string' }
  }
};
```

### Business Rule Validation
- State transitions checked against state machine
- Git operations validated before execution
- User inputs sanitized for security
- File paths checked for traversal attacks

## Performance Considerations

### Indexing
- Session index by branch name (O(1) lookup)
- Audit index by date (efficient range queries)
- State history kept in session (no separate lookup)

### Caching
- Active session cached in memory
- Git status cached for command duration
- Configuration cached until file change

### Cleanup
- Expired sessions removed daily
- Audit logs rotated monthly
- Lock files cleaned on startup

## Security Considerations

### Data Protection
- No sensitive data in session files
- API tokens stored in system keychain
- Audit logs exclude sensitive content

### Access Control
- File permissions restrict to user only
- Lock files prevent concurrent modification
- Audit trail for all operations

## Conclusion

This data model provides a robust foundation for the han-solo Git workflow automation tool. The design emphasizes:
- **Immutability**: State transitions and audit logs are append-only
- **Recoverability**: Complete state history enables resumption
- **Performance**: Efficient lookups and minimal I/O
- **Security**: No sensitive data exposure, comprehensive audit trail