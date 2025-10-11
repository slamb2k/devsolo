# Feature: MCP to Plugin Migration

## Feature Description

Migrate han-solo from its current MCP-based architecture to Claude Code's native plugin system using custom slash commands and specialized sub-agents. This migration will transform how han-solo integrates with Claude Code by:

1. **Converting MCP prompts to native slash commands** - Move from MCP prompt handlers to `.claude/commands/hansolo/*.md` files
2. **Creating specialized sub-agents** - Introduce `git-droid` and `docs-droid` for coordinated operations
3. **Simplifying MCP tools** - Reduce MCP tools to focused, single-purpose operations that report results
4. **Moving orchestration to slash commands** - Shift multi-step workflow coordination from MCP tools to slash commands

This migration provides a cleaner architecture, better integration with Claude Code, improved maintainability, and a more intuitive user experience.

## User Story

As a **han-solo user**
I want to **use native Claude Code slash commands for git workflows**
So that **I have a more integrated, discoverable, and maintainable experience with better error messages and clearer workflow orchestration**

## Problem Statement

The current MCP-based architecture has several limitations:

1. **Orchestration complexity** - MCP tools handle both execution AND orchestration, mixing concerns
2. **Elicitation logic in tools** - MCP tools return prompts to elicit missing information, creating circular dependencies
3. **Limited discoverability** - MCP prompts are less discoverable than native slash commands
4. **Maintenance burden** - MCP-specific code requires understanding of MCP protocol and prompt handling
5. **Testing difficulty** - Orchestration and execution are tightly coupled, making unit testing harder
6. **Poor separation of concerns** - Pre-flight checks, execution, and orchestration all happen in MCP tools

## Solution Statement

Adopt Claude Code's plugin architecture with:

1. **Native slash commands** (`.claude/commands/hansolo/`) - User interface and high-level orchestration
2. **Specialized sub-agents** (`git-droid`, `docs-droid`) - Git-aware coordination and smart features
3. **Focused MCP tools** - Single-purpose operations that report check results (not elicit or orchestrate)
4. **Clear separation** - Slash commands orchestrate, sub-agents coordinate, MCP tools execute

**Architecture Flow:**
```
User → Slash Command → Sub-Agent (git-droid) → MCP Tools → Git/GitHub
         ↓                ↓                      ↓
    Orchestration    Coordination           Execution
```

## Relevant Files

### Core MCP Server and Tools
- **`src/mcp/hansolo-mcp-server.ts`** - MCP server that registers tools and prompts. Will be simplified to remove prompt handlers and elicitation logic.
- **`src/mcp/tools/workflow-tool-base.ts`** - Base class for MCP tools with pre-flight/post-flight framework. Will be simplified to remove orchestration.
- **`src/mcp/tools/launch-tool.ts`** - Launch workflow tool. Will be simplified to focus on creating branch/session only.
- **`src/mcp/tools/ship-tool.ts`** - Ship workflow tool. Will be split into focused operations (push, create PR, merge, cleanup).
- **`src/mcp/tools/commit-tool.ts`** - Commit tool. Already focused, minimal changes needed.
- **`src/mcp/tools/init-tool.ts`** - Init tool. Will remain largely unchanged.
- **`src/mcp/tools/status-tool.ts`** - Status tool. Read-only, minimal changes.
- **`src/mcp/tools/sessions-tool.ts`** - Sessions tool. Read-only, minimal changes.
- **`src/mcp/tools/abort-tool.ts`** - Abort tool. Will be simplified.
- **`src/mcp/tools/swap-tool.ts`** - Swap tool. Will be simplified.
- **`src/mcp/tools/cleanup-tool.ts`** - Cleanup tool. Already focused, minimal changes.
- **`src/mcp/tools/hotfix-tool.ts`** - Hotfix tool. Will be simplified.

### Services (Core Logic)
- **`src/services/git-operations.ts`** - Git operations service. No changes needed (already focused).
- **`src/services/github-integration.ts`** - GitHub API integration. No changes needed.
- **`src/services/session-repository.ts`** - Session persistence. No changes needed.
- **`src/services/configuration-manager.ts`** - Configuration management. No changes needed.
- **`src/services/branch-naming.ts`** - Branch naming service. No changes needed.
- **`src/services/stash-manager.ts`** - Stash management. No changes needed.
- **`src/services/validation/pre-flight-check-service.ts`** - Pre-flight validation. Will be enhanced to return structured results.
- **`src/services/validation/post-flight-verification.ts`** - Post-flight validation. Will be enhanced to return structured results.

