# Research: devsolo Git Workflow Automation

**Generated**: 2025-09-21
**Status**: Complete

## Overview
This document resolves technical unknowns and documents architectural decisions for the devsolo Git workflow automation tool implementation.

## Resolved Clarifications

### 1. Session Cleanup Timeout Period
**Decision**: 30 days for stale session cleanup
**Rationale**:
- Balances storage concerns with user convenience
- Allows for extended breaks without losing context
- Aligns with typical sprint/iteration cycles
**Alternatives considered**:
- 7 days: Too short for vacation/leave scenarios
- 90 days: Excessive storage for abandoned sessions

### 2. Git Hosting Platform Support
**Decision**: GitHub and GitLab initially, extensible architecture for others
**Rationale**:
- GitHub and GitLab cover 85%+ of market
- Both have robust APIs for automation
- Plugin architecture allows future Bitbucket/Gitea support
**Alternatives considered**:
- GitHub only: Too limiting for enterprise users
- All platforms initially: Increases MVP complexity unnecessarily

## Technology Decisions

### 1. MCP Server Framework
**Decision**: TypeScript with @anthropic/mcp SDK
**Rationale**:
- Official SDK from Anthropic ensures compatibility
- TypeScript provides type safety for state machines
- Same language as Claude Code integration layer
**Best Practices**:
- Strict typing for all state transitions
- Comprehensive error handling with typed errors
- Unit tests for every state transition

### 2. State Persistence
**Decision**: JSON files in .devsolo/sessions/ directory
**Rationale**:
- Simple, portable, version-controllable
- No external database dependencies
- Human-readable for debugging
**Best Practices**:
- Atomic writes with temp file + rename
- Lock files to prevent concurrent modifications
- Automatic backup before state changes

### 3. Git Operations
**Decision**: Direct Git CLI invocation via child_process
**Rationale**:
- Maximum compatibility with all Git versions
- No abstraction layer bugs or limitations
- Direct error messages from Git
**Best Practices**:
- Sanitize all inputs to prevent injection
- Parse Git output with structured formats (--porcelain)
- Timeout handling for long operations

### 4. GitHub/GitLab API Integration
**Decision**: Octokit for GitHub, @gitbeaker/node for GitLab
**Rationale**:
- Official/semi-official SDKs
- Well-maintained with good documentation
- Type-safe with TypeScript support
**Best Practices**:
- Token storage in system keychain
- Rate limiting with exponential backoff
- Graceful degradation when API unavailable

### 5. Visual Output System
**Decision**: chalk for colors, ora for spinners, boxen for boxes
**Rationale**:
- Industry-standard libraries
- Cross-platform terminal support
- Minimal dependencies
**Best Practices**:
- Respect NO_COLOR environment variable
- Fallback to plain text when not TTY
- Consistent color scheme across commands

### 6. Testing Framework
**Decision**: Jest for unit tests, Playwright for E2E tests
**Rationale**:
- Jest is standard for Node.js testing
- Playwright can test terminal interactions
- Both support TypeScript natively
**Best Practices**:
- Test each state transition independently
- Mock Git operations in unit tests
- Real Git repos in integration tests

### 7. Configuration Management
**Decision**: YAML for human-editable configs, JSON for machine state
**Rationale**:
- YAML is more readable for users
- JSON is faster for frequent state updates
- Clear separation of concerns
**Best Practices**:
- Schema validation for all configs
- Migration scripts for version changes
- Default configs with override hierarchy

### 8. Hook System
**Decision**: Shell scripts with Node.js runners
**Rationale**:
- Git expects shell scripts for hooks
- Node.js runner allows TypeScript logic
- Cross-platform compatibility
**Best Practices**:
- Hooks check for devsolo initialization
- Fast-fail with clear error messages
- Bypass mechanism for emergencies

## Architecture Patterns

### 1. State Machine Pattern
**Pattern**: Finite State Machine with Command pattern
**Implementation**:
```typescript
interface WorkflowState {
  name: StateNames;
  allowedTransitions: StateNames[];
  onEnter?: () => Promise<void>;
  onExit?: () => Promise<void>;
}
```

### 2. Tool Communication
**Pattern**: JSON-RPC over stdio
**Implementation**:
- MCP server exposes tools via JSON-RPC
- Claude Code calls tools with structured params
- Responses include state changes and UI updates

### 3. Error Handling
**Pattern**: Result type with explicit error states
**Implementation**:
```typescript
type Result<T, E> =
  | { success: true; value: T }
  | { success: false; error: E };
```

### 4. Session Management
**Pattern**: Repository pattern with file-based storage
**Implementation**:
- SessionRepository handles all persistence
- Session objects are immutable
- State changes create new session versions

## Performance Optimizations

### 1. Lazy Loading
- Load session data only when needed
- Cache Git status for command duration
- Defer API calls until required

### 2. Parallel Operations
- Concurrent session status checks
- Parallel branch existence validation
- Batch API requests when possible

### 3. Incremental Updates
- Update only changed session fields
- Diff-based state persistence
- Minimal Git operations per command

## Security Considerations

### 1. Token Management
- Never store tokens in plain text
- Use system keychain (keytar library)
- Separate tokens per Git platform

### 2. Input Validation
- Sanitize all user inputs
- Validate branch names against Git rules
- Prevent path traversal in file operations

### 3. Audit Trail
- Log all state transitions
- Record user decisions with context
- Tamper-evident via hash chains

## Integration Points

### 1. Claude Code Integration
- MCP server as tools provider
- Status line for ambient awareness
- CLAUDE.md for workflow guidance

### 2. Git Hook Integration
- Pre-commit: Block direct main commits
- Pre-push: Validate branch state
- Post-merge: Cleanup old sessions

### 3. CI/CD Integration
- Export session state for CI
- Webhook handlers for PR events
- Status checks via GitHub/GitLab API

## Conclusion

All technical unknowns from the specification have been resolved. The architecture leverages proven libraries and patterns while maintaining the constitutional principles of deterministic control, user sovereignty, and linear history enforcement. The design supports both solo developers and teams with minimal configuration overhead.