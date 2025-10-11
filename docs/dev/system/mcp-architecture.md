# Pure MCP Architecture

## Overview

devsolo v2.0.0 is built on a **pure MCP (Model Context Protocol)** architecture, designed exclusively for AI-native workflows via Claude Code.

This document explains the architecture, design decisions, and implementation details for developers.

## Architecture Evolution

### v1.x: Dual CLI/MCP

```
┌─────────────────────────────────┐
│     CLI Interface               │
│  (Terminal commands)            │
└─────────────────────────────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌────────────┐     ┌────────────┐
│  Commands  │     │ MCP Server │
│  Layer     │     │            │
└────────────┘     └────────────┘
         │                 │
         └─────────────────┘
                   ▼
       ┌───────────────────────┐
       │   Services Layer      │
       └───────────────────────┘
```

**Problems**:
- Dual maintenance burden
- Complex terminal UI dependencies (chalk, ora, boxen, inquirer)
- Testing challenges (terminal mocking)
- ESM compatibility issues
- 40% larger codebase

### v2.0.0: Pure MCP

```
┌─────────────────────────────────┐
│         Claude Code             │
│    (MCP Client - AI Agent)      │
└─────────────────────────────────┘
                ↓ JSON-RPC
┌─────────────────────────────────┐
│       MCP Server                │
│    (DevSoloMCPServer)           │
└─────────────────────────────────┘
                ↓
┌─────────────────────────────────┐
│       MCP Tools Layer           │
│  (LaunchTool, ShipTool, etc.)   │
└─────────────────────────────────┘
                ↓
┌─────────────────────────────────┐
│  Validation Services Layer      │
│  (Pre/Post-Flight Checks)       │
└─────────────────────────────────┘
                ↓
┌─────────────────────────────────┐
│     Core Services Layer         │
│ (Git, GitHub, Sessions, Config) │
└─────────────────────────────────┘
                ↓
┌─────────────────────────────────┐
│    Persistence Layer            │
│  (File System & Git Repo)       │
└─────────────────────────────────┘
```

**Benefits**:
- Single interface = single source of truth
- Zero terminal dependencies
- Structured JSON results
- Easy to test (no mocking)
- 37% smaller codebase
- AI-native design

## Layer Breakdown

### 1. MCP Server Layer

**File**: `src/mcp/devsolo-mcp-server.ts`

**Responsibilities**:
- MCP protocol implementation
- Tool registration and routing
- Dependency injection for tools
- Error handling and formatting

**Key Components**:
```typescript
export class DevSoloMCPServer {
  private server: Server;
  private initTool: InitTool;
  private launchTool: LaunchTool;
  private shipTool: ShipTool;
  // ... 8 more tools

  constructor(basePath: string = '.devsolo') {
    // Initialize core services
    const gitOps = new GitOperations();
    const sessionRepo = new SessionRepository(basePath);
    const githubIntegration = new GitHubIntegration(gitOps);
    // ... more services

    // Initialize tools with dependencies
    this.launchTool = new LaunchTool(
      gitOps,
      sessionRepo,
      branchNaming,
      branchValidator,
      githubIntegration,
      stashManager,
      configManager
    );
    // ... more tools

    // Register tools with MCP server
    this.server.setRequestHandler(...);
  }

  async run() {
    // Start MCP server on stdio transport
    await this.server.connect(transport);
  }
}
```

**Design Decisions**:
- **Dependency Injection**: Tools receive services via constructor, not global state
- **Single Responsibility**: Server only handles MCP protocol, tools handle logic
- **Stateless Tools**: No shared mutable state between tool invocations
- **Version 2.0.0**: Updated from v1.x dual-layer to pure MCP

### 2. MCP Tools Layer

**Directory**: `src/mcp/tools/`

**Files**:
- `base-tool.ts` - Interfaces and helpers
- `launch-tool.ts` - Feature branch creation
- `ship-tool.ts` - Complete ship workflow
- `commit-tool.ts` - Commit changes
- `abort-tool.ts` - Cancel workflow
- `swap-tool.ts` - Switch branches
- `sessions-tool.ts` - List sessions
- `status-tool.ts` - Show status
- `hotfix-tool.ts` - Emergency fixes
- `init-tool.ts` - Initialization
- `cleanup-tool.ts` - Maintenance
- `status-line-tool.ts` - UI management