### Existing Slash Commands
- **`.hansolo/commands/prime.md`** - Codebase priming command. Will be migrated to `.claude/commands/hansolo/prime.md`.
- **`.hansolo/commands/doc.md`** - Documentation management command. Will be migrated to `.claude/commands/hansolo/doc.md` and enhanced with docs-droid.

### Documentation
- **`docs/dev/plans/mcp-to-plugin-migration.md`** - The comprehensive migration plan with all architectural decisions.
- **`docs/dev/system/pre-flight-checks.md`** - Pre-flight check specifications and patterns.
- **`CLAUDE.md`** - Project guidelines including han-solo workflow detection and documentation rules.
- **`README.md`** - Project overview and user-facing documentation. Will be updated to reflect new architecture.

### New Files

#### Slash Commands (`.claude/commands/hansolo/`)
- **`init.md`** - Initialize han-solo (migrated from MCP prompt)
- **`launch.md`** - Start feature workflow (migrated from MCP prompt)
- **`commit.md`** - Commit changes (migrated from MCP prompt)
- **`ship.md`** - Ship complete workflow (migrated from MCP prompt)
- **`status.md`** - Show workflow status (migrated from MCP prompt)
- **`sessions.md`** - List sessions (migrated from MCP prompt)
- **`swap.md`** - Switch sessions (migrated from MCP prompt)
- **`abort.md`** - Abort session (migrated from MCP prompt)
- **`cleanup.md`** - Cleanup sessions (migrated from MCP prompt)
- **`hotfix.md`** - Hotfix workflow (migrated from MCP prompt)
- **`status-line.md`** - Manage status line (migrated from MCP prompt)
- **`prime.md`** - Prime codebase understanding (migrated from `.hansolo/commands/`)
- **`doc.md`** - Documentation management (migrated from `.hansolo/commands/`)

#### Sub-Agent Definitions
- **`.claude/agents/git-droid.md`** - Git workflow coordination sub-agent definition
- **`.claude/agents/docs-droid.md`** - Documentation management sub-agent definition

#### Output Styles
- **`.claude/output-styles/git-droid.md`** - Custom output formatting for git-droid
- **`.claude/output-styles/docs-droid.md`** - Custom output formatting for docs-droid

## Implementation Plan

### Phase 1: Foundation (Slash Command Infrastructure)

**Goal:** Set up the slash command structure and migrate simplest commands first to validate the approach.

**Tasks:**
1. Create `.claude/commands/hansolo/` directory structure
2. Migrate `prime.md` command (read-only, no MCP dependencies)
3. Migrate `status.md` command (read-only, uses status-tool)
4. Migrate `sessions.md` command (read-only, uses sessions-tool)
5. Test migrated commands to ensure they work with Claude Code
6. Document slash command format and conventions

**Validation:** All read-only commands work and display correct information.

### Phase 2: Core Implementation (Sub-Agents and Tool Simplification)

**Goal:** Create git-droid and docs-droid, then migrate write operations.

**Sub-Phase 2A: git-droid Sub-Agent**
1. Define git-droid sub-agent in `.claude/agents/git-droid.md`
2. Create git-droid output style in `.claude/output-styles/git-droid.md`
3. Document git-droid capabilities and coordination patterns
4. Test git-droid with simple git operations

**Sub-Phase 2B: Simplify MCP Tools**
1. Refactor `workflow-tool-base.ts` to remove elicitation, keep validation reporting
2. Simplify `commit-tool.ts` - focus on staging and committing only
3. Split `ship-tool.ts` into focused operations:
   - Push to remote
   - Create/update PR
   - Wait for CI checks
   - Merge PR
   - Cleanup branches
4. Simplify `launch-tool.ts` - focus on branch creation only
5. Update all tools to return structured check results instead of prompts

