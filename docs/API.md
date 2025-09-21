# han-solo API Documentation

## Table of Contents
- [Commands](#commands)
- [Models](#models)
- [Services](#services)
- [State Machines](#state-machines)
- [MCP Server](#mcp-server)

## Commands

### InitCommand

Initialize han-solo in a project.

```typescript
class InitCommand {
  constructor(basePath?: string)

  execute(options?: {
    scope?: 'project' | 'user';
    force?: boolean;
  }): Promise<void>

  showStatus(): Promise<void>
}
```

### LaunchCommand

Start a new feature workflow.

```typescript
class LaunchCommand {
  constructor(basePath?: string)

  execute(options?: {
    branchName?: string;
    force?: boolean;
    description?: string;
  }): Promise<void>

  resume(branchName?: string): Promise<void>
}
```

### ShipCommand

Complete workflow stages.

```typescript
class ShipCommand {
  constructor(basePath?: string)

  execute(options?: {
    message?: string;
    push?: boolean;
    createPR?: boolean;
    merge?: boolean;
    force?: boolean;
    yes?: boolean;
  }): Promise<void>

  quickShip(): Promise<void>
}
```

### SessionsCommand

Manage workflow sessions.

```typescript
class SessionsCommand {
  constructor(basePath?: string)

  execute(options?: {
    all?: boolean;
    verbose?: boolean;
    cleanup?: boolean;
  }): Promise<void>

  getActiveCount(): Promise<number>
  getCurrentSession(): Promise<WorkflowSession | null>
  listBranchesWithSessions(): Promise<string[]>
}
```

### SwapCommand

Switch between workflow sessions.

```typescript
class SwapCommand {
  constructor(basePath?: string)

  execute(branchName?: string, options?: {
    force?: boolean;
    stash?: boolean;
  }): Promise<void>

  listSwappableSessions(): Promise<string[]>
  quickSwap(index: number): Promise<void>
}
```

### AbortCommand

Cancel workflow sessions.

```typescript
class AbortCommand {
  constructor(basePath?: string)

  execute(options?: {
    branchName?: string;
    force?: boolean;
    deleteBranch?: boolean;
    yes?: boolean;
  }): Promise<void>

  abortAll(options?: {
    force?: boolean;
    yes?: boolean;
  }): Promise<void>
}
```

## Models

### WorkflowSession

Core session model for tracking workflows.

```typescript
class WorkflowSession {
  id: string;
  workflowType: WorkflowType;
  branchName: string;
  currentState: StateName;
  stateHistory: StateTransitionRecord[];
  metadata?: SessionMetadata;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  lockId?: string;

  constructor(options: {
    id?: string;
    workflowType: WorkflowType;
    branchName: string;
    metadata?: SessionMetadata;
  })

  // State management
  transitionTo(
    state: StateName,
    trigger?: TransitionTrigger,
    metadata?: Record<string, unknown>
  ): void

  // Queries
  isActive(): boolean
  canResume(): boolean
  isExpired(): boolean
  getAge(): string
  getTimeRemaining(): string

  // Validation
  validate(): ValidationResult

  // Serialization
  toJSON(): any
  static fromJSON(json: any): WorkflowSession
}
```

### Configuration

Project configuration model.

```typescript
class Configuration {
  initialized: boolean;
  scope: 'project' | 'user';
  installPath: string;
  gitPlatform?: GitPlatformConfig;
  components: ComponentConfig;
  preferences: UserPreferences;

  constructor(data?: Partial<Configuration>)

  isInitialized(): boolean
  getInstallPath(): string
  getSetting<T>(key: string): T | undefined
  setSetting<T>(key: string, value: T): void
}
```

### AuditEntry

Audit log entry for tracking operations.

```typescript
class AuditEntry {
  id: string;
  timestamp: string;
  sessionId?: string;
  action: AuditAction;
  actor: string;
  details?: AuditDetails;
  result: 'success' | 'failure';
  error?: string;

  constructor(data: {
    sessionId?: string;
    action: AuditAction;
    actor: string;
    details?: AuditDetails;
  })

  toJSON(): any
  static fromJSON(json: any): AuditEntry
}
```

## Services

### GitOperations

Git command wrapper service.

```typescript
class GitOperations {
  constructor(basePath?: string)

  // Repository operations
  init(): Promise<void>
  isInitialized(): Promise<boolean>

  // Branch operations
  getCurrentBranch(): Promise<string>
  createBranch(branchName: string, baseBranch?: string): Promise<void>
  checkoutBranch(branchName: string): Promise<void>
  deleteBranch(branchName: string, force?: boolean): Promise<void>
  deleteRemoteBranch(branchName: string): Promise<void>
  listBranches(remote?: boolean): Promise<string[]>

  // Status operations
  status(): Promise<StatusResult>
  getStatus(): Promise<StatusResult>
  isClean(): Promise<boolean>
  hasUncommittedChanges(): Promise<boolean>
  getBranchStatus(branchName?: string): Promise<GitBranchStatus>

  // Commit operations
  add(files?: string | string[]): Promise<void>
  stageAll(): Promise<void>
  commit(message: string, options?: { noVerify?: boolean }): Promise<{ commit: string }>

  // Remote operations
  push(remote?: string, branch?: string, options?: boolean | string[]): Promise<void>
  pull(remote?: string, branch?: string): Promise<void>
  fetch(remote?: string, branch?: string): Promise<void>
  getRemoteUrl(): Promise<string | null>
  addRemote(name: string, url: string): Promise<void>

  // Merge operations
  merge(branch: string, squash?: boolean): Promise<void>
  rebase(branch?: string): Promise<void>

  // Stash operations
  stashChanges(message?: string): Promise<{ stashRef: string }>

  // Tag operations
  getTags(): Promise<string[]>
  createTag(tagName: string, message?: string): Promise<void>

  // Configuration
  getConfig(key: string): Promise<string | null>
  setConfig(key: string, value: string, global?: boolean): Promise<void>
}
```

### SessionRepository

Session persistence service.

```typescript
class SessionRepository {
  constructor(basePath?: string)

  // CRUD operations
  createSession(session: WorkflowSession): Promise<void>
  getSession(sessionId: string): Promise<WorkflowSession | null>
  updateSession(sessionId: string, session: WorkflowSession): Promise<void>
  deleteSession(sessionId: string): Promise<void>

  // Query operations
  listSessions(includeInactive?: boolean): Promise<WorkflowSession[]>
  getSessionByBranch(branchName: string): Promise<WorkflowSession | null>

  // Lock management
  acquireLock(sessionId: string): Promise<boolean>
  releaseLock(sessionId: string): Promise<void>
  isLocked(sessionId: string): Promise<boolean>

  // Maintenance
  cleanupExpiredSessions(): Promise<number>
  cleanupOrphanedLocks(): Promise<void>
}
```

### GitHubIntegration

GitHub API integration service.

```typescript
class GitHubIntegration {
  constructor(basePath?: string)

  initialize(): Promise<boolean>
  isInitialized(): boolean
  getRepoInfo(): { owner: string; repo: string } | null

  // Pull Request operations
  createPullRequest(options: PullRequestOptions): Promise<PullRequestInfo | null>
  getPullRequest(prNumber: number): Promise<PullRequestInfo | null>
  getPullRequestForBranch(branchName: string): Promise<PullRequestInfo | null>
  mergePullRequest(prNumber: number, mergeMethod?: 'merge' | 'squash' | 'rebase'): Promise<boolean>
  closePullRequest(prNumber: number): Promise<boolean>

  // Review operations
  addComment(prNumber: number, body: string): Promise<boolean>
  getReviewStatus(prNumber: number): Promise<{
    approved: boolean;
    changesRequested: boolean;
    reviewCount: number;
  }>

  // Checks operations
  getChecksStatus(branchName: string): Promise<{
    passed: boolean;
    failed: boolean;
    pending: boolean;
    total: number;
  }>

  // Release operations
  createRelease(tagName: string, options?: {
    name?: string;
    body?: string;
    draft?: boolean;
    prerelease?: boolean;
  }): Promise<{ html_url: string } | null>
}
```

### ConfigurationManager

Configuration management service.

```typescript
class ConfigurationManager {
  constructor(basePath?: string)

  load(): Promise<Configuration>
  save(config: Configuration): Promise<void>

  isInitialized(): Promise<boolean>
  initialize(scope?: 'project' | 'user'): Promise<void>

  getGitHooksPath(): string
  installGitHooks(): Promise<void>
  uninstallGitHooks(): Promise<void>

  getSetting<T>(key: string): Promise<T | undefined>
  setSetting<T>(key: string, value: T): Promise<void>
}
```

## State Machines

### BaseStateMachine

Abstract base class for state machines.

```typescript
abstract class BaseStateMachine<S extends string, T extends string> {
  protected currentState: S;

  abstract getInitialState(): S
  abstract getFinalStates(): S[]
  abstract canTransition(from: S, to: S): boolean
  abstract getAllowedActions(state: S): string[]

  isValidState(state: S): boolean
  isFinalState(state: S): boolean
  getNextStates(from: S): S[]

  async transition(
    from: S,
    to: S,
    trigger?: T,
    metadata?: Record<string, unknown>
  ): Promise<Result<StateTransition<S, T>>>

  async validateState(
    state: S,
    context: Record<string, unknown>
  ): Promise<ValidationResult>
}
```

### LaunchWorkflowStateMachine

State machine for launch workflows.

```typescript
class LaunchWorkflowStateMachine extends BaseStateMachine<StateName, TransitionTrigger> {
  getInitialState(): StateName
  getFinalStates(): StateName[]
  canTransition(from: StateName, to: StateName): boolean
  getAllowedActions(state: StateName): string[]

  // State-specific validations
  protected validateBranchReady(context: Record<string, unknown>): ValidationResult
  protected validateChangesCommitted(context: Record<string, unknown>): ValidationResult
  protected validatePushed(context: Record<string, unknown>): ValidationResult
}
```

## MCP Server

### HanSoloMCPServer

Model Context Protocol server for Claude Code integration.

```typescript
class HanSoloMCPServer {
  constructor(basePath?: string)

  run(): Promise<void>
}
```

### MCP Tools

Available tools exposed to Claude Code:

#### hansolo_init
Initialize han-solo in project.

```json
{
  "name": "hansolo_init",
  "input": {
    "scope": "project" | "user",
    "force": boolean
  }
}
```

#### hansolo_launch
Start new feature workflow.

```json
{
  "name": "hansolo_launch",
  "input": {
    "branchName": string,
    "description": string,
    "force": boolean
  }
}
```

#### hansolo_sessions
List workflow sessions.

```json
{
  "name": "hansolo_sessions",
  "input": {
    "all": boolean,
    "verbose": boolean,
    "cleanup": boolean
  }
}
```

#### hansolo_swap
Switch between sessions.

```json
{
  "name": "hansolo_swap",
  "input": {
    "branchName": string,
    "force": boolean,
    "stash": boolean
  }
}
```

#### hansolo_abort
Abort workflow session.

```json
{
  "name": "hansolo_abort",
  "input": {
    "branchName": string,
    "force": boolean,
    "deleteBranch": boolean,
    "yes": boolean
  }
}
```

#### hansolo_ship
Complete workflow stages.

```json
{
  "name": "hansolo_ship",
  "input": {
    "message": string,
    "push": boolean,
    "createPR": boolean,
    "merge": boolean,
    "force": boolean,
    "yes": boolean
  }
}
```

#### hansolo_status
Get current workflow status.

```json
{
  "name": "hansolo_status",
  "input": {}
}
```

## Types

### Core Types

```typescript
type WorkflowType = 'launch' | 'ship' | 'hotfix';

type StateName =
  | 'INIT'
  | 'BRANCH_READY'
  | 'CHANGES_COMMITTED'
  | 'PUSHED'
  | 'PR_CREATED'
  | 'WAITING_APPROVAL'
  | 'REBASING'
  | 'MERGING'
  | 'MERGED'
  | 'CLEANUP'
  | 'COMPLETE'
  | 'ABORTED';

type TransitionTrigger =
  | 'user_action'
  | 'auto_progression'
  | 'error_recovery'
  | 'abort_command'
  | 'ship_command';

type AuditAction =
  | 'session_created'
  | 'session_resumed'
  | 'state_transition'
  | 'git_operation'
  | 'api_call'
  | 'user_decision'
  | 'error_occurred'
  | 'session_completed'
  | 'session_aborted';
```

### Result Type

```typescript
type Result<T, E = Error> =
  | { success: true; value: T; }
  | { success: false; error: E; };
```

### Interfaces

```typescript
interface SessionMetadata {
  projectPath: string;
  remoteUrl?: string;
  gitPlatform?: 'github' | 'gitlab' | 'bitbucket';
  userEmail?: string;
  userName?: string;
  tags?: string[];
  context?: Record<string, unknown>;
}

interface GitBranchStatus {
  ahead: number;
  behind: number;
  hasRemote: boolean;
  isClean: boolean;
  conflicted?: string[];
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

interface PullRequestOptions {
  title: string;
  body: string;
  base?: string;
  head: string;
  draft?: boolean;
  maintainerCanModify?: boolean;
}

interface PullRequestInfo {
  number: number;
  html_url: string;
  state: string;
  merged: boolean;
  mergeable?: boolean;
  mergeable_state?: string;
  title: string;
  body?: string;
}
```