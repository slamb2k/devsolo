# MCP Tools System Documentation

**Audience**: Developers working on devsolo internals

**Purpose**: System-level documentation for implementing, testing, and maintaining MCP tools

**User-Facing Documentation**: See [docs/guides/mcp-tools-reference.md](../../guides/mcp-tools-reference.md) for user-facing tool documentation

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tool Implementation Pattern](#tool-implementation-pattern)
3. [Result Type System](#result-type-system)
4. [Pre-Flight Check Pattern](#pre-flight-check-pattern)
5. [Post-Flight Verification Pattern](#post-flight-verification-pattern)
6. [Service Injection](#service-injection)
7. [Error Handling](#error-handling)
8. [Testing Patterns](#testing-patterns)
9. [Tool Registry](#tool-registry)
10. [Adding New Tools](#adding-new-tools)
11. [Performance Considerations](#performance-considerations)

---

## Architecture Overview

### Pure MCP Architecture (v2.0.0)

devsolo v2.0.0 implements a pure MCP-only architecture with no CLI layer. All user interaction happens through Claude Code via the MCP protocol.

**Architecture Layers**:

```
┌─────────────────────────────────┐
│      Claude Code (MCP Client)   │
└─────────────────────────────────┘
                ↓ JSON-RPC
┌─────────────────────────────────┐
│       MCP Server                │
│    (DevSoloMCPServer)           │
└─────────────────────────────────┘
                ↓
┌─────────────────────────────────┐
│      MCP Tools Layer            │
│  (11 Tool Implementations)      │
└─────────────────────────────────┘
                ↓
┌─────────────────────────────────┐
│   Validation Services Layer     │
│  (Pre/Post-Flight Checks)       │
└─────────────────────────────────┘
                ↓
┌─────────────────────────────────┐
│    Core Services Layer          │
│  (Git, GitHub, Sessions, etc.)  │
└─────────────────────────────────┘
                ↓
┌─────────────────────────────────┐
│     Persistence Layer           │
│   (File System & Git Repo)      │
└─────────────────────────────────┘
```

### Tool Count

- **Total MCP Tools**: 11
- **Workflow Tools**: 7 (launch, commit, ship, swap, abort, hotfix, cleanup)
- **Query Tools**: 2 (status, sessions)
- **Configuration Tools**: 2 (init, status_line)

### Tool Classification

| Tool | Type | Returns | Mutates State |
|------|------|---------|---------------|
| `devsolo_init` | Configuration | SessionToolResult | Yes (creates .devsolo) |
| `devsolo_launch` | Workflow | SessionToolResult | Yes (creates session/branch) |
| `devsolo_commit` | Workflow | SessionToolResult | Yes (commits changes) |
| `devsolo_ship` | Workflow | GitHubToolResult | Yes (pushes, creates PR, merges) |
| `devsolo_swap` | Workflow | SessionToolResult | Yes (switches session) |
| `devsolo_abort` | Workflow | SessionToolResult | Yes (deletes session) |
| `devsolo_hotfix` | Workflow | SessionToolResult | Yes (creates hotfix session) |
| `devsolo_cleanup` | Workflow | SessionToolResult | Yes (deletes old sessions) |
| `devsolo_status` | Query | QueryToolResult | No (read-only) |
| `devsolo_sessions` | Query | QueryToolResult | No (read-only) |
| `devsolo_status_line` | Configuration | QueryToolResult | Yes (updates config) |

---

## Tool Implementation Pattern

All MCP tools follow a consistent implementation pattern.

### MCPTool Interface

```typescript
export interface MCPTool<TInput = unknown, TResult = ToolResult> {
  execute(input: TInput): Promise<TResult>;
}
```

### Standard Tool Structure

```typescript
export class ExampleTool implements MCPTool<ExampleToolInput, SessionToolResult> {
  // Validation services
  private readonly preFlightCheckService: PreFlightCheckService;
  private readonly postFlightVerification: PostFlightVerification;

  constructor(
    // Inject required services
    private readonly gitOps: GitOperations,
    private readonly sessionRepo: SessionRepository,
    private readonly someOtherService: SomeService,
  ) {
    // Initialize validation services
    this.preFlightCheckService = new PreFlightCheckService(gitOps, sessionRepo);
    this.postFlightVerification = new PostFlightVerification(gitOps, sessionRepo);
  }

  async execute(input: ExampleToolInput): Promise<SessionToolResult> {
    try {
      // Step 1: Check initialization
      const initCheck = await this.preFlightCheckService.checkInitialization();
      if (!initCheck.passed) {
        return createErrorResult(
          new Error(initCheck.message),
          'ExampleTool',
          [initCheck]
        );
      }

      // Step 2: Run pre-flight checks
      const preFlightChecks = await this.runPreFlightChecks(input);
      const failedChecks = preFlightChecks.filter(c => !c.passed && c.severity === 'error');
      if (failedChecks.length > 0 && !input.force) {
        return {
          success: false,
          errors: failedChecks.map(c => c.message),
          preFlightChecks,
        };
      }

      // Step 3: Execute core workflow logic
      const result = await this.executeWorkflow(input);

      // Step 4: Run post-flight verifications
      const postFlightVerifications = await this.runPostFlightVerifications();

      // Step 5: Merge and return results
      return {
        success: true,
        ...result,
        preFlightChecks,
        postFlightVerifications,
      };

    } catch (error) {
      return createErrorResult(error, 'ExampleTool');
    }
  }

  private async runPreFlightChecks(input: ExampleToolInput): Promise<CheckResult[]> {
    // Tool-specific pre-flight checks
    return [
      // Example checks
      await this.preFlightCheckService.checkOnMainBranch(),
      await this.preFlightCheckService.checkWorkingDirectoryClean(),
      await this.preFlightCheckService.checkNoExistingSession(),
    ];
  }

  private async executeWorkflow(input: ExampleToolInput): Promise<Partial<SessionToolResult>> {
    // Core workflow implementation
    // ...
    return {
      branchName: 'feature/example',
      state: 'BRANCH_READY',
    };
  }

  private async runPostFlightVerifications(): Promise<CheckResult[]> {
    // Tool-specific post-flight verifications
    return [
      // Example verifications
      await this.postFlightVerification.verifySessionCreated(),
      await this.postFlightVerification.verifyBranchCreated(),
    ];
  }
}
```

### Key Patterns

1. **Dependency Injection**: All services injected via constructor
2. **Validation Services**: Pre/post-flight check services initialized in constructor
3. **Consistent Flow**: Check init → Pre-flight → Execute → Post-flight → Return
4. **Error Handling**: Try-catch with standardized error results
5. **Force Override**: Pre-flight failures can be overridden with `force: true`

---

## Result Type System

### Three Main Result Types

#### 1. SessionToolResult

Used by tools that manage workflow sessions.

```typescript
export interface SessionToolResult {
  success: boolean;
  branchName?: string;
  state?: string;
  sessionId?: string;
  preFlightChecks?: CheckResult[];
  postFlightVerifications?: CheckResult[];
  errors?: string[];
  warnings?: string[];
  nextSteps?: string[];
}
```

**Used By**: init, launch, commit, swap, abort, hotfix, cleanup

#### 2. GitHubToolResult

Used by tools that interact with GitHub (PRs, merging).

```typescript
export interface GitHubToolResult {
  success: boolean;
  prNumber?: number;
  prUrl?: string;
  merged?: boolean;
  preFlightChecks?: CheckResult[];
  postFlightVerifications?: CheckResult[];
  errors?: string[];
  warnings?: string[];
}
```

**Used By**: ship

#### 3. QueryToolResult

Used by read-only tools that query state.

```typescript
export interface QueryToolResult {
  success: boolean;
  data: Record<string, unknown>;
  message?: string;
  errors?: string[];
  warnings?: string[];
}
```

**Used By**: status, sessions, status_line

### CheckResult Structure

```typescript
export interface CheckResult {
  name: string;                 // Check identifier
  passed: boolean;              // Did check pass?
  message: string;              // Human-readable message
  severity: 'error' | 'warning' | 'info';
  details?: {
    expected?: any;             // What was expected
    actual?: any;               // What was found
    suggestion?: string;        // How to fix
  };
}
```

---

## Pre-Flight Check Pattern

### PreFlightCheckService

Central service for common pre-flight checks.

**Location**: `src/mcp/validation/pre-flight-check-service.ts`

**Common Checks**:

```typescript
class PreFlightCheckService {
  // Initialization checks
  async checkInitialization(): Promise<CheckResult>

  // Git state checks
  async checkOnMainBranch(): Promise<CheckResult>
  async checkNotOnMainBranch(): Promise<CheckResult>
  async checkWorkingDirectoryClean(): Promise<CheckResult>
  async checkMainBranchUpToDate(): Promise<CheckResult>

  // Session checks
  async checkNoExistingSession(): Promise<CheckResult>
  async checkSessionExists(): Promise<CheckResult>
  async checkSessionOnBranch(branchName: string): Promise<CheckResult>

  // Branch checks
  async checkBranchExists(branchName: string): Promise<CheckResult>
  async checkBranchAvailable(branchName: string): Promise<CheckResult>

  // GitHub checks
  async checkGitHubAuthentication(): Promise<CheckResult>
}
```

### Tool-Specific Checks

Each tool implements tool-specific pre-flight checks:

```typescript
// In LaunchTool
private async runPreFlightChecks(input: LaunchToolInput): Promise<CheckResult[]> {
  const checks = [
    // Common checks
    await this.preFlightCheckService.checkOnMainBranch(),
    await this.preFlightCheckService.checkMainBranchUpToDate(),
    await this.preFlightCheckService.checkNoExistingSession(),
  ];

  // Tool-specific check: working directory clean (unless force/stash)
  if (!input.force && !input.stashRef) {
    checks.push(await this.preFlightCheckService.checkWorkingDirectoryClean());
  }

  // Tool-specific check: branch name available
  if (input.branchName) {
    checks.push(await this.preFlightCheckService.checkBranchAvailable(input.branchName));
  }

  return checks;
}
```

### Check Result Processing

```typescript
// Filter failures by severity
const failedChecks = preFlightChecks.filter(
  c => !c.passed && c.severity === 'error'
);

// Allow force override
if (failedChecks.length > 0 && !input.force) {
  return {
    success: false,
    errors: failedChecks.map(c => c.message),
    preFlightChecks,
  };
}

// Warnings don't block execution
const warnings = preFlightChecks
  .filter(c => !c.passed && c.severity === 'warning')
  .map(c => c.message);
```

---

## Post-Flight Verification Pattern

### PostFlightVerification

Central service for common post-flight verifications.

**Location**: `src/mcp/validation/post-flight-verification.ts`

**Common Verifications**:

```typescript
class PostFlightVerification {
  // Session verifications
  async verifySessionCreated(): Promise<CheckResult>
  async verifySessionDeleted(): Promise<CheckResult>
  async verifySessionState(expectedState: string): Promise<CheckResult>

  // Branch verifications
  async verifyBranchCreated(branchName: string): Promise<CheckResult>
  async verifyBranchDeleted(branchName: string): Promise<CheckResult>
  async verifyOnBranch(branchName: string): Promise<CheckResult>
  async verifyOnMainBranch(): Promise<CheckResult>

  // Git state verifications
  async verifyWorkingDirectoryClean(): Promise<CheckResult>
  async verifyCommitExists(message: string): Promise<CheckResult>
  async verifyBranchPushed(branchName: string): Promise<CheckResult>

  // GitHub verifications
  async verifyPRCreated(prNumber: number): Promise<CheckResult>
  async verifyPRMerged(prNumber: number): Promise<CheckResult>
}
```

### Tool-Specific Verifications

```typescript
// In LaunchTool
private async runPostFlightVerifications(branchName: string): Promise<CheckResult[]> {
  return [
    // Verify session was created
    await this.postFlightVerification.verifySessionCreated(),

    // Verify branch was created
    await this.postFlightVerification.verifyBranchCreated(branchName),

    // Verify we're on the correct branch
    await this.postFlightVerification.verifyOnBranch(branchName),

    // Verify session state is correct
    await this.postFlightVerification.verifySessionState('BRANCH_READY'),

    // Tool-specific: verify working directory clean (unless stash was restored)
    // ...
  ];
}
```

---

## Service Injection

### Dependency Injection Pattern

All tools use constructor injection for dependencies:

```typescript
export class LaunchTool implements MCPTool<LaunchToolInput, SessionToolResult> {
  constructor(
    private readonly gitOps: GitOperations,
    private readonly sessionRepo: SessionRepository,
    private readonly branchNaming: BranchNamingService,
    private readonly workflowOrchestrator: WorkflowOrchestrator,
  ) {
    this.preFlightCheckService = new PreFlightCheckService(gitOps, sessionRepo);
    this.postFlightVerification = new PostFlightVerification(gitOps, sessionRepo);
  }
}
```

### Common Service Dependencies

| Service | Purpose | Used By |
|---------|---------|---------|
| `GitOperations` | Git command execution | All workflow tools |
| `SessionRepository` | Session CRUD operations | All workflow tools |
| `ConfigurationManager` | Configuration management | init, status_line |
| `GitHubService` | GitHub API interactions | ship, hotfix |
| `BranchNamingService` | Branch name generation/validation | launch, hotfix |
| `WorkflowOrchestrator` | Multi-step workflow coordination | launch, ship, hotfix |
| `PRDescriptionService` | PR description generation | ship |
| `PRStatusMonitor` | PR/CI status polling | ship |

### Service Registration

Services are registered in the MCP server initialization:

```typescript
// In bin/devsolo-mcp
const server = new DevSoloMCPServer({
  gitOps: new GitOperations(),
  sessionRepo: new SessionRepository(configManager),
  configManager: new ConfigurationManager(),
  branchNaming: new BranchNamingService(),
  // ... more services
});
```

---

## Error Handling

### createErrorResult Helper

Standardized error result creation:

```typescript
export function createErrorResult(
  error: unknown,
  toolName: string,
  preFlightChecks?: CheckResult[]
): SessionToolResult {
  const errorMessage = error instanceof Error ? error.message : String(error);

  return {
    success: false,
    errors: [`${toolName} failed: ${errorMessage}`],
    preFlightChecks: preFlightChecks || [],
    postFlightVerifications: [],
  };
}
```

### Error Categories

1. **Initialization Errors**: devsolo not initialized
2. **Pre-Flight Failures**: Validation checks failed
3. **Execution Errors**: Core workflow failed
4. **Post-Flight Failures**: Verification failed (operation completed but state unexpected)

### Error Result Example

```typescript
{
  success: false,
  errors: [
    "LaunchTool failed: Cannot launch workflow - working directory has uncommitted changes"
  ],
  preFlightChecks: [
    {
      name: "working-directory-clean",
      passed: false,
      message: "Working directory has uncommitted changes",
      severity: "error",
      details: {
        actual: "modified: src/example.ts",
        suggestion: "Commit or stash changes before launching new workflow"
      }
    }
  ]
}
```

---

## Testing Patterns

### Three Testing Layers

1. **Unit Tests**: Test individual tool methods in isolation
2. **Integration Tests**: Test tool execution with real services
3. **Contract Tests**: Test MCP tool interface contracts

### Unit Test Pattern

```typescript
describe('LaunchTool', () => {
  let tool: LaunchTool;
  let mockGitOps: jest.Mocked<GitOperations>;
  let mockSessionRepo: jest.Mocked<SessionRepository>;

  beforeEach(() => {
    mockGitOps = createMockGitOperations();
    mockSessionRepo = createMockSessionRepository();
    tool = new LaunchTool(mockGitOps, mockSessionRepo, ...);
  });

  describe('execute', () => {
    it('should create session and feature branch', async () => {
      // Arrange
      mockGitOps.getCurrentBranch.mockResolvedValue('main');
      mockSessionRepo.getActiveSession.mockResolvedValue(null);

      // Act
      const result = await tool.execute({
        description: 'Test feature'
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.branchName).toMatch(/^feature\//);
      expect(mockGitOps.createBranch).toHaveBeenCalled();
    });
  });
});
```

### Integration Test Pattern

```typescript
describe('LaunchTool Integration', () => {
  let tool: LaunchTool;
  let testRepo: TestRepository;

  beforeEach(async () => {
    testRepo = await createTestRepository();
    tool = createLaunchTool(testRepo.path);
  });

  it('should create real session and branch', async () => {
    // Execute against real Git repository
    const result = await tool.execute({
      description: 'Integration test feature'
    });

    // Verify real Git state
    expect(result.success).toBe(true);
    const currentBranch = await execGit('rev-parse --abbrev-ref HEAD');
    expect(currentBranch).toMatch(/^feature\//);
  });
});
```

### Contract Test Pattern

```typescript
describe('LaunchTool Contract', () => {
  it('should implement MCPTool interface', () => {
    const tool = new LaunchTool(...);
    expect(tool.execute).toBeDefined();
    expect(typeof tool.execute).toBe('function');
  });

  it('should return SessionToolResult', async () => {
    const result = await tool.execute({ description: 'test' });
    expect(result).toHaveProperty('success');
    expect(typeof result.success).toBe('boolean');
  });
});
```

---

## Tool Registry

### MCP Server Tool Registration

Tools are registered in `DevSoloMCPServer`:

```typescript
export class DevSoloMCPServer {
  private tools: Map<string, MCPTool>;

  constructor(services: Services) {
    this.tools = new Map([
      ['devsolo_init', new InitTool(services.configManager)],
      ['devsolo_launch', new LaunchTool(services.gitOps, services.sessionRepo, ...)],
      ['devsolo_commit', new CommitTool(services.gitOps, services.sessionRepo)],
      ['devsolo_ship', new ShipTool(services.gitOps, services.github, ...)],
      // ... more tools
    ]);
  }

  async handleToolCall(name: string, input: unknown): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }
    return await tool.execute(input);
  }
}
```

### Tool Naming Convention

- **Prefix**: All tools prefixed with `devsolo_`
- **Format**: `devsolo_<action>` (lowercase, underscore-separated)
- **Examples**: `devsolo_launch`, `devsolo_status_line`

---

## Adding New Tools

### Checklist for New Tool Implementation

- [ ] **1. Define Input Interface**
  ```typescript
  // src/mcp/tools/my-tool.ts
  export interface MyToolInput {
    param1: string;
    param2?: boolean;
  }
  ```

- [ ] **2. Implement Tool Class**
  ```typescript
  export class MyTool implements MCPTool<MyToolInput, SessionToolResult> {
    constructor(
      private readonly gitOps: GitOperations,
      private readonly sessionRepo: SessionRepository,
    ) {
      this.preFlightCheckService = new PreFlightCheckService(gitOps, sessionRepo);
      this.postFlightVerification = new PostFlightVerification(gitOps, sessionRepo);
    }

    async execute(input: MyToolInput): Promise<SessionToolResult> {
      // Implementation
    }
  }
  ```

- [ ] **3. Register in MCP Server**
  ```typescript
  // bin/devsolo-mcp or src/mcp/server.ts
  this.tools.set('devsolo_my_tool', new MyTool(gitOps, sessionRepo));
  ```

- [ ] **4. Add Pre-Flight Checks**
  - Implement `runPreFlightChecks()` method
  - Use `PreFlightCheckService` for common checks
  - Add tool-specific validation logic

- [ ] **5. Add Post-Flight Verifications**
  - Implement `runPostFlightVerifications()` method
  - Use `PostFlightVerification` for common verifications
  - Add tool-specific verification logic

- [ ] **6. Write Unit Tests**
  ```typescript
  // tests/unit/mcp/tools/my-tool.test.ts
  describe('MyTool', () => {
    // Test initialization check
    // Test pre-flight checks
    // Test core execution
    // Test post-flight verifications
    // Test error handling
  });
  ```

- [ ] **7. Write Integration Tests**
  ```typescript
  // tests/integration/mcp/tools/my-tool.integration.test.ts
  describe('MyTool Integration', () => {
    // Test with real Git operations
    // Test with real session repository
  });
  ```

- [ ] **8. Update User Documentation**
  - Add entry to `docs/guides/mcp-tools-reference.md`
  - Include usage examples
  - Document all parameters
  - Show natural language patterns

- [ ] **9. Update MCP Server Metadata**
  - Add tool to tools list
  - Include description and parameter schema
  - Ensure proper JSON-RPC metadata

- [ ] **10. Add to CHANGELOG.md**
  - Document new tool in appropriate version section

### Example: Adding a "Stash" Tool

```typescript
// src/mcp/tools/stash-tool.ts
export interface StashToolInput {
  message?: string;
  includeUntracked?: boolean;
}

export class StashTool implements MCPTool<StashToolInput, SessionToolResult> {
  constructor(
    private readonly gitOps: GitOperations,
    private readonly sessionRepo: SessionRepository,
  ) {
    this.preFlightCheckService = new PreFlightCheckService(gitOps, sessionRepo);
    this.postFlightVerification = new PostFlightVerification(gitOps, sessionRepo);
  }

  async execute(input: StashToolInput): Promise<SessionToolResult> {
    try {
      // Check initialization
      const initCheck = await this.preFlightCheckService.checkInitialization();
      if (!initCheck.passed) {
        return createErrorResult(new Error(initCheck.message), 'StashTool', [initCheck]);
      }

      // Pre-flight checks
      const preFlightChecks = [
        await this.checkHasChanges(),
      ];

      // Execute stash
      const stashRef = await this.gitOps.stashChanges(
        input.message || 'devsolo auto-stash',
        input.includeUntracked
      );

      // Post-flight verifications
      const postFlightVerifications = [
        await this.postFlightVerification.verifyWorkingDirectoryClean(),
      ];

      return {
        success: true,
        message: `Changes stashed as ${stashRef}`,
        preFlightChecks,
        postFlightVerifications,
      };
    } catch (error) {
      return createErrorResult(error, 'StashTool');
    }
  }

  private async checkHasChanges(): Promise<CheckResult> {
    const hasChanges = await this.gitOps.hasUncommittedChanges();
    return {
      name: 'has-changes',
      passed: hasChanges,
      message: hasChanges
        ? 'Working directory has changes to stash'
        : 'No changes to stash',
      severity: hasChanges ? 'info' : 'warning',
    };
  }
}
```

---

## Performance Considerations

### Async/Await Patterns

All tool operations are async:

```typescript
async execute(input: ToolInput): Promise<ToolResult> {
  // All operations await completion
  const checks = await this.runPreFlightChecks(input);
  const result = await this.executeWorkflow(input);
  const verifications = await this.runPostFlightVerifications();
  return { ...result, checks, verifications };
}
```

### Parallel vs Sequential Operations

**Sequential** (when order matters):

```typescript
// Must run in order
const session = await this.sessionRepo.createSession(config);
const branch = await this.gitOps.createBranch(session.branchName);
await this.gitOps.checkoutBranch(session.branchName);
```

**Parallel** (when independent):

```typescript
// Can run in parallel
const [currentBranch, hasChanges, activeSession] = await Promise.all([
  this.gitOps.getCurrentBranch(),
  this.gitOps.hasUncommittedChanges(),
  this.sessionRepo.getActiveSession(),
]);
```

### Caching Strategies

Avoid redundant Git operations:

```typescript
// Bad: Multiple calls to same operation
const branch1 = await this.gitOps.getCurrentBranch();
// ... some code
const branch2 = await this.gitOps.getCurrentBranch();  // Redundant!

// Good: Cache result
const currentBranch = await this.gitOps.getCurrentBranch();
// ... use currentBranch multiple times
```

### Check Optimization

Order checks from fastest to slowest:

```typescript
// Fast checks first (in-memory)
const initCheck = await this.preFlightCheckService.checkInitialization();  // File read
const sessionCheck = await this.preFlightCheckService.checkNoExistingSession();  // Session repo

// Slower checks last (Git operations)
const branchCheck = await this.preFlightCheckService.checkOnMainBranch();  // Git command
const cleanCheck = await this.preFlightCheckService.checkWorkingDirectoryClean();  // Git status
```

---

## Summary

The MCP tools system in devsolo v2.0.0 provides:

✅ **Consistent implementation pattern** across all 11 tools
✅ **Comprehensive validation** with pre/post-flight checks
✅ **Structured results** with detailed feedback
✅ **Dependency injection** for testability
✅ **Standardized error handling** with helpful messages
✅ **Three testing layers** (unit, integration, contract)
✅ **Clear tool registry** for MCP server
✅ **Performance optimization** with async patterns

For user-facing documentation, see:
- [MCP Tools Reference](../../guides/mcp-tools-reference.md) - Complete tool documentation for users
- [Quickstart Guide](../../guides/quickstart.md) - Getting started with tools
- [Usage Guide](../../guides/usage.md) - Practical usage examples

For architecture details, see:
- [MCP Architecture](mcp-architecture.md) - Complete architecture documentation
- [API Reference](api.md) - Core service APIs
- [Configuration](configuration.md) - Configuration system

---

**Last Updated**: 2025-10-10
**Version**: 2.0.0 (Pure MCP)