**Sub-Phase 2C: Migrate Write Commands**
1. Migrate `commit.md` - handles commit message generation, calls commit-tool
2. Migrate `launch.md` - handles branch name generation, calls launch-tool via git-droid
3. Migrate `ship.md` - orchestrates full workflow, calls multiple tools via git-droid
4. Migrate `abort.md` - handles abort workflow
5. Migrate `swap.md` - handles session switching
6. Migrate `cleanup.md` - handles cleanup operations
7. Migrate `hotfix.md` - handles hotfix workflow

**Validation:** All write operations work correctly with proper orchestration.

### Phase 3: Integration (Documentation and Final Commands)

**Goal:** Complete the migration with docs-droid and finalize remaining commands.

**Sub-Phase 3A: docs-droid Sub-Agent**
1. Define docs-droid sub-agent in `.claude/agents/docs-droid.md`
2. Create docs-droid output style in `.claude/output-styles/docs-droid.md`
3. Migrate `doc.md` command to use docs-droid
4. Test documentation management workflows

**Sub-Phase 3B: Final Commands**
1. Migrate `init.md` command
2. Migrate `status-line.md` command
3. Remove deprecated `.hansolo/commands/` directory
4. Update MCP server to remove prompt handlers
5. Clean up unused elicitation code from MCP tools

**Sub-Phase 3C: Documentation Updates**
1. Update `README.md` with new slash command usage
2. Update `CLAUDE.md` han-solo section
3. Update all `docs/guides/*.md` files
4. Create migration guide for existing users
5. Archive old MCP prompt documentation

**Validation:** Full migration complete, all functionality works via slash commands.

## Step by Step Tasks

### Step 1: Create Slash Command Directory Structure
- Create `.claude/commands/hansolo/` directory
- Create `.claude/agents/` directory for sub-agent definitions
- Create `.claude/output-styles/` directory for custom formatting
- Verify directories are in correct locations per Claude Code plugin structure

### Step 2: Migrate Prime Command (Simple Read-Only)
- Copy `.hansolo/commands/prime.md` to `.claude/commands/hansolo/prime.md`
- Add proper front matter with description and arguments
- Test `/hansolo prime` command in Claude Code
- Verify it reads files and summarizes codebase correctly
- Document any differences in behavior

### Step 3: Migrate Status Command (Read-Only with MCP Tool)
- Create `.claude/commands/hansolo/status.md`
- Analyze current `status-tool.ts` behavior
- Write slash command that calls `hansolo_status` MCP tool
- Add proper argument specifications (none required)
- Test `/hansolo status` command
- Verify pre-flight checks display correctly

### Step 4: Migrate Sessions Command (Read-Only with MCP Tool)
- Create `.claude/commands/hansolo/sessions.md`
- Analyze current `sessions-tool.ts` behavior
- Write slash command that calls `hansolo_sessions` MCP tool
- Add argument specifications: `all`, `verbose`, `cleanup`
- Test `/hansolo sessions` command with various arguments
- Verify session listing displays correctly

### Step 5: Define git-droid Sub-Agent
- Read official Claude Code sub-agent documentation (if available)
- Create `.claude/agents/git-droid.md` with:
  - Purpose and responsibilities
  - Git workflow best practices knowledge
  - Safety guardrails and validation rules
  - Capabilities (branch management, commit operations, etc.)
  - Integration patterns with MCP tools
- Document git-droid's role in orchestration

### Step 6: Create git-droid Output Style
- Create `.claude/output-styles/git-droid.md` with:
  - Structured result format (pre-flight checks, steps, post-flight verifications)
  - Table format for lists (sessions, branches, commits)
  - Icon usage conventions (✓, ✗, ⚠, 🔍, 📋, ✅, 📊)
  - Example outputs for common operations
- Test output style with sample operations

### Step 7: Refactor workflow-tool-base.ts
- Remove `collectMissingParameters()` elicitation logic
- Keep `runPreFlightChecks()` and `runPostFlightVerifications()` but ensure they only report
- Simplify `execute()` method to focus on operation execution
- Update return types to always include structured check results
- Add tests for simplified base class

### Step 8: Simplify commit-tool.ts
- Remove commit message generation (moves to slash command)
- Focus on: stage files, create commit, update session state
- Report pre-flight results: session exists, has uncommitted changes
- Report post-flight results: commit created, session state updated
- Add tests for simplified commit tool