**Tool Interface**:
```typescript
export interface MCPTool<TInput, TResult> {
  execute(input: TInput): Promise<TResult>;
}
```

**Tool Pattern**:
```typescript
export class LaunchTool implements MCPTool<LaunchToolInput, SessionToolResult> {
  constructor(
    private gitOps: GitOperations,
    private sessionRepo: SessionRepository,
    private branchNaming: BranchNamingService,
    // ... more injected services
  ) {
    this.preFlightCheckService = new PreFlightCheckService(gitOps, sessionRepo);
    this.postFlightVerification = new PostFlightVerification(gitOps, sessionRepo);
  }

  async execute(input: LaunchToolInput): Promise<SessionToolResult> {
    try {
      // 1. Check initialization
      if (!(await this.configManager.isInitialized())) {
        return { success: false, errors: ['Not initialized'] };
      }

      // 2. Run pre-flight checks
      const preFlightResult = await this.runPreFlightChecks(branchName, input.force);
      if (!preFlightResult.allPassed && !input.force) {
        return {
          success: false,
          preFlightChecks: preFlightResult.checks,
          errors: preFlightResult.failures,
          warnings: preFlightResult.warnings
        };
      }

      // 3. Execute core workflow
      const workflowResult = await this.executeLaunchWorkflow(branchName, input);
      if (!workflowResult.success) {
        return { success: false, errors: workflowResult.errors };
      }

      // 4. Run post-flight verifications
      const postFlightResult = await this.runPostFlightVerifications(
        workflowResult.session,
        branchName
      );

      // 5. Merge and return results
      return mergeValidationResults(
        { success: postFlightResult.allPassed, ... },
        preFlightResult,
        postFlightResult
      );
    } catch (error) {
      return createErrorResult(error, 'LaunchTool');
    }
  }
}
```

**Design Principles**:
- **Consistent Pattern**: All tools follow same structure
- **Validation First**: Pre-flight → Execute → Post-flight
- **Structured Results**: Always return typed result objects
- **No Side Effects**: All state changes through services
- **Error Handling**: Catch and format all errors

### 3. Validation Services Layer

**Files**:
- `src/services/validation/pre-flight-check-service.ts`
- `src/services/validation/post-flight-verification.ts`

**Purpose**: Comprehensive validation before and after operations

**Pre-Flight Check Service**:
```typescript
export class PreFlightCheckService {
  constructor(
    private gitOps: GitOperations,
    private sessionRepo: SessionRepository
  ) {}

  async runAll(
    checkTypes: PreFlightCheckType[],
    context?: CheckContext
  ): Promise<PreFlightCheckServiceResult> {
    const checks: PreFlightCheckResult[] = [];

    for (const type of checkTypes) {
      const check = await this.runCheck(type, context);
      checks.push(check);
    }

    return {
      allPassed: checks.every(c => c.passed),
      checks,
      failures: checks.filter(c => !c.passed).map(c => c.message),
      warnings: checks.filter(c => c.severity === 'warning').map(c => c.message),
      passedCount: checks.filter(c => c.passed).length,
      failedCount: checks.filter(c => !c.passed).length,
      warningCount: checks.filter(c => c.severity === 'warning').length
    };
  }

  private async runCheck(
    type: PreFlightCheckType,
    context?: CheckContext
  ): Promise<PreFlightCheckResult> {
    switch (type) {
      case 'onMainBranch':
        return await this.checkOnMainBranch();
      case 'workingDirectoryClean':
        return await this.checkWorkingDirectoryClean();
      // ... 12 more checks
    }
  }
}
```

**Check Types**:
- `onMainBranch` - Verify on main/master
- `workingDirectoryClean` - No uncommitted changes
- `mainUpToDate` - Main synced with remote
- `noExistingSession` - No active session
- `branchNameAvailable` - Branch name not in use
- `sessionExists` - Active session present
- `onFeatureBranch` - Not on main
- `hasCommitsToShip` - Commits ahead of main
- `noMergeConflicts` - No conflicts
- ... and more

**Post-Flight Verification Service**:
```typescript
export class PostFlightVerification {
  async runAll(
    verificationTypes: PostFlightVerificationType[],
    context?: VerificationContext
  ): Promise<PostFlightVerificationResult> {
    // Similar pattern to pre-flight checks
    // Verifies operations completed successfully
  }
}
```

