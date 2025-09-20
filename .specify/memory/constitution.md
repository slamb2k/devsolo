<!--
Sync Impact Report
==================
Version change: Template → 4.0.0
Modified principles: Template placeholders → 7 concrete han-solo principles
Added sections: State Machine Governance, Architectural Boundaries, Quality Enforcement, Rights and Responsibilities
Removed sections: Generic template placeholders
Templates requiring updates:
✅ plan-template.md - Constitution Check section needs han-solo specific gates
✅ spec-template.md - No changes needed (remains generic)
✅ tasks-template.md - No changes needed (remains generic)
Follow-up TODOs: None - all placeholders filled
-->

# han-solo Constitution

## Core Principles

### I. Hybrid Orchestration Architecture
The han-solo tool employs a dual-layer architecture with clear separation
of concerns:

- **MCP Server Layer**: Provides deterministic state machine workflow control,
  enforces state transitions, and executes Git operations. This layer is the
  source of truth for workflow state and progression.

- **Claude Code Layer**: Supplies intelligent decision-making capabilities,
  natural language processing, and content generation. This layer enhances
  but never controls workflow execution.

This separation ensures workflows remain predictable and completable even
without AI assistance, while leveraging intelligence when available for
optimal user experience.

### II. State Machine Determinism
All workflows are controlled through immutable state machines within the
MCP server:

- State transitions follow strict validation rules that cannot be bypassed
- Each workflow type maintains its own state machine specification
- Invalid transitions must return clear error messages with valid options
- State persistence enables workflow resumption across sessions
- The MCP server is the sole authority for state management

### III. Linear History (NON-NEGOTIABLE)
A clean, linear Git history is the primary objective and cannot be
compromised:

- All new work begins from a fresh, up-to-date main branch
- Feature branches are kept current via rebasing, never merging
- All pull requests are squash-merged to create atomic commits
- No merge commits or branch tangling in the main history
- Pre-merge rebasing is mandatory for all workflows

### IV. User Sovereignty
The user maintains ultimate control over critical decisions:

- Never commit, push, or create pull requests without explicit permission
- Present clear options and wait for explicit responses before proceeding
- Never assume default choices or bypass safety mechanisms
- Provide manual fallback options for all AI-generated content
- Enable abort mechanisms at all non-irreversible workflow stages

### V. Ambient Awareness
Users must have constant, non-intrusive awareness of system state:

- Display current workflow context and active sessions
- Provide actionable warnings for problematic states
- Show proactive alerts before destructive operations
- Maintain comprehensive audit trails of all operations
- Enable session status queries at any time
- Present visually appealing output with colors, icons, and progress indicators
- Install status lines for terminal-level awareness

### VI. AI-Assisted, Not AI-Dependent
Intelligence enhances but never blocks workflow progression:

- MCP server ensures deterministic workflow completion
- Claude Code provides optional intelligent enhancements
- Manual input paths exist at every decision point
- Workflow progression continues during AI unavailability
- System degrades gracefully without losing functionality

### VII. Initialization First
The han-solo tool requires explicit initialization before use:

- All workflow commands require prior execution of initialization
- Initialization establishes Git repository, remote connections, and configuration
- Commands must verify initialization status before execution
- Uninitialized projects receive clear guidance to run init first
- Initialization can create remote repositories when none exist
- Once initialized, configuration persists across sessions
- Components install to `.hansolo/` directories for clean separation
- CLAUDE.md is configured to ensure AI follows workflows

## State Machine Governance

### State Machine Immutability
Once ratified, state machines cannot be modified without constitutional
amendment:

```
Standard Workflow States:
INIT → BRANCH_READY → CHANGES_COMMITTED → PUSHED →
PR_CREATED → WAITING_APPROVAL → REBASING → MERGING →
CLEANUP → COMPLETE

Hotfix Workflow States:
HOTFIX_INIT → HOTFIX_READY → HOTFIX_COMMITTED →
HOTFIX_PUSHED → HOTFIX_VALIDATED → HOTFIX_DEPLOYED →
HOTFIX_CLEANUP → HOTFIX_COMPLETE
```

### State Transition Rules
1. State transitions must be validated by the MCP server before execution
2. Invalid transition attempts must not modify system state
3. Completed states cannot be revisited within the same session
4. Terminal states (COMPLETE) accept no further transitions
5. Abort operations are only valid in non-irreversible states