### Step 9: Split ship-tool.ts into Focused Operations
- Extract push operation to separate focused method
- Extract PR creation/update to separate focused method
- Extract CI waiting to separate focused method
- Extract merge operation to separate focused method
- Extract cleanup to separate focused method
- Keep orchestration logic for now (will move to slash command later)
- Update tests to cover individual operations

### Step 10: Simplify launch-tool.ts
- Remove branch name generation (moves to slash command)
- Focus on: create branch, create session, checkout branch
- Report pre-flight results: on main, clean directory, branch available
- Report post-flight results: branch created, session created
- Add tests for simplified launch tool

### Step 11: Migrate commit.md Slash Command
- Create `.claude/commands/hansolo/commit.md`
- Implement message generation logic:
  - Analyze git diff for changes
  - Generate conventional commit message (feat/fix/docs/refactor/etc)
  - Follow repository commit conventions
- Handle missing session → guide user to launch first
- Call `hansolo_commit` MCP tool with generated message
- Handle pre-flight check failures with actionable guidance
- Add argument specifications: `message` (optional), `stagedOnly` (optional)
- Test with various scenarios (staged files, all files, generated messages, custom messages)

### Step 12: Migrate launch.md Slash Command
- Create `.claude/commands/hansolo/launch.md`
- Implement branch name generation logic:
  - From description if provided
  - From git changes if present
  - Using conventional naming (feature/, fix/, docs/, etc)
  - Validate against branch naming rules
- Handle uncommitted changes → offer to stash
- Handle active session → offer to abort
- Call git-droid to coordinate launch workflow
- git-droid calls `hansolo_launch` MCP tool
- Handle pre-flight check failures with actionable guidance
- Add argument specifications: `description`, `branchName`, `auto`
- Test with various scenarios (clean state, uncommitted changes, existing session, branch name generation)

### Step 13: Migrate ship.md Slash Command
- Create `.claude/commands/hansolo/ship.md`
- Implement PR description generation logic:
  - Analyze commits since main
  - Review changed files and diff stats
  - Generate structured PR description (Summary, Changes, Testing)
  - Follow repository PR conventions
- Handle uncommitted changes → call `/hansolo commit` first (via SlashCommand tool)
- Handle no session → call `/hansolo launch` first (via SlashCommand tool)
- Call git-droid to orchestrate ship workflow:
  - git-droid calls `hansolo_commit` if needed
  - git-droid calls `hansolo_ship` for push/PR/merge
  - git-droid calls `hansolo_cleanup` for branches
  - git-droid aggregates all check results
- Handle pre-flight check failures with actionable guidance
- Add argument specifications: `prDescription`, `push`, `createPR`, `merge`, `stagedOnly`
- Test complete workflow end-to-end

### Step 14: Migrate abort.md Slash Command
- Create `.claude/commands/hansolo/abort.md`
- Implement abort workflow logic:
  - Detect uncommitted changes → offer to stash
  - Confirm destructive actions
  - Switch to main branch
  - Optionally delete feature branch
  - Mark session as aborted
- Call git-droid to coordinate abort operations
- Handle pre-flight check failures
- Add argument specifications: `branchName`, `deleteBranch`, `force`, `yes`
- Test abort scenarios (with/without changes, with/without branch deletion)

### Step 15: Migrate swap.md Slash Command
- Create `.claude/commands/hansolo/swap.md`
- Implement swap workflow logic:
  - Detect uncommitted changes → offer to stash
  - Validate target session exists
  - Switch to target branch
  - Activate target session
- Call git-droid to coordinate swap operations
- Handle pre-flight check failures
- Add argument specifications: `branchName`, `stash`, `force`
- Test swap scenarios (clean swap, with stash, between multiple sessions)

### Step 16: Migrate cleanup.md Slash Command
- Create `.claude/commands/hansolo/cleanup.md`
- Implement cleanup workflow logic:
  - Sync main branch first
  - Identify orphaned branches (branches without sessions)
  - Identify stale sessions (completed/aborted/expired)
  - Confirm deletions
  - Remove branches and sessions
- Call git-droid to coordinate cleanup operations
- Add argument specifications: `deleteBranches`, `force`
- Test cleanup scenarios (orphaned branches, stale sessions, complete cleanup)