**Verification Types**:
- `sessionCreated` - Session exists
- `featureBranchCreated` - Branch exists
- `branchCheckedOut` - On correct branch
- `sessionStateCorrect` - State as expected
- `noUncommittedChanges` - Working dir clean
- `branchMerged` - PR merged
- `featureBranchDeleted` - Branch removed
- `sessionClosed` - Session completed

**Design Decisions**:
- **Structured Results**: Every check returns standardized result
- **No UI Dependencies**: Pure data structures, no terminal output
- **Composable**: Tools pick which checks to run
- **Detailed**: Include expected/actual/suggestion in results
- **Testable**: Easy to unit test without mocking

### 4. Core Services Layer

**Services**:
- `GitOperations` - Git commands via simple-git
- `SessionRepository` - Session CRUD operations
- `GitHubIntegration` - GitHub API via Octokit
- `ConfigurationManager` - Config file management
- `BranchNamingService` - Branch name generation/validation
- `BranchValidator` - Branch validation logic
- `StashManager` - Git stash operations
- `ValidationService` - General validation utilities

**Design Patterns**:
- **Service Pattern**: Encapsulate external dependencies
- **Dependency Injection**: Services don't create dependencies
- **Interface Segregation**: Small, focused interfaces
- **Single Responsibility**: Each service has one purpose

**Example Service**:
```typescript
export class GitOperations {
  private git: SimpleGit;

  constructor(workingDir: string = process.cwd()) {
    this.git = simpleGit(workingDir);
  }

  async getCurrentBranch(): Promise<string> {
    const status = await this.git.status();
    return status.current;
  }

  async createBranch(name: string): Promise<void> {
    await this.git.branch([name]);
  }

  async hasUncommittedChanges(): Promise<boolean> {
    const status = await this.git.status();
    return !status.isClean();
  }

  // ... more operations
}
```

### 5. Persistence Layer

**Storage**:
- `.devsolo/config.yaml` - Configuration
- `.devsolo/sessions/*.json` - Workflow sessions
- `.git/` - Git repository (via simple-git)

**No Database**: File-based storage for simplicity

## Data Flow

### Example: Launch Tool

```
Claude Code Request
  ↓
MCP Server (JSON-RPC)
  ↓
LaunchTool.execute(input)
  ↓
Check if initialized ─→ ConfigurationManager
  ↓
Determine branch name ─→ BranchNamingService
  ↓
Handle uncommitted changes ─→ StashManager
  ↓
Abort active session ─→ SessionRepository
  ↓
Run pre-flight checks ─→ PreFlightCheckService
  │                        ↓
  │                   GitOperations (check branch, status)
  │                   SessionRepository (check no session)
  ↓
Execute launch workflow
  │
  ├─→ Create session ─→ SessionRepository
  ├─→ Create branch ─→ GitOperations
  ├─→ Checkout branch ─→ GitOperations
  └─→ Pop stash (if needed) ─→ GitOperations
  ↓
Run post-flight verifications ─→ PostFlightVerification
  │                               ↓
  │                          GitOperations (verify branch)
  │                          SessionRepository (verify session)
  ↓
Merge results ─→ mergeValidationResults()
  ↓
Return SessionToolResult (JSON)
  ↓
MCP Server formats response
  ↓
Claude Code displays to user
```

## Result Types

### Base Result Types

```typescript
// Base type for all results
export interface BaseToolResult {
  success: boolean;
  errors?: string[];
  warnings?: string[];
}

// For workflow operations (launch, commit, abort, swap)
export interface SessionToolResult extends BaseToolResult {
  branchName?: string;
  state?: string;
  preFlightChecks?: PreFlightCheckResult[];
  postFlightVerifications?: PostFlightVerificationResult[];
  nextSteps?: string[];
}

// For GitHub operations (ship)
export interface GitHubToolResult extends SessionToolResult {
  prNumber?: number;
  prUrl?: string;
  merged?: boolean;
}

// For query operations (status, sessions, cleanup)
export interface QueryToolResult extends BaseToolResult {
  data: Record<string, unknown>;
  message?: string;
}
```

### Check/Verification Result

```typescript
export interface PreFlightCheckResult {
  name: string;
  passed: boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
  details?: {
    expected?: any;
    actual?: any;
    suggestion?: string;
  };
}
```

## Comparison with v1.x