### Session Management Principles
1. Each workflow session has a cryptographically unique identifier
2. Sessions are associated with Git branches for intuitive resumption
3. Multiple concurrent sessions are supported and encouraged
4. Session state persists across tool invocations and terminal sessions
5. Stale sessions must be cleaned up after configured timeout periods

## Architectural Boundaries

### MCP Server Responsibilities
The MCP server is the authoritative system for:
- State machine enforcement and transition validation
- Session creation, persistence, and recovery
- Git operation execution and error handling
- Workflow orchestration and sequencing
- Audit logging and compliance tracking

### Claude Code Responsibilities
Claude Code provides intelligence for:
- Natural language command interpretation
- Content generation (commits, PRs, branch names)
- Interactive user dialogue and choice presentation
- Error message translation to user-friendly language
- Context analysis for intelligent suggestions

### Boundary Enforcement
- Claude Code must never bypass MCP server state controls
- MCP server must never depend on Claude Code for progression
- Communication between layers uses structured JSON protocol
- Each layer maintains its own error handling and recovery
- Security credentials never pass through either layer

## Quality Enforcement

### Mandatory Quality Gates
These gates are enforced at the MCP server level and cannot be disabled:

1. **Linear History Gate**: All merges must maintain linear history
2. **Branch Protection Gate**: Direct main branch modifications are blocked
3. **Pre-Merge Rebase Gate**: All features rebased before merge
4. **Atomic Commit Gate**: All merges squashed to single commits
5. **Validation Gate**: All operations validated before execution

### Validation Contracts
Every workflow step enforces strict contracts:
- **Pre-Flight Validation**: Verifies required conditions before any action
- **Constrained Actions**: Claude can only choose from validated options
- **Parameter Validation**: All generated content meets defined patterns
- **Post-Flight Validation**: Ensures expected outcomes and side effects
- **Automatic Rollback**: Failed validations trigger safe state recovery

### Visual Feedback Standards
All user interactions must provide clear visual feedback:
- Command banners with ASCII art indicate workflow initiation
- Colors and icons convey status at a glance
- Progress indicators show workflow advancement
- Structured output with tables and boxes for clarity
- Error messages include recovery instructions

### Hooks and Automation
Git hooks provide additional enforcement at the repository level:
- Hooks must be installable without external dependencies
- Hook failures must provide actionable error messages
- Hooks must not interfere with manual Git operations
- Hook configuration must be versioned with the repository
- Hook bypass requires explicit user acknowledgment

## Rights and Responsibilities

### User Rights
1. Right to abort any non-irreversible workflow
2. Right to manual override of AI suggestions
3. Right to session status visibility
4. Right to audit trail access
5. Right to data export and deletion

### System Responsibilities
1. Maintain data integrity across all operations
2. Preserve user work during error conditions
3. Provide clear error messages and recovery paths
4. Respect user configuration preferences
5. Ensure predictable and consistent behavior

## Governance

### Constitutional Authority
This Constitution supersedes all other practices and documentation. All
components including MCP server implementation, Claude Code integration,
tool specifications, and user documentation must align with these principles.

### Amendment Process
Constitutional amendments require:

1. **Proposal Documentation**
   - Problem statement and justification
   - Impact analysis on existing principles
   - Migration strategy for active systems
   - Backward compatibility assessment

2. **Review Period**
   - Technical review by maintainers (minimum 3 days)
   - Community feedback period (minimum 7 days)
   - Security and compliance review
   - Performance impact analysis

3. **Ratification Requirements**
   - Maintainer consensus (no blocking objections)
   - Implementation proof-of-concept
   - Migration tooling if breaking changes
   - Documentation updates completed

4. **Version Control**
   - Major version increment for breaking changes
   - Minor version for compatible additions
   - Patch version for clarifications only
   - Persistent changelog maintenance

### Compatibility Commitments
1. **Backward Compatibility**: Maintained for 2 major versions minimum
2. **Deprecation Notice**: 30 days minimum before feature removal
3. **Migration Support**: Tools provided for all breaking changes
4. **Session Continuity**: Existing sessions must complete on upgrades
5. **Data Preservation**: User data never lost during transitions

### Compliance and Audit
1. All state transitions must be logged with timestamps
2. User decisions must be recorded with context
3. Automated operations must include justification
4. Audit logs must be tamper-evident
5. Compliance reports must be generatable on demand

**Version**: 4.0.0 | **Ratified**: 2025-09-21 | **Last Amended**: 2025-09-21