### Step 17: Migrate hotfix.md Slash Command
- Create `.claude/commands/hansolo/hotfix.md`
- Implement hotfix workflow logic:
  - Similar to launch but with hotfix/ prefix
  - Higher urgency handling
  - Optional skip tests/review flags
  - Auto-merge when checks pass
- Call git-droid to coordinate hotfix workflow
- Add argument specifications: `issue`, `severity`, `skipTests`, `skipReview`, `autoMerge`
- Test hotfix scenarios (critical/high/medium severity)

### Step 18: Define docs-droid Sub-Agent
- Create `.claude/agents/docs-droid.md` with:
  - Purpose: documentation management and validation
  - Knowledge of documentation structure (docs/ folder hierarchy)
  - Naming conventions enforcement
  - Placement rules from docs/README.md
  - Relevance maintenance (archiving outdated docs)
  - README.md index generation
- Document docs-droid's role in documentation workflows

### Step 19: Create docs-droid Output Style
- Create `.claude/output-styles/docs-droid.md` with:
  - Analysis section (document type, audience, location)
  - Actions taken list (created, updated, validated, archived)
  - Summary section (file, location, size, status)
  - Consistent formatting with git-droid
- Test output style with sample documentation operations

### Step 20: Migrate doc.md Slash Command
- Copy `.hansolo/commands/doc.md` to `.claude/commands/hansolo/doc.md`
- Enhance AUDIT MODE to use docs-droid:
  - docs-droid scans all .md files
  - docs-droid validates naming and placement
  - docs-droid identifies superseded documents
  - docs-droid updates README.md files
  - docs-droid archives outdated docs
- Enhance CREATE MODE to use docs-droid:
  - docs-droid analyzes content for placement
  - docs-droid applies naming conventions
  - docs-droid creates document in correct location
  - docs-droid updates relevant README.md
- Test doc command in both modes

### Step 21: Migrate init.md Slash Command
- Create `.claude/commands/hansolo/init.md`
- Keep logic simple: call `hansolo_init` MCP tool
- Handle initialization scope (project/user)
- Handle force reinitialization
- Add argument specifications: `scope`, `force`
- Test init command

### Step 22: Migrate status-line.md Slash Command
- Create `.claude/commands/hansolo/status-line.md`
- Keep logic simple: call `hansolo_status_line` MCP tool
- Handle different actions (enable, disable, update, show)
- Handle format customization
- Add argument specifications: `action`, `format`, `showBranchInfo`, `showSessionInfo`, `showStateInfo`
- Test status-line command

### Step 23: Remove MCP Prompt Handlers
- Remove `setupPromptHandlers()` method from `src/mcp/hansolo-mcp-server.ts`
- Remove `ListPromptsRequestSchema` handler
- Remove `GetPromptRequestSchema` handler
- Remove prompt-related code from banner generation
- Remove `_via_prompt` parameter from all schemas
- Test MCP tools still work correctly via direct tool calls

### Step 24: Clean Up Elicitation Code
- Remove `collectMissingParameters()` from all tool classes
- Remove prompt collection result types
- Remove elicitation logic from `workflow-tool-base.ts`
- Update all MCP tool tests to remove elicitation scenarios
- Verify all tools report check results correctly

### Step 25: Remove Deprecated .hansolo/commands Directory
- Archive `.hansolo/commands/prime.md` (migrated to .claude/commands)
- Archive `.hansolo/commands/doc.md` (migrated to .claude/commands)
- Remove `.hansolo/commands/` directory
- Update any references to old command location
- Test that old commands no longer accessible

### Step 26: Update README.md
- Update "Quick Start" section to reference new slash commands
- Update "MCP Prompts (Slash Commands)" section header to "Slash Commands"
- Update command table to reflect new locations
- Remove references to MCP prompts
- Add section on sub-agents (git-droid, docs-droid)
- Update architecture diagram
- Test all examples in README

### Step 27: Update CLAUDE.md
- Update han-solo workflow detection section
- Update references to MCP tools and prompts
- Add section on slash commands and sub-agents
- Update any migration guidance
- Test guidance with actual workflows