| Aspect | v1.x (Dual CLI/MCP) | v2.0.0 (Pure MCP) |
|--------|---------------------|-------------------|
| **Interfaces** | CLI + MCP | MCP only |
| **Lines of Code** | ~15,000 | ~9,300 (-37%) |
| **Dependencies** | CLI libs (chalk, ora, etc.) | None (terminal) |
| **Architecture** | Dual-layer | Single-layer |
| **Testing** | Complex (terminal mocking) | Simple (direct) |
| **Results** | Terminal output | Structured JSON |
| **Validation** | Ad-hoc | Comprehensive pre/post |
| **Entry Points** | 2 (devsolo, devsolo-mcp) | 1 (devsolo-mcp) |
| **Package Name** | @devsolo/cli | devsolo-mcp |
| **Target Users** | Terminal + AI users | AI users only |

## Design Decisions

### Why Pure MCP?

1. **Simpler**: Single interface to maintain
2. **Better for AI**: Structured data, no terminal parsing
3. **Smaller**: Remove 8,000+ lines of CLI code
4. **Testable**: Direct tool testing, no mocking
5. **Future-Proof**: MCP is Anthropic's official protocol
6. **Focused**: Optimize for AI workflow, not terminal

### Why Not Keep CLI?

- Dual maintenance burden (2x work)
- Complex dependencies (ora, chalk are ESM modules)
- Testing challenges (terminal mocking is brittle)
- Size cost (~40% larger codebase)
- Market fit: Users want AI assistance, not another terminal tool

### Can CLI Return?

Yes, as a thin wrapper:
```
CLI Command → MCP Tool → Services
```
This is possible because:
- Core logic in tools (not CLI commands)
- Structured results (easy to format)
- No UI dependencies in tools

But not a priority - v2.0.0 focuses on AI-native workflows.

## Testing Strategy

### Unit Tests
- Test services directly
- Mock dependencies (Git, GitHub API)
- No terminal mocking needed

### Integration Tests
- Test tools with real services
- Use temporary Git repositories
- Verify structured results

### MCP Contract Tests
- Test MCP server protocol compliance
- Verify tool registration
- Check JSON-RPC responses

**Key Advantage**: No terminal UI mocking, tests are simple and reliable.

## Performance

### v1.x (Dual CLI/MCP)
- Build time: ~15s
- Package size: ~2.5MB
- Startup time: ~300ms (CLI deps)

### v2.0.0 (Pure MCP)
- Build time: ~8s (-47%)
- Package size: ~1.5MB (-40%)
- Startup time: ~100ms (-67%)

## Future Architecture

### Planned Enhancements
1. **Streaming Results**: For long-running operations (CI wait)
2. **Tool Composition**: Chain tools together
3. **Result Caching**: Cache expensive operations
4. **Plugin System**: Third-party tools

### Not Planned
- Terminal UI (use CLI wrapper if needed)
- Interactive prompts (use natural language)
- Shell completions (not applicable to MCP)

## Contributing

### Adding a New Tool

1. **Create tool file**: `src/mcp/tools/new-tool.ts`
2. **Define input interface**: `NewToolInput`
3. **Implement MCPTool interface**: `execute(input): Promise<Result>`
4. **Add validation**: Pre-flight and post-flight
5. **Register in server**: `DevSoloMCPServer.constructor()`
6. **Export from index**: `src/mcp/tools/index.ts`
7. **Write tests**: Unit + integration
8. **Document**: Update mcp-tools-reference.md

### Tool Checklist
- [ ] Implements `MCPTool<TInput, TResult>`
- [ ] Returns structured result type
- [ ] Includes pre-flight checks
- [ ] Includes post-flight verifications
- [ ] Handles all errors gracefully
- [ ] No terminal output (structured only)
- [ ] Uses dependency injection
- [ ] Includes unit tests
- [ ] Includes integration tests
- [ ] Documented in mcp-tools-reference.md

## References

- [MCP Specification](https://modelcontextprotocol.io/specification)
- [Anthropic MCP SDK](https://github.com/anthropics/model-context-protocol)
- [MCP Tools Reference](../guides/mcp-tools-reference.md)
- [Phase 3 Pivot Summary](../dev/reports/phase3-pivot-summary.md)

---

**devsolo v2.0.0** - Pure MCP Architecture for AI-Native Workflows