### Step 28: Update docs/guides/*.md Files
- Update `docs/guides/quickstart.md` - new slash command usage
- Update `docs/guides/installation.md` - no changes to installation
- Update `docs/guides/usage.md` - all command examples
- Update `docs/guides/mcp-tools-reference.md` - tool simplifications
- Create `docs/guides/slash-commands-reference.md` - new comprehensive reference
- Create `docs/guides/sub-agents-reference.md` - git-droid and docs-droid reference

### Step 29: Create Migration Guide
- Create `docs/guides/migration-from-mcp-prompts.md`
- Document changes for existing users:
  - Old: `/hansolo:launch` → New: `/hansolo launch`
  - Command syntax differences
  - New orchestration patterns
  - Sub-agent behavior
- Provide migration timeline and deprecation notices
- Test migration guide with sample workflows

### Step 30: Archive Old Documentation
- Move `docs/dev/plans/phase3-pure-mcp-architecture.md` to `docs/archive/`
- Archive any MCP prompt documentation
- Update `docs/archive/README.md` with archived documents
- Ensure archive is properly indexed

### Step 31: Run Full Test Suite
- Run all unit tests: `npm test`
- Run integration tests: `npm run test:integration`
- Run MCP tests: `npm run test:mcp`
- Fix any failing tests
- Ensure 100% of previous functionality working

### Step 32: Validation - Test Complete Workflows End-to-End
- Test basic workflow: launch → make changes → commit → ship
- Test workflow with branch name generation
- Test workflow with PR description generation
- Test workflow with uncommitted changes handling
- Test workflow with session switching (swap)
- Test workflow with abort
- Test workflow with cleanup
- Test workflow with hotfix
- Test workflow with status/sessions queries
- Test workflow with documentation management
- Verify all pre-flight checks display correctly
- Verify all post-flight verifications display correctly
- Verify error messages are actionable

## Testing Strategy

### Unit Tests

**MCP Tools (Simplified)**
- Test `commit-tool.ts` - stage files, create commit, update session
- Test `launch-tool.ts` - create branch, create session
- Test simplified `ship-tool.ts` operations (push, PR, merge, cleanup)
- Test all tools return structured check results

**Services (No Changes)**
- Existing tests for git-operations, github-integration, session-repository
- Existing tests for configuration-manager, branch-naming, stash-manager
- Existing tests for validation services

**Slash Command Logic (New)**
- Test branch name generation logic (from description, from changes, from timestamp)
- Test commit message generation logic (conventional commits, from diff)
- Test PR description generation logic (from commits, from changes)
- Test orchestration logic (calling other slash commands, calling MCP tools)

### Integration Tests

**Slash Command → Sub-Agent → MCP Tool**
- Test `/hansolo launch` full flow (generate name → create branch → create session)
- Test `/hansolo commit` full flow (generate message → stage → commit)
- Test `/hansolo ship` full flow (generate PR description → push → PR → merge → cleanup)
- Test error handling at each layer (slash command errors, sub-agent coordination errors, MCP tool errors)

**Sub-Agent Coordination**
- Test git-droid coordinates multiple MCP tool calls
- Test git-droid aggregates pre-flight/post-flight results from multiple tools
- Test docs-droid manages documentation operations
- Test sub-agent error recovery and reporting

**Workflow State Machine**
- Test state transitions through complete workflows
- Test invalid state transitions are blocked
- Test session persistence across workflow steps

### Edge Cases

**Missing Parameters**
- Slash command with no branch name → generates from description or changes
- Slash command with no commit message → generates from diff
- Slash command with no PR description → generates from commits
- User cancels parameter generation → command exits gracefully

**Pre-Flight Check Failures**
- Not on main branch → error message guides user to fix
- Uncommitted changes → slash command offers to commit or stash
- Branch name already used → suggests alternative names
- No active session → slash command offers to launch
- GitHub authentication missing → error message guides user to authenticate

**Orchestration Failures**
- Commit fails during ship → stops workflow, reports error
- CI checks fail → reports which checks failed, provides logs
- PR merge fails → reports error, preserves branch for manual intervention
- Network errors → retries with exponential backoff, reports timeout

**Sub-Agent Edge Cases**
- git-droid called with invalid git state → reports clear error
- docs-droid called with malformed document → reports validation errors
- Sub-agent timeout → reports timeout, preserves state

**State Inconsistencies**
- Session exists but branch deleted → cleanup session, report inconsistency
- Branch exists but no session → offer to abort or adopt branch
- Multiple sessions for same branch → report error, offer cleanup

## Acceptance Criteria

**Functional Requirements**
- [ ] All 13 slash commands working with full feature parity to MCP prompts
- [ ] git-droid sub-agent coordinates git operations correctly
- [ ] docs-droid sub-agent manages documentation effectively
- [ ] All MCP tools simplified to single-purpose operations
- [ ] All MCP tools report structured check results
- [ ] No elicitation logic remaining in MCP tools
- [ ] No orchestration logic remaining in MCP tools
- [ ] Slash commands handle parameter generation (branch names, commit messages, PR descriptions)
- [ ] Slash commands orchestrate multi-step workflows correctly
- [ ] All pre-flight checks display with clear ✓/⚠/✗ indicators
- [ ] All post-flight verifications display with clear indicators
- [ ] Error messages are actionable and guide users to fixes

**User Experience**
- [ ] Slash commands are easily discoverable in `/` menu
- [ ] Command descriptions are clear and helpful
- [ ] Argument hints show up in command usage
- [ ] Generated branch names follow conventions
- [ ] Generated commit messages follow conventional commits
- [ ] Generated PR descriptions are comprehensive
- [ ] Output formatting is consistent and clear
- [ ] Progress is visible during long operations (CI wait)
- [ ] Errors are friendly and suggest fixes

**Technical Quality**
- [ ] Clean separation of concerns (slash commands, sub-agents, MCP tools)
- [ ] All services remain unchanged (git-operations, github-integration, etc)
- [ ] All validation services remain unchanged (pre-flight, post-flight)
- [ ] No redundant MCP prompt handling code
- [ ] No redundant elicitation code
- [ ] All tests passing (unit, integration, MCP)
- [ ] Test coverage maintained or improved
- [ ] Code is well-documented
- [ ] Architecture diagram updated

**Documentation**
- [ ] README.md updated with new slash command usage
- [ ] CLAUDE.md updated with new architecture
- [ ] All guides updated (quickstart, usage, installation)
- [ ] New slash commands reference created
- [ ] New sub-agents reference created
- [ ] Migration guide created for existing users
- [ ] Old MCP prompt docs archived
- [ ] Architecture documentation updated

**Migration Success**
- [ ] No breaking changes to user workflows (commands work the same)
- [ ] Performance maintained or improved
- [ ] All existing features preserved
- [ ] No data loss during migration
- [ ] Backward compatibility period provided (if applicable)
- [ ] Clear communication to users about changes

## Validation Commands

Execute every command to validate the feature works correctly with zero regressions.

**Build and Type Checks**
- `npm run build` - Build TypeScript, ensure no compilation errors
- `npm run lint` - Run ESLint, ensure code quality standards

**Unit Tests**
- `npm test` - Run all unit tests, ensure 100% passing
- `npm run test:watch` - Run tests in watch mode during development
- `npm run test:coverage` - Generate coverage report, ensure coverage maintained

**Integration Tests**
- `npm run test:integration` - Run integration tests, ensure 100% passing

**MCP Server Tests**
- `npm run test:mcp` - Run MCP server tests, ensure 100% passing

**End-to-End Workflow Tests (Manual)**
- Test basic workflow:
  1. `/hansolo init` - Initialize han-solo
  2. `/hansolo launch` (without branch name) - Test branch name generation
  3. Make code changes
  4. `/hansolo commit` (without message) - Test commit message generation
  5. `/hansolo ship` (without PR description) - Test PR description generation
  6. Verify PR created, merged, branches deleted, on main

- Test workflow with manual parameters:
  1. `/hansolo launch "Add feature X" "feature/test-branch"` - Explicit parameters
  2. Make changes
  3. `/hansolo commit "feat: add feature X"` - Explicit message
  4. `/hansolo ship "PR for feature X"` - Explicit PR description
  5. Verify workflow completes

- Test error scenarios:
  1. `/hansolo commit` on main - Should error
  2. `/hansolo ship` with uncommitted changes - Should commit first
  3. `/hansolo launch` with existing session - Should abort old session
  4. Verify all errors have actionable messages

- Test session management:
  1. `/hansolo launch "Feature A" "feature/a"`
  2. `/hansolo launch "Feature B" "feature/b"` - Creates second session
  3. `/hansolo sessions` - Lists both sessions
  4. `/hansolo swap "feature/a"` - Switches to first session
  5. `/hansolo status` - Shows current session
  6. `/hansolo abort` - Aborts current session
  7. Verify session state throughout

- Test documentation management:
  1. `/hansolo doc` - AUDIT MODE: scan and fix documentation
  2. `/hansolo doc "test-doc" "# Test\nTest content"` - CREATE MODE: create doc
  3. Verify document created in correct location with correct naming

- Test cleanup:
  1. `/hansolo cleanup` - Clean up stale sessions and branches
  2. Verify orphaned branches and sessions removed

**Validation Success Criteria**
- All commands execute without errors
- All tests pass (unit, integration, MCP)
- All workflows complete successfully
- Pre-flight checks display correctly
- Post-flight verifications display correctly
- Error messages are clear and actionable
- No regressions in functionality
- Performance is maintained or improved

## Notes

### Migration Timeline

**Phase 1 (Foundation)** - Estimated 2-3 days
- Low risk: read-only commands
- Can be tested incrementally
- No changes to MCP tools

**Phase 2 (Core Implementation)** - Estimated 5-7 days
- Higher complexity: sub-agents and tool refactoring
- Test thoroughly after each sub-phase
- Keep MCP tools functional during transition

**Phase 3 (Integration)** - Estimated 2-3 days
- Final polish and documentation
- Migration guide for users
- Archive old code

**Total Estimated Time:** 9-13 days

### Risk Mitigation

**Risk: Breaking existing workflows**
- Mitigation: Test extensively after each phase
- Mitigation: Keep MCP tools working during transition
- Mitigation: Provide clear migration guide

**Risk: Data loss during migration**
- Mitigation: No changes to session persistence
- Mitigation: No changes to configuration storage
- Mitigation: Backup .hansolo directory before migration

**Risk: Performance regression**
- Mitigation: Profile operations before and after
- Mitigation: Use same underlying services (no changes to git-operations, etc)
- Mitigation: Sub-agents add coordination but don't duplicate work

**Risk: Confusion for existing users**
- Mitigation: Document changes clearly
- Mitigation: Provide migration guide
- Mitigation: Keep command behavior identical (only implementation changes)

### Future Considerations

**Plugin Packaging**
- Consider packaging han-solo as a Claude Code plugin for distribution
- Investigate Claude Code plugin registry (if exists)
- Create installation script for plugin directory structure

**Additional Sub-Agents**
- `pr-droid` - Specialized PR review and management
- `test-droid` - Test execution and result analysis
- `deploy-droid` - Deployment coordination

**Enhanced Output Styles**
- Color-coded output (if supported by Claude Code)
- Progress bars for long operations
- Animated spinners during CI wait

**Configuration Options**
- Allow users to configure branch naming conventions
- Allow users to customize commit message templates
- Allow users to customize PR description templates

**Telemetry and Analytics**
- Track command usage patterns
- Track error rates and types
- Use insights to improve user experience

### Dependencies

**No New NPM Packages Required**
- All functionality uses existing dependencies
- MCP SDK remains (@modelcontextprotocol/sdk)
- Git operations remain (simple-git)
- GitHub API remains (@octokit/rest)

**Claude Code Version Requirements**
- Requires Claude Code version with slash command support
- Requires Claude Code version with sub-agent support
- Requires Claude Code version with custom output styles
- Document minimum Claude Code version in README

### Testing Notes

**Test Data Setup**
- Use test repositories for end-to-end testing
- Mock GitHub API for integration tests
- Use in-memory git operations for unit tests

**CI/CD Integration**
- Run tests in GitHub Actions
- Test against multiple Node.js versions
- Test against multiple git versions
- Test against multiple OS (Linux, macOS, Windows)

**Manual Testing Checklist**
- Test on clean repository
- Test on repository with existing sessions
- Test on repository with uncommitted changes
- Test with GitHub authentication
- Test without GitHub authentication
- Test with different branch naming patterns
- Test with different commit message styles
